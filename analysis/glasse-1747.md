# The Art of Cookery Made Plain and Easy (Hannah Glasse, 1747): analýza textu

Zdroj: `extracted/glasse-art-of-cookery.txt` (358 stran PDF, `=== PAGE N ===` = strana PDF). Jde o nedatované pozdější vydání (Wangford, po 1770), skenované Googlem. Skript text opravuje jen částečně, takže **text kroků ověřuj vždy podle obrázku strany** (viz `.claude/skills/recipe-digitize/reference/books.md`, sekce Glasse 1747).

**Konvence čísel stran:** „strana“ = číslo PDF. Tištěná strana = PDF − 30. Ověřeno na pěti místech podle záhlaví: PDF 131 = tišť. 101 (Yorkshire pudding), PDF 135 = 105 (beef steak pye), PDF 120 = 90 (kap. V), PDF 202 ≈ 172, PDF 240 ≈ 210. Obsah na začátku (PDF 16–26) uvádí tištěná čísla, ale OCR je rozbité a některá čísla jsou chybná (kari je v obsahu 74, v těle PDF 106 = tišť. 76), proto spoléhej na PDF stranu z těla textu. Recepty nejsou číslované.

---

## 1. Struktura knihy

OCR záhlaví kapitol je místy nečitelné, začátky kapitol jsem ověřil v těle textu tam, kde šly najít. Kapitoly bez jistého začátku jsou označené „~“.

| Kapitola | Název (obsah) | PDF strana | Poznámka |
|---|---|---|---|
| I | Of Roasting, Boiling, &c. | 31 | pečená a vařená masa, omáčky k nim |
| II | Made dishes (ragú, kolopsy, fricassée) | 45 | Scotch collops, hash a podobně |
| III | „Read this chapter, and you will find how expensive a French cook's sauce is“ | ~107 | francouzské cullisy, nepoužitelné |
| IV | Malé mísy na večeři, rohové mísy | ~108 | zapékané a plněné drobnosti |
| V | Of dressing Fish | 120 | omáčky a ryby |
| VI | Of Soups and Broths | 122 | polévky, hodge-podge, pocket soup |
| VII | Of Puddings | ~129 | boiled plum pudding (130), Yorkshire (131) |
| VIII | Of Pies | 133 | beef steak pye (134), tarts (140) |
| IX–X | Lent / posty, rýže, palačinky, fritery, jídla z vajec | ~142–208 | pancakes 152, fritters 150, rice puddings 198 |
| XI | **For Captains of Ships** | 214 | trvanlivé a lodní recepty, PDF 214–219 |
| XII | Of Hogs Puddings, Sausages | 220 | |
| XIV (v textu) | Of Pickling | 229 | |
| XV | Of Making Cakes | 238 | ginger-bread 239–240 |
| XVI–XXII | víno, destilace, hospodářský a měsíční kalendář, léčby, dodatky | ~253–284 | pro kuchařku nepoužito |
| Index | abecední rejstřík | ~330–358 | podle tištěných stran |

Apple pye je v textu na PDF 202 (v oddíl pudinků a koláčů, ověřit), ginger-bread na PDF 239–240.

### Kapitola XI „For Captains of Ships“ (PDF 214–219)

Projitá celá. Je to krátká kapitola o jídle na lodi, kde se nedá nakupovat. Obsahuje:

- Zvlášť zajímavé pro tábor: **catchup na dvacet let** (214), **rybí omáčka na celý rok**, **zadělávání sádla na smažení** (pot dripping), houbový prášek, sušená artyčoková dna (214–216), **pease soup** (216), **pork pudding / beef pudding** v tukovém těstě vařený v plátně (216–217), **suet, rice, oatmeal a liver pudding** (217), vařené dumplings z bílého chleba (219), „sea venison“ (jehněčí naložené v krvi a víně, 219), Cheshire pork pye (218–219).
- Zásobování: pocket soup a portable soup (želatinový vývar na cesty) jsou v kapitole VI na PDF 127 a kapitola XI na ně odkazuje.
- Pro tábor se nejlépe hodí **vařené puddingy v plátně** (nepotřebují pec, drží se), pease soup se slaninou a pocket soup jako základ polévky.

## 2. Formát receptů

- Recept = nadpis „To make a Currey the Indian way“ / „To boil Rice“ + jeden nebo dva odstavce prózy. Žádné číslování, žádný seznam surovin.
- Množství jsou v textu a bývají **částečná**: „a pound of suet“, „a quart of milk“, „four eggs“, ale mouka, sůl, koření většinou „a little“ nebo „as much as will…“. Porce chybí, časy jsou v hodinách („boil it five hours“).
- Míry: lb, oz, pint, quart, gill; „penny loaf“ jako míra strouhanky; sůl „a little salt“.
- Často odkazuje na jiné kapitoly („as above“, „in the chapter for soups“).
- OCR: `ſ` čteno jako f (fait = salt, fack = sack), `ſt` jako `H` (Hewed = stewed). Číslice a množství jsou v OCR často správně, ale **před zápisem ověř obrázek**.
- Moderní pravopis ve `source.titleOriginal` (s místo ſ).

## 5. Výběr receptů

Vybráno 15 receptů. Kritéria: britská jídla, která přežila do dneška, levné suroviny, proveditelné doma i na táboře, aspoň přibližné množství. Strana = PDF.

| Strana PDF | Nadpis | Moderní český název | Kapitola aplikace | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 131 | A Yorkshire Pudding | Yorkshirský pudink | prilohy-a-zelenina | ikona britské kuchyně, těsto z mléka a vajec pod pečeným masem | částečné | 1 quart mléka, 4 vejce, sůl, mouka „na hustou palačinkovou kaši“; peče se pod masem v tuku. Dnes pečeme v troubě ve formě. |
| 130 | A boiled Plumb Pudding | Vařený švestkový (rozinkový) pudink | sladke | předchůdce plum puddingu, vaří se v plátně, bez pece | úplné | 1 lb lojů, 1 lb korintek, 1 lb rozinek, 8 vajec, strouhanka z housky, 1 lb mouky, 1 pint mléka; postup pokračuje na PDF 131 (vařit 5 hodin). Pro tábor vhodné. |
| 216 | To make Peas Soup (kap. XI) | Hrášková polévka se slaninou | polevky | hrách a slané maso, lodní polévka | částečné | 1 quart hrachu, 2 galony vody, kus slaného vepřového nebo hovězího, 2 cibule, bylinky, na konci sušená máta. Čistě táborová polévka. |
| 127 | To make Hodge-podge | Hodge-podge (jehněčí a zeleninový guláš) | z-jednoho-hrnce | dušení v jednom hrnci, levné maso, zelenina | úplné | po 1 lb hovězího, telecího a skopového, 1 oz ječmene, celer, 3 tuřínové, mrkev; dusit 5–6 hodin na mírném ohni. Maso lze zredukovat. |
| 106 | To make a Currey the Indian way | Kuře po indicku (kari) | maso-a-ryby | nejstarší anglický recept na kari | úplné | 2 kuřata, 3 cibule, 2 oz másla, ¼ oz kurkumy, lžíce zázvoru a pepře, ¼ pint smetany, 2 citrony. Podáváno s vařenou rýží (PDF 107). |
| 107 | To make a Pellow the Indian way | Pilaf s kuřetem a slaninou | testoviny-a-ryze | rýže jako jednohrncové jídlo | úplné | 3 lb rýže, ¾ lb másla, koření, 2 kuřata, 2 lb slaniny, vejce a cibule; recept je na velkou mísu, pro 4 porce vydělit zhruba pěti. |
| 134–135 | A Beef Steak Pye | Koláč s hovězími steaky | maso-a-ryby | britská klasika, zapékané maso v těstě | částečné | rump steaky, sůl, pepř, voda do poloviny mísy, těsto bez množství. Dnes by se použilo hovězí na dušení. |
| 45 | To dress Scotch Collops | Skotské kolopsy (telecí plátky v omáčce) | maso-a-ryby | rychlé smažené plátky s omáčkou | částečné | telecí plátky, vejce, máslo, ½ pint vývaru, víno, houby; bílá varianta bez vejce. Množství masa chybí. |
| 152 | To make Pancakes | Palačinky se zázvorem | snidane-a-pecivo | základ palačinek, levné suroviny | částečné | 1 quart mléka, 6–8 vajec, mouka „as much as“ (množství chybí), 2 lžíce zázvoru, brandy, sůl, máslo. Cukr na posyp. |
| 176 | To make a Scotch / Welch Rabbit | Opečený chleba se sýrem (welsh rabbit) | bezmasa | slavné pojmenování, minimum surovin | žádné | chléb, plátek sýra, hořčice. Verze Scotch, Welch a English se liší jen opékáním a vínem. Pro tábor ideální. |
| 202 | To make an Apple Pye | Jablečný koláč s citronem | sladke | základní dezert, levné suroviny | žádné | jablka, cukr „half the sugar“, citronová kůra a šťáva, hřebíček, listové těsto. Množství jablek chybí, odhad. |
| 239–240 | To make Ginger-bread Cakes / Ginger-Bread | Perník (zázvorové placky) | sladke | trvanlivé pečivo na cesty | úplné | 3 lb mouky, 1 lb cukru, 1 lb másla, 2 oz zázvoru, 1 lb melasy, ¼ pint smetany; druhá varianta 3 quarty mouky a 2 lb melasy. |
| 199 | To make Norfolk Dumplings | Norfolkské knedlíčky | prilohy-a-zelenina | těsto z mouky, mléka a vajec vhozené do vody | částečné | ½ pint mléka, 2 vejce, sůl, mouka na hustou kaši; vařit 2–3 minuty, na závěr máslo. Velmi levné. |
| 198 | To make a cheap Rice Pudding | Levný rýžový pudink | sladke | rýže, rozinky, vaří se v plátně | úplné | ¼ lb rýže, ½ lb rozinek, vařit 2 hodiny, na závěr máslo a cukr. Zapečená varianta s 1 quart mléka na stejné straně. |
| 149 | To make an Oatmeal Hasty-pudding | Ovesná kaše (hasty pudding) | snidane-a-pecivo | snídaně na cesty | částečné | 1 quart vody, máslo, sůl, ovesné vločky „do hustoty“; podávat s vínem, pivem nebo smetanou. Nejlépe skotské vločky. |
| 117–118 | To hash cold Mutton | Rozsekané (hash) zbytky skopového | maso-a-ryby | využití zbytků, hash | žádné | zbytky masa, vývar, kousek másla s moukou, topinky. Je to postup, ne recept s množstvím. |

Poznámky:

- Kapitola XI (Captains of Ships) je pro tábor nejzajímavější, ale většina jejích receptů jsou **zásoby** (catchup, sůl, sádlo), ne jídla. Z ní do výběru jde jen pease soup. Pork pudding (216) a Cheshire pork pye (218–219) jsou dobré zálohy, ale s prázdným množstvím.
- Doporučené pořadí podle hodnoty pro aplikaci: Hodge-podge, Peas Soup, Plum Pudding (kvůli úplnému množství a táborové tematice), potom kari a Yorkshire pudding.
- Kuchařka je z 18. století, takže pozor na `verified: false` (množství volná, porce chybí) a na nepřesná slova v OCR, která musí ověřit obrázek.
