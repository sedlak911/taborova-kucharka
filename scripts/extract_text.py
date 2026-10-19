#!/usr/bin/env python3
"""Extract text from the cookbook PDFs in docs/ into extracted/.

Output per book:
  extracted/<name>/page_0001.txt ...   one file per PDF page
  extracted/<name>.txt                 merged, pages separated by "\n\n=== PAGE N ===\n\n"

Methods:
  textlayer  - `pdftotext -layout` page by page (embedded text layer)
  tesseract  - rasterize with PyMuPDF and OCR with tesseract (subprocess)
  html       - Project Gutenberg HTML; pages split at the printed page markers
               (`<span class="pagenum">[12]</span>`), so N in `=== PAGE N ===` is the printed page

Requirements: .venv with pymupdf (+ pillow), tesseract binary (brew install tesseract),
traineddata in .venv/tessdata (eng, ces, frak2021 from UB Mannheim).

Usage:  .venv/bin/python scripts/extract_text.py [book_name ...] [--jobs N]
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT = ROOT / "extracted"
TESSDATA = ROOT / ".venv" / "tessdata"
PDFTOTEXT = shutil.which("pdftotext") or "/opt/homebrew/bin/pdftotext"
TESSERACT = shutil.which("tesseract") or "/opt/homebrew/bin/tesseract"


@dataclass
class Book:
    name: str
    pdf: str
    method: str  # "textlayer" | "tesseract" | "html"
    lang: str = "eng"
    dpi: int = 300
    psm: int = 4
    split_spread: bool = False  # page = two facing book pages side by side
    crop_left: float = 0.0  # fraction of width to cut on the left (watermark margin)
    crop_bottom: float = 0.0
    drop_patterns: list[str] = field(default_factory=list)
    normalize_fraktur: bool = False
    normalize_long_s: bool = False  # 18th-century print: OCR reads long s as f ("publifhed")
    strip_leaders: bool = False
    vision_lang: str | None = None  # macOS Vision (ocrmac) fallback for pages tesseract leaves empty


HATHI_NOISE = [
    r"Generated on .*GMT",
    r"Public Domain, Google-digitized",
    r"hathitrust\.org",
    r"hdl\.handle\.net",
    r"Digitized by\s+Go+gle",
    r"Original from",
    r"UNIVERSITY OF MICHIGAN",
]

BOOKS = [
    Book("feldkochbuch-1940", "Feldkochbuch-1940.pdf", "tesseract",
         lang="frak2021", psm=3, split_spread=True, normalize_fraktur=True, vision_lang="de-DE"),
    Book("italian-cookbook-gentile", "italiancookbooka00gentiala.pdf", "textlayer"),
    Book("afrs-mco-p10110-42b", "MCO P10110.42B.pdf", "textlayer"),
    # The embedded text layer of the HathiTrust scan is badly clipped (only the right
    # part of each line survives), so the page images are re-OCRed instead.
    Book("us-navy-cookbook-1944", "TheCookBookOfTheUnitedStatesNavy1944.pdf", "tesseract",
         lang="eng", psm=4, crop_left=0.035, drop_patterns=HATHI_NOISE, strip_leaders=True,
         vision_lang="en-US"),
    # MKP e-book (Word -> PDF) of the 1868 edition: clean embedded text
    Book("rettigova-domaci-kucharka", "domaci_kucharka 1820.pdf", "textlayer"),
    # 1983 scan without a text layer; a few PDF pages are two-page spreads
    Book("army-baker-1945", "army baker 1945.pdf", "textlayer"),  # TM 10-410, ABBYY text layer
    Book("wells-bread-biscuit-baker-1890", "The Bread and Biscuit Baker's.html", "html"),
    Book("hauptmann-bread-cake-baking-1877", "bread-and-cake-baking/pg78839-images.html", "html"),
    # Internet Archive scan (Google), undated Wangford edition; poor text layer
    Book("glasse-art-of-cookery", "The_Art_of_Cookery_text.pdf", "textlayer", normalize_long_s=True),
    Book("receptury-teplych-pokrmu-1983", "Receptury teplých pokrmů.pdf", "tesseract",
         lang="ces", psm=4, split_spread=True),
]

# ---------------------------------------------------------------- cleanup helpers

_GARB_CHARS = set("ceosnatrlvfjiu.:-|,'·_[]—=")


def _is_leader_garbage(tok: str) -> bool:
    """Dotted-leader residue: '.......' or OCR mush like 'ceeeceeeseeeeee:Bcccc'."""
    if len(tok) < 5:
        return False
    if re.fullmatch(r"[.·…\-_—=]{3,}", tok):
        return True
    foreign = sum(ch not in _GARB_CHARS for ch in tok)
    if foreign > (len(tok) // 10 if len(tok) >= 10 else 0):
        return False
    dots = sum(ch in ".·-_:|" for ch in tok)
    ce = tok.count("c") + tok.count("e")
    return dots / len(tok) > 0.3 or (len(tok) >= 7 and ce / len(tok) >= 0.45)


def strip_leader_garbage(line: str) -> str:
    out = re.sub(r"\.{4,}", " ", line)  # leaders glued to words: 'Salt.......'
    out = re.sub(r"\S+", lambda m: "" if _is_leader_garbage(m.group(0)) else m.group(0), out)
    return out.rstrip()


_WORDS: set[str] | None = None


def _known(word: str) -> bool:
    global _WORDS
    if _WORDS is None:
        dict_path = Path("/usr/share/dict/words")
        _WORDS = {w.strip().lower() for w in dict_path.read_text().splitlines()} if dict_path.exists() else set()
    w = word.lower()
    if w in _WORDS:
        return True
    for suf, rep in (("ies", "y"), ("es", ""), ("s", ""), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"),
                     ("ly", ""), ("er", ""), ("est", ""), ("'d", ""), ("'d", "e")):
        if w.endswith(suf) and w[: -len(suf)] + rep in _WORDS:
            return True
    return False


def fix_long_s(text: str) -> str:
    """Replace OCR 'f' (long s) by 's' where the f-word is unknown and an s-variant is a word."""
    def repl(m: re.Match) -> str:
        w = m.group(0)
        if _known(w):
            return w
        idx = [i for i, c in enumerate(w) if c == "f"]
        for mask in range(1, 1 << min(len(idx), 4)):
            cand = list(w)
            for b, i in enumerate(idx[:4]):
                if mask >> b & 1:
                    cand[i] = "s"
            cand = "".join(cand)
            if _known(cand):
                return cand
        return w
    return re.sub(r"[A-Za-z']*f[A-Za-z']*", repl, text)


def clean_text(text: str, book: Book) -> str:
    drop = [re.compile(p, re.I) for p in book.drop_patterns]
    lines = []
    for line in text.splitlines():
        if any(p.search(line) for p in drop):
            continue
        if book.normalize_fraktur:
            line = line.replace("ſ", "s").replace("⸗", "-")
        if book.strip_leaders:
            line = strip_leader_garbage(line)
        if book.normalize_long_s:
            line = fix_long_s(line)
        lines.append(line.rstrip())
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)  # collapse runs of blank lines
    return text.strip("\n") + "\n"


# ---------------------------------------------------------------- extractors

def textlayer_pages(pdf: Path) -> list[str]:
    """Whole document with pdftotext -layout, split on form feeds (1 per page)."""
    res = subprocess.run([PDFTOTEXT, "-layout", "-enc", "UTF-8", str(pdf), "-"],
                         capture_output=True, check=True)
    pages = res.stdout.decode("utf-8", "replace").split("\f")
    n = pymupdf.open(pdf).page_count
    if pages and not pages[-1].strip() and len(pages) == n + 1:
        pages = pages[:-1]
    if len(pages) != n:  # fall back to strict per-page calls
        pages = [subprocess.run([PDFTOTEXT, "-layout", "-enc", "UTF-8", "-f", str(i), "-l", str(i),
                                 str(pdf), "-"], capture_output=True, check=True).stdout.decode("utf-8", "replace")
                 for i in range(1, n + 1)]
    return pages


def _tesseract(img_path: str, lang: str, psm: int) -> str:
    env = dict(os.environ, TESSDATA_PREFIX=str(TESSDATA), OMP_THREAD_LIMIT="1")
    res = subprocess.run([TESSERACT, img_path, "-", "-l", lang, "--psm", str(psm),
                          "-c", "preserve_interword_spaces=1"],
                         capture_output=True, env=env)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.decode(errors="replace"))
    return res.stdout.decode("utf-8", "replace")


def _word_score(text: str) -> int:
    """Rough count of plausible words (letters only, >= 3 chars, containing a vowel)."""
    return sum(1 for w in re.findall(r"[^\W\d_]{3,}", text) if re.search(r"[aeiouyäöü]", w, re.I))


def _osd_rotation(path: str) -> int:
    """Clockwise rotation (0/90/180/270) tesseract's OSD says the image needs."""
    env = dict(os.environ, TESSDATA_PREFIX=str(TESSDATA), OMP_THREAD_LIMIT="1")
    res = subprocess.run([TESSERACT, path, "-", "--psm", "0"], capture_output=True, env=env)
    m = re.search(r"Rotate:\s*(\d+)", res.stdout.decode(errors="replace"))
    return int(m.group(1)) if m else 0


def _retry_hard_page(path: str, text: str, book: Book, td: str, k: int) -> str:
    """Pages with almost no readable text: fix orientation via OSD (landscape tables)
    and try contrast-stretched / inverted variants (dark covers); keep the best result."""
    from PIL import Image, ImageOps

    img = Image.open(path)
    variants = {}
    rot = _osd_rotation(path)
    if rot:
        img = img.rotate(-rot, expand=True)  # PIL rotates counter-clockwise
        variants[f"rot{rot}"] = img
    variants["autocontrast"] = ImageOps.autocontrast(img, cutoff=2)
    variants["inverted"] = ImageOps.invert(ImageOps.autocontrast(img, cutoff=2))
    best, best_score = text, _word_score(text)
    for name, im in variants.items():
        vp = os.path.join(td, f"p{k}_{name}.png")
        im.save(vp)
        t = _tesseract(vp, book.lang, book.psm).strip("\n")
        sc = _word_score(t)
        if sc > best_score * 1.5 + 3:
            best, best_score = t, sc
    return best


def ocr_page(args: tuple[str, int, Book]) -> tuple[int, str]:
    pdf, idx, book = args
    doc = pymupdf.open(pdf)
    page = doc[idx]
    r = page.rect
    clip = pymupdf.Rect(r.x0 + r.width * book.crop_left, r.y0,
                        r.x1, r.y1 - r.height * book.crop_bottom)
    if book.split_spread and r.width > r.height:
        mid = (clip.x0 + clip.x1) / 2
        regions = [pymupdf.Rect(clip.x0, clip.y0, mid, clip.y1), pymupdf.Rect(mid, clip.y0, clip.x1, clip.y1)]
    else:
        regions = [clip]
    parts = []
    with tempfile.TemporaryDirectory() as td:
        for k, reg in enumerate(regions):
            pix = page.get_pixmap(dpi=book.dpi, clip=reg, colorspace=pymupdf.csGRAY)
            p = os.path.join(td, f"p{k}.png")
            pix.save(p)
            text = _tesseract(p, book.lang, book.psm).strip("\n")
            if _word_score(text) < 25:
                text = _retry_hard_page(p, text, book, td, k)
            parts.append(text)
    if len(parts) == 1:
        text = parts[0]
    else:  # facing pages: left half, marker, right half (marker only if both have text)
        text = "\n\n--- [right half of spread] ---\n\n".join(p for p in parts if p.strip())
    if book.vision_lang and _word_score(text) == 0:
        text = _vision_ocr(page, clip, book)
    return idx, text


def _vision_ocr(page: pymupdf.Page, clip: pymupdf.Rect, book: Book) -> str:
    """macOS Vision framework via ocrmac (colour image, one line per observation)."""
    try:
        import io

        from ocrmac import ocrmac
        from PIL import Image
    except ImportError:
        return ""
    img = Image.open(io.BytesIO(page.get_pixmap(dpi=book.dpi, clip=clip).tobytes("png")))
    res = ocrmac.OCR(img, language_preference=[book.vision_lang], recognition_level="accurate").recognize()
    # results are (text, confidence, bbox[x, y, w, h] with origin bottom-left) -> sort top-down, left-right
    res.sort(key=lambda r: (-round(r[2][1] + r[2][3], 2), r[2][0]))
    return "[OCR: macOS Vision fallback]\n" + "\n".join(r[0] for r in res)


def ocr_pages(pdf: Path, book: Book, jobs: int) -> list[str]:
    n = pymupdf.open(pdf).page_count
    out = [""] * n
    with ProcessPoolExecutor(max_workers=jobs) as ex:
        for done, (idx, text) in enumerate(ex.map(ocr_page, [(str(pdf), i, book) for i in range(n)]), 1):
            out[idx] = text
            if done % 25 == 0 or done == n:
                print(f"  [{book.name}] OCR {done}/{n}", flush=True)
    return out


def html_pages(path: Path) -> tuple[list[str], list[str]]:
    """(labels, texts): text before the first page marker is dropped (Gutenberg header)."""
    import html as htmlmod

    src = path.read_text(encoding="utf-8")
    src = re.sub(r"<(script|style)\b.*?</\1>", "", src, flags=re.S | re.I)
    src = src.split("*** END OF THE PROJECT GUTENBERG", 1)[0]
    # two Gutenberg styles: <span class="pagenum"><a id="Page_12">[12]</a></span>
    # and <span class="pagenum" id="Page_12">[Pg 12]</span>
    marks = list(re.finditer(r'<span class="pagenum"(?: id="Page_([^"]+)")?>(?:<a id="Page_([^"]+)">)?[^<]*(?:</a>)?</span>', src))
    labels, texts = [], []
    for m, nxt in zip(marks, marks[1:] + [None]):
        label = m.group(1) or m.group(2)
        chunk = src[m.end():nxt.start() if nxt else len(src)]
        chunk = re.sub(r"<br\s*/?>|</(p|div|h\d|tr|li)>", "\n", chunk, flags=re.I)
        chunk = re.sub(r"</t[dh]>", "  ", chunk, flags=re.I)
        text = htmlmod.unescape(re.sub(r"<[^>]+>", "", chunk))
        text = "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in text.splitlines())
        labels.append(label)
        texts.append(re.sub(r"\n{3,}", "\n\n", text).strip())
    return labels, texts


# ---------------------------------------------------------------- main

def process(book: Book, jobs: int) -> None:
    pdf = DOCS / book.pdf
    print(f"==> {book.name} ({book.method}) from {pdf.name}", flush=True)
    if book.method == "html":
        labels, raw = html_pages(pdf)
    else:
        raw = textlayer_pages(pdf) if book.method == "textlayer" else ocr_pages(pdf, book, jobs)
        labels = [str(i) for i in range(1, len(raw) + 1)]
    pages = [clean_text(t, book) for t in raw]

    page_dir = OUT / book.name
    if page_dir.exists():
        shutil.rmtree(page_dir)
    page_dir.mkdir(parents=True)
    for label, t in zip(labels, pages):
        name = f"page_{int(label):04d}" if label.isdigit() else f"page_{label}"
        (page_dir / f"{name}.txt").write_text(t, encoding="utf-8")
    merged = "".join(f"\n\n=== PAGE {label} ===\n\n{t}" for label, t in zip(labels, pages))
    (OUT / f"{book.name}.txt").write_text(merged.lstrip("\n"), encoding="utf-8")
    empty = sum(1 for t in pages if not t.strip())
    print(f"    {len(pages)} pages, {sum(len(t) for t in pages):,} chars, {empty} empty pages", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("books", nargs="*", help="subset of book names: " + ", ".join(b.name for b in BOOKS))
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    a = ap.parse_args()
    selected = [b for b in BOOKS if not a.books or b.name in a.books]
    if not selected:
        ap.error("unknown book name")
    OUT.mkdir(exist_ok=True)
    for b in selected:
        process(b, a.jobs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
