# Jednotky, převody a zaokrouhlení

## Hmotnost (US avoirdupois)

| zdroj | g | poznámka |
|---|---|---|
| 1 lb (lbs, pound) | 453,6 | |
| 1 oz (ounce) | 28,35 | 16 oz = 1 lb |
| 1 lbs 8 oz | 680 | 453,6 + 8 × 28,35 |
| 1 kg / 1 g | 1 000 / 1 | Feldkochbuch (metrické) |
| 1 Pfund (Pfd.) | 500 | Feldkochbuch, německá libra |

## Objem (US)

| zdroj | ml | poznámka |
|---|---|---|
| 1 gal (gallon) | 3 785 | 4 qt |
| 1 qt (quart, qts) | 946 | 2 pt = 4 cup |
| 1 pt (pint) | 473 | 2 cup |
| 1 cup | 237 | 16 tbsp |
| 1 fl oz | 29,6 | |
| 1 tbsp (tablespoon) | 15 | 3 tsp |
| 1 tsp (teaspoon) | 5 | |
| 1 l (Liter) | 1 000 | Feldkochbuch |

Složené údaje sčítej: „1 gal 1-1/4 qts“ = 3 785 + 1,25 × 946 = 4 968 ml; „1/4 cup 1/3 tbsp“ = 59 + 5 = 64 ml. Vše počítá `npm run convert -- "1 gal 1-1/4 qts:linear"`.

Konzervy (Navy „4 No. 10 cans“): No. 10 = 3 000 g (≈ 2,9 l), No. 2½ = 820 g, No. 2 = 570 g, No. 303 = 450 g. Jen kontrola – primárně ber sloupec hmotnosti.

## Zlomky

- `1-1/2` = 1,5; `8-1/2` = 8,5; `1-7/8` = 1,875; `3/4` = 0,75; `2-1/3` = 2,333.
- OCR (Navy, Feldkochbuch) zlomky často kazí: `114` = 1 1/4, `Vg`/`VY` = ½, `AV` = ¾ apod. Nikdy nehádej – ověř obrázkem stránky.

## Objem → hmotnost

- **Tekutiny** (voda, mléko, vývar, olej v ml): ml ≈ g (olej 0,92 g/ml, pokud surovina nemá `densityGPerMl`).
- AFRS uvádí u vody i hmotnost („WATER,COLD 23 lbs“) → 23 × 453,6 = 10 433 g = 10 433 ml.
- **Sypké suroviny** (jen když chybí hmotnost): `g = ml × units.hrnek / 250`, kde `units.hrnek` je hmotnost hrnku suroviny v `data/ingredients.json`. Případně `densityGPerMl`: `g = ml × densityGPerMl`.
- **Základ hrnku**: `units.hrnek` v katalogu je vždy **metrický hrnek 250 ml**, ne US cup 237 ml. Porce USDA „cup“ (237 ml) se při zápisu do katalogu přepočítá × 250/237 a zaokrouhlí na celé gramy (USDA rýže 185 g/cup → `hrnek` 195). US cup ze zdroje tedy převáděj přes ml (1 cup = 237 ml), nikdy nepoužívej `hrnek` přímo jako „1 cup“.
- Kusy („2 each“, „3 Eier“): `unit: "ks"`, jen když surovina má `units.ks`; jinak převeď na g přes průměrnou hmotnost.

## Přepočet na 4 porce

`amount4 = amountOrig × (4 / originalYield)^p`

| třída (`scaling`) | p | ×(4/100)^p | typicky |
|---|---|---|---|
| `linear` | 1 | 0,0400 | maso, zelenina, rýže, těstoviny, mouka, mléko, vejce, cukr, voda vsáknutá do jídla |
| `seasoning` | 0,85 | 0,0648 | sůl, pepř, sušené koření, bylinky, bujón |
| `aromatic` | 0,92 | 0,0517 | česnek, zázvor, chilli, ocet |
| `leavening` | 0,8 | 0,0761 | prášek do pečiva, soda, droždí |
| `fat` | 0,9 | 0,0552 | olej/máslo do pokrmu |
| `vessel` | 0,6 | 0,1450 | voda na vaření, která se slévá; tuk na smažení |

Pro jiný výtěžek: Navy „100 PORTIONS“ = 100; Feldkochbuch „je Kopf“ = 1 (k = 4, linear × 4, seasoning × 3,25, vessel × 2,30).

Třídu bere aplikace z řádku (`scaling`), jinak ze suroviny. `voda` je `linear`; jen slévaná voda, tuk na smažení a sůl do slévané vody dostanou na řádku `"scaling": "vessel"`.

## Zaokrouhlení (shodně s `roundAmount` v `src/domain/scaling.ts`)

Zaokrouhluj až výsledek pro 4 porce (dělá `npm run convert`). Slévaná voda: na nejbližší 0,5 l, přesná polovina nahoru.

| jednotka | rozsah | krok |
|---|---|---|
| g, ml | < 1 | do JSON ulož přesnou hodnotu v g na 2 desetinná místa (např. `0.85`); aplikace zobrazí „špetka“ |
| g, ml | 1–20 | 1 |
| g, ml | 20–200 | 5 |
| g, ml | > 200 | 10 |
| ks (vejce, bobkový list) | vše | přesně na 0,05 (aplikace zobrazí na 0,5) |
| lzice, lzicka, hrnek | vše | nahoru na 0,5 |

## Teploty °F → °C

`°C = (°F − 32) × 5/9`, zaokrouhli na běžnou hodnotu trouby:

| °F | °C | | °F | °C |
|---|---|---|---|---|
| 140 | 60 | | 375 | 190 |
| 250 | 120 | | 400 | 200 |
| 300 | 150 | | 425 | 220 |
| 325 | 165 | | 450 | 230 |
| 350 | 175 | | 500 | 260 |

AFRS „convection oven“ (horkovzduch) = v domácí troubě horkovzduch na stejnou teplotu, nebo horní/spodní ohřev o 10–20 °C výš.
