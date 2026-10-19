# Karta AFRS (MCO P10110.42B)

Armed Forces Recipe Service: každý recept je jedna (někdy dvě) stránky PDF ve stejném tvaru. Text v `extracted/afrs-mco-p10110-42b.txt` je přesný (digitální PDF), takže recepty z AFRS mohou mít `verified: true` bez kontroly obrázku.

## Části karty

1. **Záhlaví**: sekce a kód, např. `CEREALS AND PASTA PRODUCTS No.E 005 00`. Kód = `source.code` (`"E 005 00"`, bez „No.“). Písmeno = sekce (B předkrmy, C nápoje, D pečivo, E obiloviny a těstoviny, L maso/ryby/drůbež, …). Varianty mají stejný základ a jiné poslední dvojčíslí (`E 005 01` Lyonnaise Rice).
2. **Název** velkými písmeny (`STEAMED RICE`) = `source.titleOriginal`; do `titleOriginal` receptu normálně („Steamed Rice“).
3. **Yield 100 / Portion …**: výtěžek je téměř vždy 100 porcí → `originalYield: 100`. Portion (např. `3/4 Cup`, `8 oz`) slouží ke kontrole realističnosti.
4. **Řádek nutrice** (Calories, Carbohydrates, Protein, Fat, …) na **jednu porci** – kontrola kcal po přepočtu.
5. **Tabulka Ingredient / Weight / Measure / Issue**:
   - `Ingredient` – název ve tvaru „PODSTATNÉ,PŘÍVLASTEK“ (`RICE,LONG GRAIN`, `OIL,SALAD`, `ONIONS,FRESH,CHOPPED`).
   - `Weight` – hmotnost jedlé části po očištění (EP). **Má přednost** – je přesnější než objem.
   - `Measure` – objemový ekvivalent (gal, qt, cup, tbsp). Použij jen, když Weight chybí (koření v tsp, tekutiny bez hmotnosti).
   - `Issue` – nákupní hmotnost před očištěním (AP), např. cibule Weight 3-1/8 lbs, Issue 3-1/2 lbs. Pro recept ji **ignoruj**.
   - Stejná surovina se může opakovat (olej do rýže a olej na restování) – ponech jako dva řádky, případně s `group`/`note`.
   - **Dva řádky WATER**: řádek WATER hned vedle MACARONI/NOODLES/POTATOES s poměrem ~1 gal na 1 lb je **voda na vaření** (slévá se) → do jídla ho nezapočítávej, nahraď domácí hodnotou se `"scaling": "vessel"`. Zbývající WATER je do jídla (`linear`). Příklad L 028 02 Chili Macaroni: WATER 75-1/4 lbs (9 gal) před MACARONI 9 lbs = voda na makarony; WATER 16-3/4 lbs (2 gal) na konci = do omáčky → 7 598 g × 0,04 = 300 ml (`npm run convert -- "16-3/4 lbs:linear"`). Kontrola: `npm run check:recipe -- chili-makarony --portion "1-1/4 cup"` – bilance přes 1,6 znamená, že voda na vaření skončila v jídle.
6. **Method**: číslované kroky. Vynech `CCP:` věty (teploty držení, chlazení) a pokyny pro výdej z velkých nádob.
7. **Notes**: alternativy (trouba místo plotny), časy pro varianty. Užitečné přenes do kroků nebo `modernNote`, zajímavé do `quote`.

## Odkazy na jiné karty

- `See Recipe No. E 004 00` (těstoviny), `Prepare bacon according to Recipe No. L 002 00` (slanina v troubě), `Prepare rice according to E 005 00`: do kroku napiš **nejjednodušší domácí postup** jednou větou („Makarony uvař v osolené vodě do měkka a sceď.“, „Slaninu opeč na pánvi dokřupava.“). Z odkazované karty nepřebírej vybavení (trouba na slaninu → `equipment` bez `trouba`, tag `tabor` zůstává) ani suroviny kromě soli do slévané vody; olej do vody na těstoviny nepřidávej.
- Odkaz na surovinu z jiné karty („Beef Stock, prepared, Recipe No. O 003 00“) = katalogová surovina (`hovezi-vyvar`) s objemem z této karty.
- „Set aside for use in Step 3“, ale krok 3 surovinu nezmiňuje → přidej ji do kroku, kam logicky patří (obvykle ten uvedený), a napiš to do `modernNote`.

## Vzor: E 005 00 Steamed Rice (PDF strana 300)

```
                                                CEREALS AND PASTA PRODUCTS No.E 005 00
                                                       STEAMED RICE

Yield 100                                                                  Portion 3/4 Cup

   Calories       Carbohydrates            Protein               Fat               Cholesterol        Sodium       Calcium
   148 cal              32 g                 3g                  1g                   0 mg            214 mg        26 mg

Ingredient                                                                  Weight               Measure           Issue
RICE,LONG GRAIN                                                             8-1/2 lbs            1 gal 1-1/4 qts
WATER,COLD                                                                  23 lbs               2 gal 3 qts
SALT                                                                        1-7/8 oz             3 tbsp
OIL,SALAD                                                                   1-1/2 oz             3 tbsp

Method
 1 Combine rice, water, salt, and salad oil; bring to a boil. Stir occasionally.
 2 Cover tightly; simmer 20 to 25 minutes. DO NOT STIR.
 3 Remove from heat; transfer to shallow serving pans.

Notes
 1 In Step 2, rice may be baked in a 350 F. convection oven, 35 to 40 minutes on high fan, closed vent.
```

Pozor: `E 006 00` je STEAMED RICE (STEAM COOKER METHOD) – varianta pro parní kotel, pro domácí přepis se nehodí.

### Přepočet (k = 4/100 = 0,04)

| surovina | Weight | → g/ml | třída, p | × k^p | 4 porce | zaokrouhleno | id |
|---|---|---|---|---|---|---|---|
| RICE,LONG GRAIN | 8-1/2 lbs | 8,5 × 453,6 = 3 855,6 g | linear, 1 | × 0,0400 | 154,2 g | **155 g** (krok 5) | `ryze-bila` |
| WATER,COLD | 23 lbs | 23 × 453,6 = 10 432,8 g = ml | linear, 1 (vsákne se, bez přepsání) | × 0,0400 | 417,3 ml | **420 ml** (krok 10) | `voda` |
| SALT | 1-7/8 oz | 1,875 × 28,35 = 53,2 g | seasoning, 0,85 | × 0,0648 | 3,45 g | **3 g** (krok 1) | `sul` |
| OIL,SALAD | 1-1/2 oz | 1,5 × 28,35 = 42,5 g | fat, 0,9 | × 0,0552 | 2,35 g | **2 g** (krok 1) | `repkovy-olej` |

Výpočty mocnin: 0,04^0,85 = e^(0,85 × ln 0,04) = e^(0,85 × −3,2189) = e^−2,7361 = 0,0648; 0,04^0,9 = e^−2,8970 = 0,0552; 0,04^0,6 = e^−1,9313 = 0,1450.

**Proč voda lineárně a ne `vessel`** (surovina `voda` je ve výchozím stavu `linear`): s p = 0,6 by vyšlo 10 432,8 × 0,1450 = 1 512 ml → 1 510 ml vody na 155 g rýže (poměr 9,8 : 1 – rýže by se rozvařila na kaši, voda by zbyla). Voda se do rýže vsákne, takže musí držet poměr ze zdroje 23 : 8,5 = 2,7 : 1 → 420 ml. Pro srovnání karta E 004 01 Buttered Pasta (str. 299): 8 gal vody na 12 lb špaget (12 × 453,6 × 0,04 = 218 → 220 g těstovin). Ta voda se slévá, proto ji **neodvozuj ze zdroje** (lineárně by vyšlo 1,2 l, přes `vessel` 4,4 l – obojí je jen artefakt velkokuchyňského kotle). Ulož domácí hodnotu 1 l na 100 g těstovin zaokrouhlenou na 0,5 l: 220 g → **2 000 ml** s přepsáním `"scaling": "vessel"` na řádku. U brambor: zalít, aby byly ponořené (~1 l na 1 kg). Tuk na smažení dostane na řádku také `"scaling": "vessel"`.

Pravidlo: voda, která zůstává v jídle (rýže, polévky, omáčky), škáluje lineárně. Voda, která se slévá (těstoviny, brambory), a tuk na smažení dostanou na řádku `"scaling": "vessel"`.

Řádek se slévanou vodou (ukázka):

```json
{ "ingredientId": "voda", "amount": 2000, "unit": "ml", "note": "na vaření 220 g těstovin; slije se (domácí hodnota 1 l na 100 g)", "scaling": "vessel" }
```

`source.page` je číslo stránky PDF `docs/MCO P10110.42B.pdf` (ne tištěné číslo).

**Kontrola realističnosti**: 155 g / 4 = 39 g suché rýže na porci = AFRS porce 3/4 cup vařené jako příloha. Na hlavní jídlo by bylo málo (60–90 g), jako příloha je to v pořádku.

**Kontrola kcal**: 155 g rýže × ~360 kcal/100 g = 560 kcal + 2 g oleje × 9 = 18 kcal → ~145 kcal na porci; AFRS uvádí 148 kcal. Sedí.

**Kroky**:
1. Rýži, studenou vodu, sůl a olej dej do hrnce a přiveď k varu. Občas zamíchej.
2. Hrnec pevně přikryj a na mírném ohni duš 20–25 minut. Nemíchej.
3. Sundej z ohně.

(Ve kroku 3 je vynechán pokyn pro výdej „transfer to shallow serving pans“; nic se nedoplňuje – kroky jen ze zdroje. Note 1 o konvektomatu vynechán, protože recept je určený pro plotnu/kotlík.)

Výsledek je v `reference/example-recipe.json`. Stejný výpočet nástrojem:

```bash
npm run convert -- --yield 100 "8-1/2 lbs:linear" "23 lbs:linear" "1-7/8 oz:seasoning" "1-1/2 oz:fat"
npm run check:recipe -- dusena-ryze --portion "3/4 cup" --kcal 148
```
