# Škálovací třídy – situace → `scaling`

`amount4 = amountOrig × (4 / originalYield)^p`. Třídu bere aplikace z řádku (`"scaling"` na řádku receptu), jinak ze suroviny v katalogu. Na řádek ji piš **jen když se liší od katalogové**.

| třída | p | k = 4/100 | k = 4/1 (je Kopf) |
|---|---|---|---|
| `linear` | 1 | × 0,0400 | × 4,00 |
| `seasoning` | 0,85 | × 0,0648 | × 3,25 |
| `aromatic` | 0,92 | × 0,0517 | × 3,58 |
| `leavening` | 0,8 | × 0,0761 | × 3,03 |
| `fat` | 0,9 | × 0,0552 | × 3,48 |
| `vessel` | 0,6 | × 0,1450 | × 2,30 |

## Rozhodovací tabulka

| Situace | Třída | Hodnota | Příklad |
|---|---|---|---|
| Voda, která **zůstává v jídle** (rýže, polévka, omáčka, kaše, dušení) | `linear` (katalog `voda`) | ze zdroje | 23 lb vody na 8,5 lb rýže → 420 ml na 155 g |
| Voda, která se **slévá** (těstoviny, brambory, luštěniny vařené zvlášť) | `"scaling": "vessel"` na řádku | **domácí hodnota**, ne ze zdroje: těstoviny 1 l na 100 g; brambory/luštěniny ~1 l na 1 kg („zalít, aby byly ponořené“); zaokrouhli na nejbližší 0,5 l, přesná polovina nahoru, **nejméně 1 000 ml** (`npm run convert -- --pasta 220` / `--potatoes 600`) | 220 g špaget → 2 000 ml; 73 g makaronů → 1 000 ml |
| Řádek WATER v kartě AFRS vedle MACARONI/NOODLES/POTATOES s ~1 gal na 1 lb | je to slévaná voda → **nezapočítávej do jídla**, nahraď domácí hodnotou `vessel` | | Chili Macaroni: WATER 9 gal před MACARONI 9 lb = voda na makarony; druhý řádek WATER 2 gal = do omáčky |
| Sůl do slévané vody | `"scaling": "vessel"` + `note: "do vody na vaření, slije se"` | 2 g na 1 l | |
| Sůl, pepř, sušené koření, bylinky, bujón, cukr do slaného jídla | `seasoning` (katalog) | ze zdroje | |
| Česnek, zázvor, chilli, ocet, citronová šťáva jako dochucení | `aromatic` (katalog) | ze zdroje | |
| Citronová šťáva / ovoce jako **hlavní složka** nápoje, zálivky, sirupu | `"scaling": "linear"` | ze zdroje | limonáda |
| Tuk, který **zůstává v jídle** (restování cibule, máslo do zelí, olej do rýže) | `fat` (katalog) | ze zdroje | |
| Tuk, který se **vylévá** (fritování) nebo olej na vymazání pánve/plechu | `"scaling": "vessel"` | ze zdroje, nebo 1 lžička oleje místo cooking spray | |
| Tuk, cukr a vejce **v těstě** (pečení je chemie) | `"scaling": "linear"` na řádku (katalog má tuk `fat`, cukr `seasoning`) | ze zdroje | brownies, palačinky, chléb |
| Kypřidlo, které **kypří těsto** (prášek do pečiva, soda, droždí) | `"scaling": "linear"` na řádku | ze zdroje | |
| Soda na změkčení luštěnin, kypřidlo mimo těsto | `leavening` (katalog) | ze zdroje | |
| Vejce (vždy `ks`) | `linear` | g ze zdroje / 50, přesně na 0,05 (`convert … :ks=50`); aplikace zaokrouhlí na 0,5 při zobrazení; mražená/sušená vejce do `original` | 10 lb mražených na 100 porcí → 3,65 ks |
| Bobkový list (vždy `ks`) | `seasoning` | g ze sloupce Weight × faktor / 0,2 (`convert … :ks=0.2`); počet listů ze zdroje jen když Weight chybí | 4 listy na 100 porcí → 0,5 ks |
| Koření jen v tsp/tbsp (bez Weight) | `seasoning` | objem × faktor → g přes `units.lzicka`/`units.lzice` suroviny (`convert "1 tsp:seasoning:tsp=2.3"`); bez `units` → ml × `densityGPerMl`, jinak ml × `units.hrnek` / 250 | pepř 1 tsp na 100 → 0,15 g |
| Množství pod 1 g | podle suroviny | ulož přesně v g (2 desetinná místa), ne `spetka`; `spetka` jen když zdroj říká „pinch“ / „to taste“ | `0.69` |
| Vývar (masový i zeleninový) | `linear` | ze zdroje; zůstává vývarem, ne vodou | |
| Mléko ze sušeného mléka + vody | `linear` | jeden řádek `mleko-polotucne`, ml = voda (ml) + sušené mléko (g) po přepočtu na 4 porce; sušené mléko (g) do `original`; poměr zdroje (i 1:7,5) respektuj | 30 g + 230 ml → 260 ml |
| Maso připravené podle jiné karty (slanina L 002 00) | `linear` | ze zdroje; postup nejjednodušší domácí (pánev), viz afrs-card.md | |

## Zaokrouhlení (shodné s `roundAmount` v `src/domain/scaling.ts`)

Zaokrouhluj až výsledek pro 4 porce, nikdy mezikroky. `npm run convert` to dělá za tebe.

| jednotka | rozsah | krok |
|---|---|---|
| g, ml | < 1 | ulož přesně (2 desetinná místa) |
| g, ml | 1–20 | 1 |
| g, ml | 20–200 | 5 |
| g, ml | > 200 | 10 |
| ks | vejce, bobkový list | 0,05 (aplikace zobrazí na 0,5) |
| lzice, lzicka, hrnek | vše | nahoru na 0,5 – používej jen když je surovina má v `units`; v pochybnostech piš g/ml |

## Proč ne `vessel` pro vodu v rýži

Steamed Rice: 23 lb vody na 8,5 lb rýže. S p = 0,6 by vyšlo 1 510 ml na 155 g rýže (poměr 9,8 : 1 – kaše). Voda se vsákne, musí držet poměr zdroje 2,7 : 1 → 420 ml `linear`. Naopak 8 gal vody na 12 lb špaget se slévá: lineárně 1,2 l, přes `vessel` 4,4 l, obojí artefakt velkokuchyňského kotle → domácí 2 000 ml `vessel`.
