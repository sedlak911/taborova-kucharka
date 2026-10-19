# BACKLOG digitalizace receptů

Stav k 2026-10-16 (pauza na žádost uživatele – docházely tokeny). Pokračovat podle `.claude/skills/recipe-digitize/` (zejména `reference/batch.md`) a pracovního briefu ve scratchpadu session `digitize-all/navy/common-brief.md` (pokud scratchpad zanikl, pravidla z něj jsou shrnuta níže v sekci „Pravidla navíc“).

## Hotovo

| Kniha | Stav |
|---|---|
| Feldkochbuch 1940 | kompletní |
| Gentile (italian-1919) | kompletní, 222 receptů; zbývá jen uzavření (viz níže) |
| Navy 1944 | dávky **N1–N35 hotové** + jednotlivě N45-7 `jablecny-kolac-apple-pie` (351 receptů ze shortlistu 481). N1–N34 ověřené Sonnet ověřovatelem, **N35 bez ověření** (10 receptů: dusena-cibule-ze-susene, glazovana-cibule, pecena-cibule-s-rajcaty, pastinak-na-masle, hrasek-na-masle, hrasek-s-celerem, cernooke-fazole, pecene-brambory, brambory-ve-slupce, brambory-s-petrzeli). |
| AFRS 2003 | nezačato |

Databáze: validate 0 CHYBA (varování jen kcal < 50 u zálivek/salátů/vývarů a počet `verified: false`).

## Další kroky (pořadí)

1. **Ověřit N35** (Sonnet ověřovatel: obrázek strany vs. JSON přes `npm run convert -- --yield 100 …`, opravit, report). Body: cernooke-fazole vsáknutá voda 270 ml odhad; pecene-brambory A.P. 800 g vs ediblePortion; hrasek-s-celerem konzerva → mražený 1:1; hominy-ve-smetane (N34) hmotnost konzervy možná včetně nálevu.
2. **Navy N36–N49** (130 receptů; N45-7 už hotové) – seznam níže. Rytmus: 10 Haiku digitizérů na dávku (každý jeden řádek shortlistu + brief), souběžně Sonnet ověřovatel předchozí dávky, pak commit `data(recipes): dávka N<n> – …`, pracuje se na větvi `github-main`, každou 2.–3. dávku `git push` (→ GitHub Pages, viz README „Větve a historie“).
3. **Uzavření Gentile**: konsolidace `data/ingredients/new-*.json` → `cz.json` (batch.md §5), README počty, ověřit kolizi `konak` v new-listove-testo.json.
4. **AFRS**: připojit scratchpad `afrs/shortlist.md` (1484 řádků; pokud zanikl, vygenerovat znovu z `extracted/` textu AFRS) do `data/recipes/SHORTLIST.md`, Haiku digitizéři, `verified: true` z digitálního textu.
5. ~~**Katalogové otázky**~~ – vyřešeno 2026-10-19: `veprova-plec` ediblePortion 1 (všechny recepty bez kosti); nová `krevety-varene` (USDA fdc:175180) pro 3 recepty s vařenými krevetami, `krevety` zůstávají syrové (creole); `bananove-livance` nasáklý olej `fat`; `syrova-pomazanka-navy` → `chili-omacka`; `hrasek` 0,38 ponechán (platí pro lusky A.P., poznámka v sources). Kosti (`teleci-kosti`/`hovezi-kosti`/`sunkova-kost`) beze změny: makra 0 jsou záměr (energie je ve vývaru), ediblePortion se při nulových makrech neprojeví.
6. Podněty do skillu `recipe-digitize` (měnit jen s agentním testem) – pravidla níže.
7. **Proklik mezi recepty**: když se recept odkazuje na jiný recept (např. apple pie → Pie Pastry, AFRS „See Recipe No. …“), aplikace by měla nabídnout odkaz na ten recept. Vyžaduje pole ve schématu (např. `ingredients[].recipeId` nebo `relatedRecipes`), úpravu `src/domain/schema.ts`, `scripts/validate.ts` (cíl musí existovat) a UI. Po zavedení pročistit recepty, kde je odkazovaná karta zatím vložená přímo (nyní `jablecny-kolac-apple-pie` s těstem; cíl `testo-na-pie`, N45-6).

## Navy – zbývající řádky shortlistu (N36–N49)

Úplné řádky (strana PDF, kapitola, tagy, poznámky) jsou v `data/recipes/SHORTLIST.md`.

| Dávka | id | Název |
|---|---|---|
| N36-1 | `zapecene-brambory-ve-smetane` | Zapečené brambory ve smetanové omáčce (Escalloped Potatoes) |
| N36-2 | `brambory-franconia` | Brambory Franconia (Franconia Potatoes) |
| N36-3 | `hranolky` | Hranolky (French Fried Potatoes) |
| N36-4 | `opekane-brambory-hash-browns` | Opékané bramborové kostky (hashed browns) (Hashed Browned Potatoes) |
| N36-5 | `hash-browns-ze-susenych` | Hash browns ze sušených brambor (Hashed Browned Potatoes (using dehydrated potatoes)) |
| N36-6 | `domaci-smazene-brambory` | Domácí smažené brambory (Home-Fried Potatoes) |
| N36-7 | `lyonske-brambory` | Lyonské brambory s cibulí (Lyonnaise Potatoes) |
| N36-8 | `bramborova-kase-navy` | Bramborová kaše (Mashed Potatoes) |
| N36-9 | `bramborova-kase-ze-susenych` | Bramborová kaše ze sušených brambor (Mashed Potatoes (using dehydrated shredded potatoes)) |
| N36-10 | `brambory-obrien` | Brambory O'Brien s paprikou (O'Brien Potatoes) |
| N37-1 | `brambory-au-gratin` | Brambory au gratin ze sušených brambor (Potatoes au Gratin (using dehydrated potatoes)) |
| N37-2 | `bramborovy-nakyp` | Bramborový nákyp (potato puff) (Potato Puff) |
| N37-3 | `pecene-bataty-ze-susenych` | Pečené batáty ze sušených batátů (Baked Sweet Potatoes (using dehydrated sweet potatoes)) |
| N37-4 | `batatova-kase` | Batátová kaše ze sušených batátů (Mashed Sweet Potatoes (using dehydrated sweet potatoes)) |
| N37-5 | `bataty-pecene-s-jablky` | Batáty pečené s jablky (Sweet Potatoes Baked with Apples) |
| N37-6 | `glazovane-bataty` | Glazované batáty (Glazed Sweet Potatoes) |
| N37-7 | `karamelizovane-bataty` | Karamelizované batáty ze sušených batátů (Candied Sweet Potatoes (using dehydrated sweet potatoes)) |
| N37-8 | `spanelska-ryze-navy` | Španělská rýže se slaninou a rajčaty (Spanish Rice) |
| N37-9 | `varene-kysane-zeli` | Kysané zelí vařené (Sauerkraut) |
| N37-10 | `succotash` | Succotash (lima fazole a kukuřice) (Succotash) |
| N38-1 | `pecena-dyne-acorn` | Pečená dýně acorn (Baked Acorn Squash) |
| N38-2 | `pecena-dyne-hubbard` | Pečená dýně Hubbard (Baked Hubbard Squash) |
| N38-3 | `cuketa-na-masle` | Cuketa na másle (Buttered Summer Squash) |
| N38-4 | `zapecena-rajcata` | Zapečená rajčata s chlebem (Escalloped Tomatoes) |
| N38-5 | `grilovana-rajcata` | Grilovaná rajčata (Grilled Tomatoes) |
| N38-6 | `plnena-rajcata-navy` | Plněná rajčata (Baked Stuffed Tomatoes) |
| N38-7 | `dusena-rajcata` | Dušená rajčata (Stewed Tomatoes) |
| N38-8 | `vodnice-na-masle` | Vodnice (tuřín) na másle (Buttered Rutabagas) |
| N38-9 | `vodnice-se-slaninou` | Sušená vodnice se slaninou (Turnips (Rutabagas) with Bacon) |
| N38-10 | `pecena-vodnice-s-bramborami` | Pečená vodnice s bramborami (Baked Turnips and Potatoes) |
| N39-1 | `zelenina-s-kari` | Zelenina s kari (Curried Mixed Vegetables) |
| N39-2 | `zeleninovy-kolac` | Zeleninový koláč s biscuity (Vegetable Pie) |
| N39-3 | `bily-chleb` | Bílý chléb (základní receptura) (White Bread (average formula, 24 loaves)) |
| N39-4 | `bily-chleb-bohaty` | Bílý chléb (bohatá receptura) (White Bread (rich formula)) |
| N39-5 | `polni-chleb` | Polní chléb (Field Bread (straight dough)) |
| N39-6 | `zitny-chleb` | Žitný chléb s kmínem (Rye Bread (22 loaves)) |
| N39-7 | `polocelozrnny-chleb` | Chléb z poloviny celozrnný (50 Per Cent Whole Wheat Bread (23 loaves)) |
| N39-8 | `mekke-housky` | Měkké housky (Plain Soft Rolls (18 dozen)) |
| N39-9 | `zakladni-sladke-kynute-testo` | Základní sladké kynuté těsto (Basic Sweet Dough (33¼ lb)) |
| N39-10 | `skoricove-sneky` | Skořicové šneky z kynutého těsta (Sweet dough variant: Cinnamon Buns) |
| N40-1 | `motylkove-buchty` | Motýlkové buchty (Sweet dough variant: Butterfly Buns) |
| N40-2 | `plochy-kynuty-kolac` | Plochý kynutý koláč s drobenkou (Sweet dough variant: Flat-Top Coffee Cake) |
| N40-3 | `koblihy-s-marmeladou` | Koblihy s marmeládou (Sweet dough variant: Jelly Doughnuts) |
| N40-4 | `dansky-pletenec` | Dánský pletenec (Sweet dough variant: Danish Twist) |
| N40-5 | `maslove-rohlicky` | Máslové rohlíčky a šneci (Sweet dough variant: Butter-Horns/Snail Buns) |
| N40-6 | `maslova-poleva-na-kolace` | Máslová poleva na koláče (Butter Topping) |
| N40-7 | `drobenka-streusel` | Drobenka (streusel) (Streusel Topping) |
| N40-8 | `vanilkova-vodni-poleva` | Vanilková vodní poleva (Vanilla Water Icing) |
| N40-9 | `lesk-na-pecivo` | Lesk na pečivo (glazura) (Shine (glaze)) |
| N40-10 | `ovocna-napln` | Ovocná náplň z drobenek (Fruit Filling) |
| N41-1 | `napln-jablko-pekan` | Náplň z jablečného pyré a pekanů (Applesauce Pecan Filling) |
| N41-2 | `maslovy-krem` | Máslový krém (náplň) (Butter Cream Filling) |
| N41-3 | `orechova-napln` | Ořechová náplň (Nut Filling) |
| N41-4 | `biscuity-a-shortcake` | Biscuity s práškem do pečiva a shortcake (Baking Powder Biscuits and Short Cake) |
| N41-5 | `coffee-cake` | Kynutý koláč s drobenkou (coffee cake) (Coffee Cake) |
| N41-6 | `rychle-skoricove-buchty` | Rychlé skořicové buchty (Quick Cinnamon Buns) |
| N41-7 | `jablecna-torta` | Jablečná torta (Apple Torte) |
| N41-8 | `kukuricne-placky-corn-pones` | Kukuřičné placky (corn pones) (Plain Corn Pones or Dodgers) |
| N41-9 | `knedlicky-do-polevky` | Knedlíčky do polévky (Dumplings) |
| N41-10 | `zazvorovy-pernik` | Zázvorový perník (Gingerbread) |
| N42-1 | `testo-na-masove-kolace` | Těsto na masové koláče (Meat Pie Crust) |
| N42-2 | `pohankove-placky` | Pohankové placky na plotně (Quick Buckwheat Griddle Cakes) |
| N42-3 | `psenicne-placky` | Pšeničné placky na plotně (Wheat Griddle Cakes) |
| N42-4 | `celozrnne-placky` | Celozrnné placky na plotně (Whole Wheat Griddle Cakes) |
| N42-5 | `kukuricne-placky-na-plotne` | Kukuřičné placky na plotně (Corn Griddle Cakes) |
| N42-6 | `muffiny` | Muffiny (Muffins) |
| N42-7 | `otrubove-muffiny` | Otrubové muffiny s melasou (Molasses Bran Muffins) |
| N42-8 | `otrubovy-chlebicek` | Otrubový chlebíček z plechu (Bran Pan Bread) |
| N42-9 | `francouzske-topinky-navy` | Francouzské topinky (French Toast) |
| N42-10 | `zakladni-zluty-kolac` | Základní žlutý piškot (Basic Yellow Cake) |
| N43-1 | `zakladni-bily-kolac` | Základní bílý koláč (z bílků) (Basic White Cake) |
| N43-2 | `bananovy-kolac` | Banánový koláč (Banana Cake) |
| N43-3 | `cokoladove-ctverce` | Čokoládové čtverce (Chocolate Squares) |
| N43-4 | `kokosove-ctverce` | Kokosové čtverce (Coconut Squares) |
| N43-5 | `obraceny-ananasovy-kolac` | Obrácený ananasový koláč (Pineapple Upside Down Cake) |
| N43-6 | `kolac-z-jablecneho-pyre` | Koláč z jablečného pyré (Applesauce Cake) |
| N43-7 | `karamelovy-kolac` | Karamelový koláč (Caramel Cake) |
| N43-8 | `kolac-z-drobenek` | Koláč z drobenek (Crumb Cake) |
| N43-9 | `devils-food-cake` | Čokoládový dort Devil's Food (Devil's Food Cake) |
| N43-10 | `koreneny-kolac` | Kořeněný koláč (Spice Cake) |
| N44-1 | `zluty-pound-cake` | Žlutý máslový koláč (pound cake) (Yellow Pound Cake) |
| N44-2 | `bily-pound-cake` | Bílý máslový koláč (pound cake) (White Pound Cake) |
| N44-3 | `angel-food` | Andělský koláč (angel food) (Angel Food) |
| N44-4 | `piskotovy-kolac` | Piškotový koláč (Sponge Cake) |
| N44-5 | `bila-kremova-poleva` | Bílá krémová poleva (White Cream Icing) |
| N44-6 | `cokoladova-fudge-poleva` | Čokoládová fudge poleva (Chocolate Fudge Icing) |
| N44-7 | `cokoladova-poleva-se-sladem` | Čokoládová poleva se sladem (Chocolate Malted Milk Cream Icing) |
| N44-8 | `javorova-poleva` | Javorová krémová poleva (Maple Cream Icing) |
| N44-9 | `fondan` | Fondán (Fondant) |
| N44-10 | `ananasova-fondanova-poleva` | Ananasová fondánová poleva (Pineapple Fondant Icing) |
| N45-1 | `marshmallow-poleva-z-bilku` | Marshmallow poleva z bílků (Marshmallow Icing (egg white type)) |
| N45-2 | `marshmallow-poleva-se-zelatinou` | Marshmallow poleva se želatinou (Marshmallow Icing (gelatin type)) |
| N45-3 | `koblihy-doughnuts` | Ručně vykrajované koblihy (doughnuts) (Doughnuts (hand cut)) |
| N45-4 | `poleva-na-koblihy` | Poleva na koblihy (Doughnut Icing Formula) |
| N45-5 | `cukrova-smes-na-koblihy` | Cukrová směs na koblihy (Doughnut Sugaring Formula) |
| N45-6 | `testo-na-pie` | Těsto na koláče (pie pastry) (Pie Pastry (3 typy)) |
| N45-8 | `jablecny-kolac-ze-susenych` | Jablečný koláč ze sušených jablek (Apple Pie (using dehydrated apple nuggets)) |
| N45-9 | `hluboky-jablecny-kolac` | Hluboký jablečný koláč z plechu (Deep Dish Apple Pie) |
| N45-10 | `holandsky-jablecny-kolac` | Holandský jablečný koláč (Dutch Apple Pie) |
| N46-1 | `kolac-z-bobuli-nebo-tresni` | Koláč z bobulí nebo třešní (Berry or Cherry Pie) |
| N46-2 | `falesny-tresnovy-kolac` | Falešný třešňový koláč (Mock Cherry Pie) |
| N46-3 | `brusinkovy-kolac` | Brusinkový koláč s pomerančem (Cranberry and Orange Pie) |
| N46-4 | `mince-pie` | Mince pie (koláč s mincemeatem) (Mince Pie) |
| N46-5 | `broskvovy-kolac` | Broskvový nebo meruňkový koláč (Peach or Apricot Pie) |
| N46-6 | `ananasovy-kolac` | Ananasový koláč (Pineapple Pie) |
| N46-7 | `kolac-ze-sliv-a-jablek` | Koláč ze švestek a jablek (Prune and Apple Pie) |
| N46-8 | `kolac-z-rozinek-a-jablek` | Koláč z rozinek a jablek (Raisin and Apple Pie) |
| N46-9 | `kolac-ze-sliv-a-merunek` | Koláč ze švestek a meruněk s pěnou (Prune and Apricot Pie) |
| N46-10 | `rebarborovy-kolac` | Rebarborový koláč (Rhubarb Pie (canned)) |
| N47-1 | `kremovy-kolac` | Krémový koláč (základ) (Cream Pie (base)) |
| N47-2 | `karamelovy-kremovy-kolac` | Karamelový krémový koláč (Butterscotch Pie) |
| N47-3 | `cokoladovy-kremovy-kolac` | Čokoládový krémový koláč (Chocolate Cream Pie) |
| N47-4 | `ananasovy-chiffon-kolac` | Ananasový chiffon koláč (Pineapple Chiffon Pie) |
| N47-5 | `kolac-s-vajecnym-kremem` | Koláč s vaječným krémem (Custard Pie) |
| N47-6 | `pekanovy-kolac` | Pekanový koláč (Pecan Pie) |
| N47-7 | `citronovy-kolac-s-penou` | Citronový koláč s pěnou (Lemon Meringue Pie) |
| N47-8 | `dynovy-kolac` | Dýňový koláč (Pumpkin Pie) |
| N47-9 | `merenga-na-kolace` | Pěna (meringue) na koláče (Meringue for Pies) |
| N47-10 | `brownies-s-orechy` | Brownies s ořechy (Brownies) |
| N48-1 | `maslove-susenky` | Máslové sušenky (Butter Cookies) |
| N48-2 | `ovocne-tycinky` | Ovocné tyčinky (Fruit Bars) |
| N48-3 | `susenky-z-drobenek` | Sušenky z drobenek (Crumb Cookies) |
| N48-4 | `cokoladove-susenky-fudge` | Čokoládové sušenky fudge (Fudge Cookies) |
| N48-5 | `zazvorove-susenky` | Zázvorové sušenky (Ginger Cookies) |
| N48-6 | `hermits` | Hermits (rozinkové sušenky s ořechy) (Hermits (Raisin and Nut Drop Cookies)) |
| N48-7 | `ovesne-susenky-s-melasou` | Ovesné sušenky s melasou (Oatmeal Cookies) |
| N48-8 | `mekke-melasove-susenky` | Měkké melasové sušenky (Soft Molasses Cookies) |
| N48-9 | `mekke-cukrove-susenky` | Měkké cukrové sušenky (Soft Sugar Cookies) |
| N48-10 | `bohate-cukrove-susenky` | Bohaté cukrové sušenky (Rich Sugar Cookies) |
| N49-1 | `krupave-cukrove-susenky` | Křupavé cukrové sušenky (Crisp Sugar Cookies) |

## Pravidla navíc (nad rámec skillu, vzešlá z dávek N12–N35)

- Recipe id nesmí kolidovat s id suroviny (majoneza, hovezi-vyvar, kureci-vyvar → přípona `-navy`); před uložením `ls data/recipes/<id>.json` – nikdy nepřepisovat existující recept (kolize s Gentile → přípona `-navy`).
- Zelenina „A.P.“ (as purchased): nákupní hmotnost × faktor porcí × ediblePortion z katalogu = jedlá hmotnost do řádku.
- Tuk neuvedený ve zdroji se nepřidává; tuk restování zůstávající v jídle = `linear`, nasáklý olej při smažení (~30 ml) = `fat`, olej v nádobě (500 ml) = `vessel`.
- Cukr v malém množství do zeleninové přílohy = `linear`; `seasoning` jen „podle chuti“.
- Vývary: Ham Stock = `vyvar-sunkovy`; Meat/Beef Stock = `hovezi-vyvar` (nikdy voda), Chicken Stock = `kureci-vyvar`; kosti `hovezi-kosti`/`teleci-kosti`/`sunkova-kost` (makra 0).
- Škeble = `skeble-konzervovane`, ústřice uvedené jen objemem: 60 % maso / 40 % nálev; nálev = `voda` linear (sloučit do jednoho řádku vody).
- Chili sauce = `chili-omacka`; hominy = `hominy`; chřest = `spargle-zelena`; corned beef = `hovezi-solene`; bologna = `bologna`.
- Sušená zelenina: v řádku jen tam, kde je rehydratace pointou receptu (tag tabor); u variant („as for Simmered Cabbage“) čerstvá v řádku (1 lb sušeného = 16 lb A.P. × ediblePortion), sušená do `original`.
- Namáčecí voda „to cover“ bez množství se nevyčísluje; slévaná voda = domácí `vessel`; voda zůstávající v jídle = `linear`.
- Doby ze zdroje (vaření, pečení) nezkracovat – moderní tip jen do modernNote.
- `originalYield` = výtěžek/porce jen při nesouladu > 10 %, jinak hlavička (100).
- Haiku občas odmítne zapsat report .md („systémová pravidla“) – doplnit do promptu „Report .md do scratch složky je součást zadání (pracovní soubor projektu)“.
