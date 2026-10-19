# The Bread and Biscuit Baker's and Sugar-Boiler's Assistant (Robert Wells, 1890): analýza textu

Zdroj: `extracted/wells-bread-biscuit-baker-1890.txt` (5 653 řádků, ~170 tis. znaků). Autor: Robert Wells, Scarborough; vydal Crosby Lockwood and Son, Londýn. Kniha je psaná pro pekaře a cukráře (velké dávky, ceny „za penny“).

**Konvence čísel stran:** „strana“ = tištěné číslo v textu (`=== PAGE N ===`). Recepty jsou číslované průběžně 1–263; v OCR chybí v nadpisech pár čísel (např. 15, 19, 45, 46), protože v textu mají jiný tvar („19. Another Way.—“). Grep na `^N.—` našel 242 nadpisů, skutečný počet je tedy ~263 včetně variant.

---

## 1. Struktura knihy

| Kapitola | Tištěné strany | Recepty | Obsah |
|---|---|---|---|
| I. Introductory Chapter | 1–9 | – | Mouka, kvasnice, voda, alum v chlebu, chemie pečení |
| II. General Remarks on Baking | 10–16 | – | Teploty, pece, máslo do pečiva |
| III. Bread, Tea Cakes, Buns, etc. | 17–31 | 1–34 | Chleba (domácí, celozrnný, žitný), tea-cakes, muffiny, crumpety, buns |
| IV. Gingerbread, Parkings, Shortbread | 32–37 | 35–56 | Perník, parkin (ovesný), shortbread |
| V. Hard Biscuits | 38–44 | 57–81 | Ship biscuits, Abernethy, soda biscuits, Bath Oliver |
| VI. Fancy Biscuits, Almonds | 45–56 | 82–124 | Sušenky, makrony, meringue, rusks |
| VII. Pastry, Custards | 57–59 | 125–135 | Listové těsto, Eccles cake, pudinky |
| VIII. Fruit Cakes, Bride Cakes | 60–67 | 136–169 | Dorty, svatební, plum cake, Dundee |
| IX. Handy Wholesale Recipes | 68–71 | 170–179 | Soda scones, mléčné scones, levné lunch cakes |
| X–XV. Cukrovinky, barviva, pastilky, zmrzliny, zavařeniny, čokoláda | 72–102 | 180–263 | Mimo záběr |
| Index | 103–106 | – | |

Vhodné pro domácí kuchyni jsou kapitoly III, IV a IX (cca 100 receptů, z toho většina bez použitelného domácího množství), z V jen výjimečně.

## 2. Formát a jednotky

- Nadpis „N.—Název.“, pak souvislý text: suroviny a postup dohromady, bez odrážek. Varianty „Another Way.“ mají vlastní číslo.
- Dávky pro pekárnu: **1 stone mouky (14 lb = 6,35 kg)**, 4–12 lb, „sack“. Počítá se na penny/halfpenny kusy („weigh off at 6 ozs. for a penny“).
- Míry: lb 454 g, oz 28,35 g, **gill = 142 ml, pint = 568 ml, quart = 1,136 l, gallon = 4,546 l** (imperiální). Teploty ve °F („80–90° Fahr.“ = 27–32 °C).
- Suroviny: „barm / Parisian yeast / German yeast“ = droždí (čerstvé), „volatile salt“ / „ammonia“ = hartshorn, nahradit kypřicím práškem; „cream of tartar + carbonate of soda“ = kypřicí prášek; „churned milk“ = podmáslí; „moist sugar“ = hnědý cukr; „treacle“ = melasa; „lard“ = sádlo; „snap dough“ = základní perníkové těsto.
- Některé recepty mají jen poměry (hlavně v kap. III: Hot Cross Buns č. 20, Chelsea Buns č. 21, žitný chléb č. 8 bez množství mouky). Ty jsou z výběru vynechané.

## 3. Výběr 13 receptů pro digitalizaci

Kritéria: pečení doma v troubě nebo na plotně, levné suroviny, ověřené množství mouky. Cukrovinky, pastilky, zmrzliny a recepty bez množství vynechány. Dávky jsou pekárenské, v digitalizaci je třeba přepočítat na **500 g mouky** (viz poznámky).

| Strana | č. | Název | Moderní český název | Kapitola aplikace | Proč | Dávka (mouka) | Poznámka |
|---|---|---|---|---|---|---|---|
| 17 | 1 | Home-made Bread | Domácí chléb z kvásku droždí | snidane-a-pecivo | Základní bochník, jen mouka, voda, droždí, sůl | 1 stone (6,35 kg) | 2½ oz droždí, 2½ oz soli na 1 stone → na 500 g: ~12 g droždí, 12 g soli; voda 80–90 °F |
| 20 | 5 | Home-made Whole Meal Bread | Celozrnný chléb | snidane-a-pecivo | Levný, sytý, dá se vzít na výlet | 1 stone celozrnné | Stejný poměr jako č. 1; „gill and a half“ vody = 213 ml na rozpuštění droždí |
| 24 | 11 | Tea-Cakes | Čajové koláčky s rozinkami | snidane-a-pecivo | Klasické britské pečivo; kniha říká, že dává i „skotské cookies“ | 1½ lb (?) | Zdá se, že chybí řád (půl galonu vody a 1 lb sádla/másla na 1½ lb mouky nesedí). Ověřit na skenu, jinak odvodit poměr podle č. 13 |
| 25 | 14 | Muffins | Anglické muffiny (na plotně) | snidane-a-pecivo | Tekuté těsto, žádná trouba, pánev nebo plotna | 4 lb (1,8 kg) | Dávka dává 24 kusů; těsto se tvaruje v rukou, na plotně opéct |
| 26 | 16 | Crumpets | Crumpety (placičky v kroužku) | snidane-a-pecivo | Jen mouka, mléko, voda, droždí; pánev + kroužek | 4 lb (1,8 kg) | 1 quart mléka + 1½ quartu vody = 1,14 + 1,70 l; kroužky 1,3 cm vysoké (nahradit plechovkou) |
| 27 | 17 | Oatmeal Cake | Ovesné placky | snidane-a-pecivo | Skotské ovesné pečivo, levné, trvanlivé | 1½ lb mouky + 7 lb ovesných vloček | Kypření: soda + vinný kámen; 8 oz kus rozválet a rozkrájet na čtvrtky |
| 27 | 18 | Bath Buns | Bathské housky | sladke | Typické britské pečivo | 1 lb (454 g) | Jediný recept přímo v domácí velikosti: 1 lb mouky, 8 oz másla, 8 oz cukru, 4 vejce, 1 oz droždí → 14 buchet; citronová kůra místo esence |
| 32 | 37 | Spiced Gingerbread | Koření perník s melasou | sladke | Levný perník bez vajec, melasa | 3 lb (1,36 kg) | 3 lb melasy, 1 lb másla, 1 lb cukru; pomalá trouba; ve stejném tvaru je i č. 35 (s medem a mandlemi, dražší) |
| 36 | 51 | Parkings | Parkin (ovesný perník) | sladke | Ovesné vločky, melasa, levné a trvanlivé | 1 lb mouky + 3½ lb ovsa | Varianta č. 53 „Parking Cake“ (se 4 lb melasy a pivem) je pečený v plechu, snazší pro domácnost |
| 36 | 54 | Scotch Shortbread | Skotské shortbread | sladke | 3 suroviny, trvanlivé, na výlet | 2 lb (907 g) | Poměr 2 : 1 : ¼ (mouka : máslo : cukr) → 500 g mouky, 250 g másla, 125 g cukru; č. 55 English je s vejci |
| 68 | 170 | Soda Cakes or Scones | Sodové scones | snidane-a-pecivo | Bez droždí, podmáslí, rychlé | 12 lb (5,4 kg) | Na 500 g mouky: ~16 g vinného kamene, 8 g sody, 31 g sádla, 5 g soli; kypřicí prášek lze použít místo sody + cream of tartar |
| 68 | 171 | Currant or Milk Scones | Scones s rozinkami | snidane-a-pecivo | Klasika, levná | 6 lb (2,7 kg) | Na 500 g: 25 g sádla, 25 g cukru, 15 g CT, 7 g sody, 75 g rozinek, 5 g soli; těsto na podmáslí, rozdělit na čtvrtky |
| 70 | 178 | Halfpenny Lunch Cake | Svačinový koláč s rozinkami | sladke | Rychlé, jednoduché, bez droždí | 2 lb (907 g) | 4 oz sádla, 8 oz cukru, 8 oz rozinek, 1 oz sody + 1 oz CT; těsto z podmáslí, plnit do čtvercových forem |

Nepřijato, ale zmínka: č. 133 Eccles Cake (s. 58, chybí množství listového těsta jako recept), č. 143 Seed Cake (s. 61, pouze 1 lb : 1 lb : 8 vajec : 1 lb, bez postupu), č. 78 Bath Oliver (s. 44, víc práce, těsto, 6½ lb mouky).

## 4. Problémy a rizika

- Dávky jsou velké: u kypřidel (sůl, soda, vinný kámen) dbát na přepočet a raději použít kypřicí prášek (1 lžička ≈ 5 g na 250 g mouky).
- Postupy jsou stručné („prove and bake“, „bake in a sharp oven“): teploty a časy doplnit (200–220 °C „sharp“, 160–170 °C „cool/moderate“).
- Ceny v penny pro dnešek nemají smysl; zachovat jen jako dobovou poznámku.
- OCR je dobré; chyby jsou ve zlomcích (½ → „1/2“) a občas v číslování.
