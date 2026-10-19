#!/usr/bin/env python3
"""Extract text from the cookbook PDFs in docs/ into extracted/.

Output per book:
  extracted/<name>/page_0001.txt ...   one file per PDF page
  extracted/<name>.txt                 merged, pages separated by "\n\n=== PAGE N ===\n\n"

Methods:
  textlayer  - `pdftotext -layout` page by page (embedded text layer)
  tesseract  - rasterize with PyMuPDF and OCR with tesseract (subprocess)

Requirements: .venv with pymupdf (+ pillow), tesseract binary (brew install tesseract),
traineddata in .venv/tessdata (eng, frak2021 from UB Mannheim).

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
    method: str  # "textlayer" | "tesseract"
    lang: str = "eng"
    dpi: int = 300
    psm: int = 4
    split_spread: bool = False  # page = two facing book pages side by side
    crop_left: float = 0.0  # fraction of width to cut on the left (watermark margin)
    crop_bottom: float = 0.0
    drop_patterns: list[str] = field(default_factory=list)
    normalize_fraktur: bool = False
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


# ---------------------------------------------------------------- main

def process(book: Book, jobs: int) -> None:
    pdf = DOCS / book.pdf
    print(f"==> {book.name} ({book.method}) from {pdf.name}", flush=True)
    raw = textlayer_pages(pdf) if book.method == "textlayer" else ocr_pages(pdf, book, jobs)
    pages = [clean_text(t, book) for t in raw]

    page_dir = OUT / book.name
    if page_dir.exists():
        shutil.rmtree(page_dir)
    page_dir.mkdir(parents=True)
    for i, t in enumerate(pages, 1):
        (page_dir / f"page_{i:04d}.txt").write_text(t, encoding="utf-8")
    merged = "".join(f"\n\n=== PAGE {i} ===\n\n{t}" for i, t in enumerate(pages, 1))
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
