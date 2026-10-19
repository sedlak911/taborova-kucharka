# Fáze 3: Dávková digitalizace 75 receptů – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doplnit do `data/recipes/` 75 receptů ze `data/recipes/SHORTLIST.md` (8 dávek), každý platný podle `RecipeSchema`, na 4 porce, česky, s ověřenými čísly, a doplnit chybějící suroviny do katalogu.

**Architecture:** Obsahová fáze bez změn aplikačního kódu. Každý recept je samostatný soubor `data/recipes/<id>.json`, vzniká skillem `.claude/skills/recipe-digitize/SKILL.md`. Chybějící suroviny agent zapíše do `data/ingredients/new-<recipe-id>.json` (nikdy do `cz.json`), `npm run build:ingredients` je sloučí do `data/ingredients.json`. Kontrolní brána každé dávky: `npm run validate` bez `CHYBA`, ověření čísel ne-AFRS receptů proti obrázku stránky PDF, review dávky. Na konci fáze se `new-*.json` konsolidují do `data/ingredients/cz.json`.

**Tech Stack:** skill `recipe-digitize` (+ `reference/units.md`, `reference/afrs-card.md`, `reference/example-recipe.json`), `npm run usda -- <text>` (`scripts/usda-lookup.ts`), `npm run validate`, `npm run build:ingredients`, `pdftoppm` (poppler) pro obrázky stránek, texty v `extracted/*.txt`.

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` (§2 obsah, §3 přepočty, §5 data). Shortlist: `data/recipes/SHORTLIST.md`.

## Global Constraints

- Recept vždy `baseServings: 4`; `originalYield` = porce zdroje (AFRS 100, Navy 100, Feldkochbuch „je Kopf“ = 1, Gentile obvykle bez – vynechat).
- Jednotky jen `g`, `ml`, `ks`, `lzice`, `lzicka`, `hrnek`, `spetka`; `spetka` jen když zdroj říká „pinch“/„to taste“; množství < 1 g uložit přesně v g.
- Škálovací třídy a exponenty: `linear` 1,0; `seasoning` 0,85; `aromatic` 0,92; `leavening` 0,80; `fat` 0,90; `vessel` 0,60. `vessel` na řádku jen pro slévanou vodu, tuk na smažení a sůl do slévané vody. Voda vstřebaná do jídla je `linear`. Slévaná voda = domácí hodnota 1 l / 100 g těstovin, u brambor „zalít ~1 l na 1 kg“.
- Tuk a cukr v pečení (těsta) škálují `linear` (override na řádku, pokud surovina je `fat`).
- `source.page` = číslo stránky PDF (`=== PAGE N ===`); Navy: file = tištěná + 8; Gentile: file = tištěná + 4.
- `verified: true` jen u AFRS (digitální text) nebo po ověření všech čísel proti obrázku stránky. Navy/Feldkochbuch/Gentile bez ověření = `false`.
- Modernizace: AFRS COOKING SPRAY vynechat; sušené mléko + voda → `mleko`; konzervy nahradit čerstvými surovinami tam, kde SHORTLIST poznámka říká; originální surovinu zachovat v `original` řádku.
- `allergens` = sjednocení alergenů použitých surovin (validátor hlídá jako chybu). `bez-masa` nesmí být u receptu s masem ani masovým vývarem (`containsMeat`).
- Tagy, kapitoly, vybavení jen z pevných sad; `chapter` a `tags` podle SHORTLIST (odchylku zdůvodnit v reportu).
- Agenti **needitují** `data/ingredients/cz.json`, `a.json`, `b.json` ani generovaný `data/ingredients.json`; nové suroviny jen do `data/ingredients/new-<recipe-id>.json` (tvar = položka katalogu; makra z `npm run usda -- <anglický název>`, zdroj do `sources`).
- Agenti **necommitují**; commit po dávce dělá kontrolor s explicitním `git add` (nikdy `git add -A`).
- Každý agent má vlastní podsložku scratchpadu `<scratchpad>/phase3/<recipe-id>/` pro obrázky stránek (`pdftoppm ... <scratchpad>/phase3/<id>/page`).
- Čeština s diakritikou v názvech, krocích, poznámkách; identifikátory anglicky/kebab-case bez diakritiky.

## Review Focus

1. Číslo z OCR Navy/Feldkochbuch (zlomek „1 1/4 gal“ čtený jako „114“) by dalo nesmyslné množství – kontrola porcí (maso 120–200 g, polévka 300–400 ml, sůl 1–2 g na porci) v každém reviewu dávky a ověření obrázkem u všech ne-AFRS receptů.
2. Recept ze SHORTLIST, jehož zdroj má jinou variantu kódu (např. L 088 05 místo L 088 02, P 015 00 místo 01) – reviewer kontroluje `source.code` a `source.page` proti SHORTLIST a grepem v `extracted/`.
3. Masový vývar v receptu označeném `bez-masa` – validátor hlídá přes `containsMeat`; reviewer u kapitoly `bezmasa` ověří, že kapitola i tag sedí.
4. Duplicitní surovina pod novým id (`new-*.json` zavádí „cibule-zluta“, ačkoli katalog má `cibule`) – validátor merge hlásí kolizi aliasů; reviewer navíc projde každý `new-*.json` proti `grep '"id"' data/ingredients.json`.
5. Kcal na porci mimo rozumný rozsah (polévka > 600, dezert < 150) jako příznak chyby převodu – validátor varuje mimo 50–1500; reviewer porovná s kcal v hlavičce karty AFRS (odchylka do ~25 %).

---

## Role a modely

| Role | Model | Vstup | Výstup |
|---|---|---|---|
| Digitizér AFRS (1 recept) | Haiku | řádek SHORTLIST, skill, `extracted/afrs-mco-p10110-42b.txt` | `data/recipes/<id>.json`, případně `data/ingredients/new-<id>.json`, report `<ws>/batchN/<id>-report.md` |
| Digitizér Navy/Gentile/Feldkochbuch (1 recept) | Sonnet | totéž + obrázek stránky (`pdftoppm`) | totéž, `verified` podle skutečně provedené kontroly obrázku |
| Ověřovatel čísel ne-AFRS | Opus | hotový JSON + obrázek stránky | report `<ws>/batchN/<id>-verify.md`, úprava čísel v JSON, `verified: true` |
| Reviewer dávky | Sonnet | review package dávky, SHORTLIST, reporty | verdikt spec ✅/❌ + kvalita, seznam nálezů |
| Fix dávky | tentýž digitizér (round ≤ 3) / Sonnet | nálezy | opravené soubory |

Digitizéři jedné dávky běží **paralelně** (každý zapisuje jen svůj `<id>.json` a svůj `new-<id>.json`; souběžný `npm run build:ingredients` je idempotentní – po doběhnutí všech ho kontrolor spustí znovu). Dávky jdou sériově.

## Dispatch brief digitizéra (šablona, stejná pro všechny tasky 1–8)

```
Projekt: online kuchařka (React/TS), fáze 3 = přepis receptů z historických kuchařek do JSON.
Tvůj úkol: JEDEN recept. Řádek ze SHORTLIST: <vložit celý řádek tabulky>.
1. Přečti `.claude/skills/recipe-digitize/SKILL.md` celý a reference, které potřebuješ (`reference/units.md`, u AFRS `reference/afrs-card.md`, vzor `reference/example-recipe.json`).
2. Najdi recept: `grep -n "<TITLE ORIGINAL>" extracted/<kniha>.txt`; stránka `=== PAGE <N> ===`.
   <ne-AFRS:> Vyrenderuj stránku: `pdftoppm -f N -l N -r 150 -png "docs/<pdf>" <scratchpad>/phase3/<id>/page` a čísla ber z obrázku (Read), ne z OCR.
3. Každé `ingredientId` ověř: `grep '"id": "' data/ingredients.json | grep -i <slovo>`. Chybí-li, zapiš položku do `data/ingredients/new-<id>.json` (pole jako v katalogu, makra `npm run usda -- "<anglicky>"`, `sources` s fdcId), pak `npm run build:ingredients`.
4. Ulož `data/recipes/<id>.json`, spusť `npm run validate`; 0 CHYBA. Varování posuď.
5. NEcommituj. NEedituj cz.json/a.json/b.json/ingredients.json. Nespouštěj subagenty.
6. Report do `<ws>/batchN/<id>-report.md`: status DONE / DONE_WITH_CONCERNS / BLOCKED, zdrojová stránka, původní výtěžek, tabulka surovin (originál → g/ml → 4 porce), kcal na porci (vypočtené vs. zdroj), nové suroviny, odchylky od SHORTLIST (kapitola/tagy), nejistoty.
Vrať jen: status, cestu k JSON, kcal/porci, 1 řádek concerns.
```

## Postup dávky (platí pro Task 1–8)

- [ ] **Krok 1:** Zapiš BASE = `git rev-parse HEAD` do ledgeru. Vytvoř `<ws>/batchN/`.
- [ ] **Krok 2:** Pro každý recept dávky dispatchni digitizéra (Haiku pro `afrs-2003`, Sonnet pro ostatní) s briefem výše. Všechny paralelně v jedné zprávě.
- [ ] **Krok 3:** Po doběhnutí: `npm run build:ingredients && npm run validate`. Každou `CHYBA` vrať příslušnému digitizérovi (SendMessage, round 1–3).
- [ ] **Krok 4:** Pro recepty mimo AFRS dispatchni Opus ověřovatele (jeden agent na dávku; dostane seznam `<id>` + PDF strany; ověří každé číslo proti obrázku, opraví JSON, nastaví `verified`, report `<ws>/batchN/verify.md`).
- [ ] **Krok 5:** Commit dávky: `git add data/recipes/<id1>.json … data/ingredients/new-*.json data/ingredients.json` a `git commit -m "data(recipes): dávka N – <stručně>"`.
- [ ] **Krok 6:** `bash <SDD>/scripts/review-package <plan> BASE HEAD`; dispatch Sonnet reviewera dávky s balíčkem, cestou k SHORTLIST, reporty a Review Focus. Reviewer kontroluje: kódy/strany, realističnost porcí, kcal vs. zdroj, alergeny, tagy/kapitola, nové suroviny proti katalogu (duplicity), češtinu kroků, `verified`.
- [ ] **Krok 7:** Nálezy → fix round (digitizér receptu, nebo Sonnet pro průřezové opravy) → commit `fix(recipes): dávka N – …` → scoped re-review. Zbytky adjudikovat, zapsat do ledgeru `Task N: complete`.

---

### Task 1: Dávka 1 (recepty 1–10)

**Files:** Create `data/recipes/{kureci-nudlova-polevka,kroupova-polevka-s-masem,zapekany-hash-z-hovezi,parky-na-ohni,brokolice-se-syrem-a-ryzi,bramborovy-salat,testoviny-s-brokolici-a-rajcaty,michana-vejce,ovesne-susenky,cerny-caj}.json`; případně `data/ingredients/new-<id>.json`; Modify (generovaně) `data/ingredients.json`.

Ne-AFRS: `kroupova-polevka-s-masem` (feldkochbuch, PDF 18), `zapekany-hash-z-hovezi` (navy, PDF 129) → Sonnet digitizér + Opus ověření.

Zvláštní pokyny do briefů:
- `parky-na-ohni`: zdroj L 088 02 (gril); do `modernNote` varianta v hrnci (L 088 05) jen jako text, bez druhé sady surovin.
- `bramborovy-salat`: zdroj M 040 00; v `modernNote` zmínit octovou variantu M 040 02 pro výlet.
- `michana-vejce`: mražená vejce → `vejce` v ks (1 vejce = 50 g; použij `units.ks` z katalogu).
- `cerny-caj`: nápoj, `equipment: ["plotna"]`, `timeMinutes` ≤ 10.

Postup dávky (Kroky 1–7 výše). Commit zpráva: `data(recipes): dávka 1 – polévky, párky, brokolice, salát, těstoviny, vejce, sušenky, čaj`.

### Task 2: Dávka 2 (recepty 11–20)

**Files:** Create `data/recipes/{hrachova-polevka-se-sunkou,chuck-wagon-gulas-s-fazolemi,polenta-s-klobasami,jatra-dusena-s-cibuli,smazene-fazole-se-syrem,glazovana-mrkev,zapekane-makarony-se-syrem-a-rajcaty,irsky-sodovy-chleb,brownies,ovocny-punc}.json`.

Ne-AFRS: `polenta-s-klobasami` (italian, PDF 117), `jatra-dusena-s-cibuli` (navy, PDF 162), `zapekane-makarony-se-syrem-a-rajcaty` (navy, PDF 36), `ovocny-punc` (navy, PDF 30).

Zvláštní pokyny:
- `hrachova-polevka-se-sunkou`: šunkový hock → `original` řádek, modernizace uzené koleno (ověř id v katalogu, jinak `new-`).
- `chuck-wagon-gulas-s-fazolemi`: pečené fazole z konzervy → vařené fazole (`original` konzerva).
- `smazene-fazole-se-syrem`: varianta Q 038 00 (suché fazole).
- `brownies`: H 002 00, ne z mixu; tuk a cukr `scaling: linear`.
- `ovocny-punc`: kompoty → sirup; `modernNote` vysvětlí.
- `polenta-s-klobasami`: Gentile bez porcí → `originalYield` vynechat, `verified: false`, odhad zdůvodnit.

Commit: `data(recipes): dávka 2 – hrachovka, kovbojský guláš, polenta, játra, fazole, mrkev, makarony, sodový chléb, brownies, punč`.

### Task 3: Dávka 3 (recepty 21–30)

**Files:** Create `data/recipes/{bramborova-polevka-smetanova,chilli-con-carne,brambory-s-kysanym-zelim,rybi-sekana-z-konzervy,plnene-papriky-bez-masa,ratatouille,spagety-s-maslem-a-syrem,kolace,pernikovy-kolac,citronovy-sirup}.json`.

Ne-AFRS: `brambory-s-kysanym-zelim` (feldkochbuch, PDF 16), `rybi-sekana-z-konzervy` (navy, PDF 92), `spagety-s-maslem-a-syrem` (italian, PDF 21), `citronovy-sirup` (italian, PDF 152).

Zvláštní pokyny:
- `bramborova-polevka-smetanova`: varianta P 015 01 (čerstvé brambory); `bez-masa` jen při vodě/zeleninovém vývaru – pokud zdroj používá kuřecí vývar, zachovat ho v `original` a modernizovat na zeleninový vývar s poznámkou.
- `chilli-con-carne`: ostrost – chilli ponechat ve zdrojovém množství, v `modernNote` „pro děti polovinu“.
- `pernikovy-kolac`: melasa → med (`original` melasa, pokud `melasa` v katalogu chybí → `new-`).
- `spagety-s-maslem-a-syrem`: slévaná voda 1 l / 100 g těstovin, `scaling: vessel`.
- `kolace`: kynuté těsto; droždí `leavening`; tuk a cukr v těstě `linear`.

Commit: `data(recipes): dávka 3 – bramboračka, chilli, brambory se zelím, rybí sekaná, papriky, ratatouille, špagety, koláče, perník, sirup`.

### Task 4: Dávka 4 (recepty 31–39)

**Files:** Create `data/recipes/{fazolova-polevka-s-uzenym,texaska-pomaka-s-masem-a-ryzi,sekana-pecena,kure-na-lovecky-zpusob,vareke-fazole-s-cibuli,zapekane-brambory,nudle-s-kysanym-zelim,bisquity-s-prasku-do-peceni,jablecny-kolac}.json`.

Ruling k id: SHORTLIST obsahuje překlepy `texaska-pomaka-s-masem-a-ryzi`, `vareke-fazole-s-cibuli`, `bisquity-s-prasku-do-peceni`. Použij opravená id **`texaska-panev-s-masem-a-ryzi`**, **`varene-fazole`**, **`maslove-housky-biscuits`** a kontrolor opraví SHORTLIST ve stejném commitu.

Ne-AFRS: `kure-na-lovecky-zpusob` (italian, PDF 34), `nudle-s-kysanym-zelim` (feldkochbuch, PDF 20).

Zvláštní pokyny:
- `texaska-panev-s-masem-a-ryzi`: postup v troubě → pokud zdroj peče, ponechat `trouba` v `equipment`, v `modernNote` varianta na plotně.
- `sekana-pecena`: L 035 00; `equipment: ["trouba"]`.
- `varene-fazole`: Q 005 02; namáčení přes noc → `pripravit-predem`, `timeMinutes` bez namáčení.
- `maslove-housky-biscuits`: D 001 00; prášek do pečení `leavening`.

Commit: `data(recipes): dávka 4 – fazolová polévka, texaská pánev, sekaná, kuře cacciatora, vařené fazole, zapékané brambory, nudle se zelím, housky, jablečný koláč`.

### Task 5: Dávka 5 (recepty 40–48)

**Files:** Create `data/recipes/{rajcatova-polevka-s-ryzi,italska-ryze-s-mletym-masem,holubky-plnene-zeli,baccala-susena-treska,bramborova-kase,pecene-fazole-boston,americke-palacinky,kukuricny-chleb,chlebovy-pudink}.json`.

Ne-AFRS: `baccala-susena-treska` (italian, PDF 94), `pecene-fazole-boston` (navy, PDF 259), `kukuricny-chleb` (navy, PDF 353), `chlebovy-pudink` (navy, PDF 54).

Zvláštní pokyny:
- `baccala-susena-treska`: solená treska – pokud v katalogu chybí, `new-baccala-susena-treska.json` (USDA „Fish, cod, Atlantic, dried and salted“); namáčení → `pripravit-predem`.
- `pecene-fazole-boston`: melasa → cukr/med (`original` melasa); dlouhé pečení ponechat.
- `kukuricny-chleb`, `chlebovy-pudink`: 100 porcí → k = 0,04; čísla jen z obrázku.
- `rajcatova-polevka-s-ryzi`: P 006 01; ověř cukr proti kyselosti v Notes.

Commit: `data(recipes): dávka 5 – rajčatová polévka, italská rýže, holubky, baccalà, kaše, bostonské fazole, palačinky, kukuřičný chléb, chlebový nákyp`.

### Task 6: Dávka 6 (recepty 49–57)

**Files:** Create `data/recipes/{zeleninova-polevka,klobasa-s-fazolemi-a-zelim,pecene-kure-v-troube,zeleninove-kari-s-ryzi,dusene-zeli-s-mrkvi,spagety-s-masovou-omackou,francouzske-topinky,pecena-jablka,merunkovy-dzem}.json`.

Ne-AFRS: `merunkovy-dzem` (italian, PDF 155).

Zvláštní pokyny:
- `zeleninova-polevka`: konzervovaná zelenina → čerstvá (`original` konzervy); `bez-masa` jen bez masového vývaru.
- `klobasa-s-fazolemi-a-zelim`: kadeřávek → zelí, krůtí klobása → klobása (`original` zachovat).
- `pecene-kure-v-troube`: L 143 00 základní varianta.
- `spagety-s-masovou-omackou`: L 038 01; slévaná voda vessel.
- `pecena-jablka`: `equipment: ["trouba"]`, tag `tabor` (alobal na ohni) + `modernNote`.

Commit: `data(recipes): dávka 6 – zeleninová polévka, klobása s fazolemi, pečené kuře, kari, zelí, špagety, topinky, pečená jablka, džem`.

### Task 7: Dávka 7 (recepty 58–66)

**Files:** Create `data/recipes/{skotska-polevka-s-kroupami,hovezi-dusene-s-bramborami-a-mrkvi,pecena-ryba,bramborova-frittata,cervene-zeli-sladkokysele,makarony-se-syrem-creole,ovesna-kase,ryzovy-pudink,kakao}.json`.

Ne-AFRS: `skotska-polevka-s-kroupami` (navy, PDF 226).

Zvláštní pokyny:
- `skotska-polevka-s-kroupami`: jehněčí → `original`, modernizace hovězí přední.
- `hovezi-dusene-s-bramborami-a-mrkvi`: L 022 00 (ne 01/02); dobu dušení neměnit.
- `pecena-ryba`: L 119 00; ryba `treska` nebo jiný dostupný druh z katalogu, původní druh v `original`.
- `makarony-se-syrem-creole`: id podle SHORTLIST ponechat (`makarony-se-syrem-creole`), název „Makarony s mletým masem a rajčaty (Creole)“.

Commit: `data(recipes): dávka 7 – skotská polévka, dušené hovězí, pečená ryba, frittata, červené zelí, creole makarony, ovesná kaše, rýžový nákyp, kakao`.

### Task 8: Dávka 8 (recepty 67–75)

**Files:** Create `data/recipes/{chlebova-polevka-panata,kureci-dusene-s-zeleninou,hamburgerove-placky,grilovany-toast-se-syrem,okurkovy-salat-s-cibuli,spanelska-ryze,krupicova-kase,ovocny-crisp,limonada}.json`.

Ne-AFRS: `chlebova-polevka-panata` (italian, PDF 11), `kureci-dusene-s-zeleninou` (navy, PDF 174).

Zvláštní pokyny:
- `chlebova-polevka-panata`: bez gramáží → odhad (starý chléb ~60 g na porci, vývar 300 ml na porci), `verified: false`, `modernNote` vysvětlí; `bez-masa` jen se zeleninovým vývarem.
- `hamburgerove-placky`: L 037 02; `equipment: ["plotna"]`, tag `tabor`.
- `spanelska-ryze`: E 009 00; krok v troubě → plotna s poklicí, `modernNote`.
- `ovocny-crisp`: J 008 00; broskve → jablka (`original` broskve konzerva).
- `limonada`: C 008 00; bez vaření, `timeMinutes` 10.

Commit: `data(recipes): dávka 8 – panata, kuřecí dušené, hamburgery, toast se sýrem, okurkový salát, španělská rýže, krupice, crisp, limonáda`.

### Task 9: Konsolidace surovin a uzavření fáze

**Files:** Modify `data/ingredients/cz.json` (připojit obsah všech `data/ingredients/new-*.json`), Delete `data/ingredients/new-*.json`, Regenerate `data/ingredients.json`; Modify `data/recipes/README.md` (odstavec o `new-*.json` pro budoucí dávky, počet receptů), `data/recipes/SHORTLIST.md` (sloupec „stav“ hotovo / vynecháno s důvodem).

- [ ] **Krok 1:** Sonnet agent: sloučit `new-*.json` do `cz.json` (zachovat pořadí, bez duplicit, abecedně na konec), smazat `new-*.json`, `npm run build:ingredients`, `npm run validate` (0 CHYBA), `npm test`.
- [ ] **Krok 2:** Ověř počty: `ls data/recipes/*.json | wc -l` = 78 (75 + 3 pilotní) minus vynechané; `grep -c '"verified": false' data/recipes/*.json` – seznam neověřených do README.
- [ ] **Krok 3:** Commit `data(ingredients): konsolidace surovin z fáze 3` s explicitním `git add data/ingredients/cz.json data/ingredients.json data/recipes/README.md data/recipes/SHORTLIST.md` a `git rm data/ingredients/new-*.json`.
- [ ] **Krok 4:** Final review celé větve (Opus): vzorek 10 receptů napříč knihami proti zdrojům, všechny `new` suroviny, statistiky kcal/porci po kapitolách (`tsx -e` skript), konzistence `chapter` × SHORTLIST.
