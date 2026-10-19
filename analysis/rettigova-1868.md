# M. D. Rettigová, Domácí kuchařka (vydání 1868): analýza textu

Zdroj: `extracted/rettigova-domaci-kucharka/page_NNNN.txt` (485 stran, digitální text e-knihy Městské knihovny v Praze podle 10. vydání, Jar. Pospíšil, Praha 1868, upravila Antonie Dušánková). Strojově vytažené nadpisy: `analysis/rettigova-1868_titles.tsv` (1 085 řádků, `strana<TAB>nadpis`).

**Konvence čísel stran:** číslo souboru `page_NNNN` = tištěná strana (patička) = „strana PDF“ v TSV. Recepty jsou číslované **v každém oddílu znovu od 1**, proto se v tabulce výběru recept identifikuje dvojicí „strana + číslo v oddílu“.

Text je bez OCR chyb, ale s pravopisem 19. století („ouhledně“, „polívka“, „zemčata“, „rejže“) a s ojedinělými chybami převodu (např. „Edo“ místo „Kdo“, „kuthan“ vs. „kuthánek“, „čís.“ s chybami v křížových odkazech).

---

## 1. Struktura knihy

Kniha má 1 112 „samostatných čísel“ podle předmluvy (s. 6). V TSV je jich 1 081 (+ 4 řádky s jídelníčky), součet nejvyšších čísel v oddílech je 1 091. Rozdíl jde na vrub přeskočeným nadpisům při strojovém vytažení (např. oddíl Polívky masité: poslední číslo 55, v TSV 52 řádků; Zadělávaná jídla 94 / 93; Nákypy 82 / 81; Pečené 35 / 34; Cukrovinky 62 / 59) a čísel, která předmluva počítá jinak. Počty v tabulce jsou **podle TSV**; v závorce u odchylek nejvyšší číslo v oddílu.

| Strany | Oddíl (název v knize) | Počet receptů |
|---|---|---|
| 1–5 | Titulní strana, tiráž, obsah | – |
| 6–7 | Předmluva k desátému vydání (1868) | – |
| 8–11 | Úvod (důležité předběžné poučení): nádobí, maso, drůbež, zásoby | – |
| 12–34 | Polívky masité | 52 (55) |
| 35–41 | Příchoutky čili asietky | 14 |
| 42–53 | Hovězí maso a rozličná jeho úprava | 26 (27) |
| 54–61 | Omáčky k hovězímu masu | 27 |
| 62–67 | Naloženiny k hovězímu masu | 11 |
| 68–78 | Smaženiny, pofézky, svítky a kotletky | 29 |
| 79–101 | Zeleniny | 44 |
| 102–145 | Zadělávaná a dušená jídla | 93 (94) |
| 146–160 | Zadělávaná zvěřina | 25 |
| 161–171 | Paštyky | 17 |
| 172–202 | Moučná jídla, obyčejná i jemnější (knedlíky, nudle, kaše, lívance, štrúdle) | 80 |
| 203–208 | Pudingy | 12 |
| 209–243 | Nákypy | 81 (82) |
| 244–256 | Pečené | 34 (35) |
| 257–262 | Saláty | 19 (20) |
| 263–268 | Kompoty | 21 |
| 269–283 | Masité rosoly (huspeniny, Sulzen) | 22 |
| 284–295 | Rybí a postní polívky | 30 |
| 296–322 | Rozličné ryby | 73 |
| 323–327 | Raci, žáby, šneci a mušle | 14 |
| 328–333 | Vejce | 17 |
| 334–346 | Ještě některá postní jídla | 23 |
| 347–374 | Koláče, buchty, rozličné jiné pečivo a pamlsky | 64 |
| 375–377 | Nádivky do koláčů, buchtiček a koblih (povidla, mák, tvaroh, jícha) | 8 |
| 378–381 | Ledy rozličných barev | 13 (12) |
| 382–394 | Dorty | 29 |
| 395–415 | Cukrovinky | 59 (62) |
| 416–431 | Sladké rosoly | 36 |
| 432–438 | Zmrzliny | 20 |
| 439–445 | Nápoje | 20 |
| 446–452 | Ovocní zavařeninky | 20 |
| 453–461 | Zavařené celé ovoce | 17 |
| 462–468 | Ještě některé potřebné přípravy: míšeninky (5), másla (7), octy (6) | 18 |
| 469–476 | Dodatek: domácí zabijačka (jaternice, jelita, klobásy), uzení, nakládání zelí, sušení hub aj. | 13 |
| 476–478 | Domácí rady a lékárnička (popálení, poranění) | v TSV jen č. 13 |
| 479–482 | Příklady jídelníčků (v TSV 4 sloučené řádky, ne recepty) | – |
| 483–485 | Konec, tiráž e-knihy | – |

Poznámky k TSV: řádky s `479–482` jsou jídelníčky se seznamem jídel v jednom řádku, nejsou to recepty. Oddíl „Ledy“ končí číslem 12, v TSV je 13 řádků (jeden duplicitní). Tištěné číslo strany odpovídá souboru 1:1, takže `page_0172.txt` je s. 172.

---

## 2. Formát receptu a jednotky

**Stavba receptu:** číslovaný nadpis („13. Vepřové jitrničky s pivem.“) a jeden souvislý odstavec v rozkazovacím způsobu 2. osoby, bez seznamu surovin. Množství jsou vložená do věty. Varianty mají vlastní číslo („Jiný…“, „na jiný způsob“). Mnoho receptů odkazuje na jiné číslem („dle čísla 46“, „čís. 27, str. 56“) – dohledat při digitalizaci.

**Počet osob:** uveden výjimečně (v nadpisu zhruba u 50 receptů: „pro 6 osob“, „pro 6 i 8 osob“, „pro 12 osob“; u koláčů a knedlíků v textu „pro osm osob“, „stačí pro 8 i 10 osob“). Většina receptů má jen množství surovin, takže výtěžnost se musí odhadnout. Přepočet na 4 porce je proto u většiny receptů jen orientační (`originalYield` vynechat, viz `books.md`).

**Jednotky (četnost v textu: „žejdlík“ 572×, „lot“ 96×, „liber“ málo, ostatní slovně):**

| Jednotka | Význam | Pozn. |
|---|---|---|
| libra | cca 0,56 kg (vídeňská libra 560 g) | „libra masa“, „půl libry rejže“, „čtvrt libry másla“ |
| lot | 1/32 libry, cca 17,5 g | „4 loty másla“ = cca 70 g; „lot lisovaných kvasnic“ = cca 17 g; kniha sama: „na tři lžíce obyčejných kvasnic béře se lot lisovaných“ (s. 347) |
| žejdlík | cca 0,35 l (vídeňský Seidel), u mouky objemově | nejčastější míra tekutin i sypkých („dva žejdlíky mouky“); skutečná velikost je nejistá (0,35–0,5 l) |
| kvint, kvintlík | 1/4 lotu (cca 4 g) | vzácně, hlavně v lékárničce |
| lžíce, vařečka, kávová lžička, lžička | objemové, bez upřesnění | „vařečka“ = větší lžíce na mouku/smetanu („tři vařečky mouky“); „kávová lžička“ = čajová |
| kousek, kus, hrst, špetka | „kousek másla“, „krapýtek soli“, „štipec“, „hrstka“ | „kousek jako půl vejce velký“ (s. 362) |
| kopa | 60 kusů | „s kopy pěkných hlávek zelí“ (s. 475) |
| „dle libosti“, „tolik, aby…“ | bez množství | typické u mouky, strouhanky, soli, koření, tuku |
| „vejce, kolik je osob“ | množství odvozené od počtu strávníků | např. chlebová polévka, s. 19 |

Mouka bývá zadána **na konzistenci** („tolik mouky, aby se těsto nelepilo na ruku“), proto i u receptů s „úplným“ množstvím ostatních surovin chybí přesná mouka.

**Typické archaismy a ekvivalenty:**

| V knize | Dnes |
|---|---|
| zemčata, zemčátka | brambory |
| žemlička (žemle) | houska (starší, na strouhání i na kostky) |
| polívka | polévka |
| rejže, rejžová krupice | rýže |
| kaprle, kaprlí | kapary |
| sardele, sardelové máslo | ančovičky, ančovičková pasta |
| nové koření | nové koření (pimentu), „celé pepře“ = kuličky pepře |
| květ | muškátový květ (macis), „okořeň květem“ |
| dymián, dymiánová míšeninka | tymián, směs bylin se solí |
| jíška / jištička (bílá, bledá, hnědá) | jíška |
| kverlat, rozkloktat | šlehat metličkou |
| kuthan, kuthánek, rendlík, kastrol, fortna | pekáč/pánev, malý hrnec, forma |
| kejta | kus masa (hovězí plec, vepřová kýta/„kejta“ jako sekaná podle kontextu) |
| svítek | pečená hmota z vajec a žemle (druh nákypu) |
| štrudle, lité štrudle | závin / palačinky |
| šlejšky | váleček z těsta (šišky) |
| kvasnice (obyčejné, lisované) | čerstvé droždí (lisované), tekuté pivní kvasnice |
| tvaroh, „ustrouhaný tvaroh“ | tvaroh (suchý tvaroh strouhaný) |
| homolka, strouhaná homolka | kuželový kus cukru |
| loj, morek, přepouštěné máslo | hovězí lůj / kostní dřeň, přepuštěné máslo |
| mléčí, hříbky | rybí mlíčí, hříbky |
| kvíčaly, špaňhelské ptáčky | drozdi, závitky (španělští ptáčci) |
| sultánky, hrozinky | rozinky |

**Tři krátké citace jako příklad stylu:**

> „Vepřové jitrničky s pivem. Usekej libru vepřového libového masa, osol ho a podej k němu dle libosti tlučeného pepře, pak dělej z toho malé jitrničky, obal je ve strouhané žemličce a vlož je na máslem vymazaný rendlík; když jsou na jedné straně červené, obrať je na druhou stranu a podlévej je po troškách pivem.“ (s. 40, č. 13)

> „Polívka se zemčaty na jiný způsob. Pro 6 osob oloupej 12 prostředních zemčat, rozkrájej je na lístky a nech je buď na rozkrájeném hovězím loji nebo na čerstvém másle s rozkrájenou cibulkou hezky do zlatová usmažit; potom na ně nalej 4 žejdlíky dobré hovězí polívky…“ (s. 23, č. 28)

> „Čočka. Přeber a vyper pěknou velkou čočku, dej ji do hrnku, nalej na ni měkkou vodu, osol ji a nech ji do měkká uvařit. Nakrájej drobně cibulku a nech ji na másle do zlatova uškvařit…“ (s. 101, č. 44)

---

## 3. Výběr 26 receptů

Kritéria v pořadí: (a) klasická česká jídla, (b) levné a vydatné, (c) proveditelné doma nebo na táboře, (d) aspoň přibližné množství. Každý kandidát měl přečtenou svou stranu. Sloupec „Množství“: **úplné** = všechny hlavní suroviny mají míru (mouka/sůl „dle libosti“ se nepočítá); **částečné** = míra jen u části surovin; **žádné** = bez měr.

Důležité zjištění: v knize **nejsou** guláš, perkelt, bramborák, kulajda, zelňačka, škubánky, kuba ani trhanec (hledáno v celém textu: guláš, perkelt, škubánky, bramborák, kulajda se nevyskytují vůbec; „kroupy“ a „jáhly“ se objevují jen na několika málo stranách, např. s. 11, 50, 470, 473). Klasika je zastoupena **knedlíky, svíčkovou (marinovaná pečeně s kyselou smetanou), kaprem na černo, kysaným zelím s uzeným, čočkou, hrachem, koláči, vánočkou, švestkovými knedlíky, žemlovkou**. Bramborové pokrmy jsou „zemčata“.

Dvojice „strana + č.“ = číslo v oddílu. Kapitola = kapitola aplikace.

### Polévky

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 19 (č. 19) | Polívka chlebová | Chlebová polévka s vejcem a cibulkou | polévky | Levná, ze starého chleba a vajec, 5 surovin | žádné (vejce „kolik osob“, chléb a vývar bez míry) | Základ je hovězí vývar; na táboře nahradit kostkou/vodou. Vejce se vaří ve vývaru jako na měkko. |
| 23 (č. 28) | Polívka se zemčaty na jiný způsob | Bramborová polévka se smaženými bramborovými plátky | polévky | Bramborová polévka, jasná doména české kuchyně, „pro 6 osob“ | úplné (12 brambor, 4 žejdlíky vývaru, 2 lžíce mouky) | Přepočet na 4 porce = 8 brambor, ~2,7 žejdlíku. Uvedena jen cibulka „rozkrájená“, bez množství. |
| 293 (č. 26) | Zemčatová polívka (postní) | Postní bramborová polévka s kořenovou zeleninou | polévky | Bez masa, 4 brambory, celer, petržel, jíška | částečné (4 velké brambory, kávová lžička celeru a petržele) | Voda není změřená; množství tekutiny nutno odhadnout („dostatečně“). |
| 291 (č. 19) | Hrachová polívka | Hrachová polévka s opraženou žemlí | polévky | Klasika, levná, pokrm z hrachu (sušený hrách, bez masa) | žádné | Doplnit z č. 53 na s. 32 (masitý variant: půl žejdlíku hrachu). Postní, vařený na „petruželové vodě“. |
| 292 (č. 23) | Pivní polívka s chlebem („gramatyka“) | Pivní polévka s chlebem (žebrácká) | polévky | Kniha uvádí „žebrácká polívka“ (varianta s vodou), vydatná z chleba, piva a vajec | úplné (půl hrnku chleba, 3 vejce, 3 loty másla, 2 loty cukru, půl žejdlíku smetany) | Pivo množství „nalej studeného piva“ bez míry; kyselá smetana, cukr: dnes nezvyklá sladkokyselá chuť. Variantní č. 22 má 3 žejdlíky piva. |
| 15 (č. 9) | Polívka s jaternými knedlíčky | Vývar s játrovými knedlíčky | polévky | Ikonická česká zavářka, levná játra | úplné (půl libry jater, 4 loty tuku, 2 vejce + 2 žloutky, česnek, majoránka) | Strouhaná žemle „tolik, aby…“; hovězí tuk (morek) lze nahradit sádlem. Vařit asi 10 minut. |

### Z jednoho hrnce

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 133 (č. 72) | Vepřové maso na pivě | Vepřové na pivě | z jednoho hrnce | Jeden hrnec, levné maso, pivo, česnek | částečné (2 libry masa, 2 žejdlíky piva, kávová lžička mouky, 2 stroužky česneku) | Strouhaná chlebová střída „tolik, aby…“; kniha dodává „takto se může též klobása připravit“. 2 libry = cca 1,1 kg na 6 osob. |
| 99 (č. 40) | Kyselé zelí pečené | Zapečené kysané zelí s uzeným a vepřovým (pro 8 osob) | z jednoho hrnce | Vepřo-zelo, vrstvené, vydatné | úplné (pro 8 osob: ¼ libry sádla, lžíce mouky, libra vepřového, libra uzeného, 4 lžíce zelné vody, 4 lžíce smetany) | Dobrý příklad s úplným množstvím a počtem osob. Přepočet na 4 porce = polovina. Vyžaduje troubu (nebo lze dusit). Číslo 39 (s. 99): zelí s vepřovou pečínkou (žádná množství). |
| 194 (č. 60) | Rejže s uzeným masem | Zapečená rýže s uzeninou | z jednoho hrnce | Rýže + uzenina, levné, vydatné | úplné (půl libry rýže, půl libry uzeniny, 6 žloutků, smetana) | Hříbky volitelně. Smetana na vaření rýže bez míry. Peče se hodinu zvolna; lze na táboře zjednodušit (bez žloutků, dusit). |

### Maso a ryby

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 44–45 (č. 6) | Tak nazvaná svíčková pečeně (Lungenbraten) | Hovězí pečeně na kyselo se smetanou (předchůdce svíčkové) | maso a ryby | Ikona české kuchyně; marinovaná v octě, polévaná kyselou smetanou | částečné (4 libry masa, 2 žejdlíky vinného octa, 12 zrnek pepře, 4 kousky zázvoru, 3 libry másla jako „tři krty“) | **Není dnešní svíčková na smetaně**: je to maso naložené 3–4 dny v octovém láku, pečené a polévané smetanou. Omáčka a knedlík se tu nezmiňují (č. 7–8 na s. 45 jsou varianty). Číslo je na s. 44 (odstavec pokračuje na s. 45); TSV nadpis č. 6 chybí (řádek není vytažen). |
| 44 (č. 5) | Sekané řízky z hovězího masa | Hovězí sekané řízky (karbanátky) s bramborovou kaší | maso a ryby | Levné, jedna pánev | částečné (2 libry masa, sůl, pepř, petržel, mouka) | Cibule bez množství; podávají se s „věncem ze zemčátkové kaše“. |
| 40 (č. 13) | Vepřové jitrničky s pivem | Vepřové masové placky/jitrničky s pivem | maso a ryby | Libra masa, pepř, strouhanka, pivo; velmi jednoduché | částečné (1 libra vepřového, sůl, pepř „dle libosti“) | Název „jitrničky“ je zavádějící (nejde o střívko, ale o malé sekané placky). Pivo bez míry. Jedna pánev. |
| 296 (č. 1) | Kapr na černo | Kapr na černo (pivo, perník, ořechy) | maso a ryby | České vánoční klasika, jeden hrnec | částečné (½ žejdlíku octa, pivo „až se zatopí“, kousek perníku, cukr) | Potřeba krev z kapra, perník, 24 vlašských ořechů (č. 2). Dnes se vynechává krev. Další číslo 7 (s. 299) smažený kapr: bez míry, jen postup (mouka, vejce, strouhanka). |
| 299 (č. 7) | Kapr smažený | Smažený kapr | maso a ryby | Nejznámější způsob, bez složitých surovin | žádné (jen postup) | Sůl na půl hodiny, obalování v mouce, vejci, strouhance, smaží se v másle. Hodí se i na štiku, okouna. |

### Bez masa

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 101 (č. 44) | Čočka | Čočka na cibulce | bez masa | Nejlevnější bílkovina, 3 suroviny | žádné | K ní „smažená telecí játra“ nebo vemeno (vynechat). Bez octa, bez zelené. Čočka namočená? Kniha nezmiňuje. |
| 101 (č. 43) | Hrách promačkaný | Hrachová kaše s cibulkou | bez masa | Hrách, cibulka, sádlo – nejlevnější | žádné | Podávána se smaženými uzenkami nebo kotletkami (č. 27, s. 77). Hrách není namáčen v textu. |
| 345 (č. 22) | Zemčata a vejcemi | Zapečené brambory s vejci | bez masa | Brambory, vejce, mléko; levné | částečné (6 vajec, žejdlík mléka, 2 žloutky, pepř, máslo) | Počet brambor není uveden („malá zemčátka“); odhad 1 kg. Zapéká se v troubě; na táboře v hrnci s víkem. |
| 343 (č. 17) | Houbovec | Houbový nákyp (hříbky) | bez masa | Houby jako symbol české kuchyně | částečné (3 žloutky, 2 lžíce mouky, půl žejdlíku smetany, 2 loty másla) | Množství hub není uvedeno („hříbky“). Smetana, 3+3 žloutky a 2 bílky; dnes těžší. Vyžaduje troubu. |

### Přílohy a zelenina

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 172 (č. 1) | Moučné knedlíky | Houskové knedlíky (smažená žemle, máslo, vejce) | přílohy a zelenina | Knedlík je nejtypičtější česká příloha | částečné (6 vajec, 1 žemle, mouka „tolik, aby se nelepilo“, máslo, smetana lžičkou) | **Velmi bohaté** (máslo, 6 vajec). Kniha je doporučuje „k černé rybě“. Počet kusů není uveden. Č. 2 (s. 172) varianta s 4 žloutky, 2 žejdlíky mouky a čtvrt libry másla. |
| 172–173 (č. 3) | Knedlíky se slaninou (špekem) | Špekové knedlíky s uzeným masem | přílohy a zelenina | Vydatné, ze žemle, špeku, uzeného | částečné (půl libry slaniny, 2 žemle, 4 vejce + 4 žloutky, půl libry uzeného) | Mouka „tolik, co je zapotřebí“. Vaří se v „polívce z uzeného“. Pokračuje na s. 173. |
| 174 (č. 7) | Zemčatové knedlíky | Bramborové knedlíky (se strouhanými brambory a krupicí) | přílohy a zelenina | Bramborové, ikonické | částečné (libra strouhaných brambor, 4 loty másla, 2 vejce + 2 žloutky, krupice „tolik, aby…“) | Č. 8 (s. 174) je lepší: z 8 vařených brambor se žejdlíkem krupice a 3 vejci (úplné množství). Kniha radí hnětení za horka; krupice „velká suchá“ = hrubá. |
| 261 (č. 18) | Obyčejný zemčatový salát se slanečkem | Bramborový salát se slanečkem | přílohy a zelenina | Levný, studený | žádné | Počet brambor a cibule neuveden; „jedna velká cibule, dvě vejce“. Slanečka lze nahradit; olej + ocet bez míry. |

### Snídaně a pečivo

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 347–348 (č. 1) + 375 (č. 1–3) | České koláče + Nádivky: povidla, mák, tvaroh | České koláčky s povidly, mákem, tvarohem | snídaně a pečivo | Nejklasičtější české pečivo | úplné (1 libra mouky, 12 lotů másla, 6 žloutků, 1,5 lotu droždí, ¼ žejdlíku mléka, lžíce cukru, 4 bílky) | Těsto kvasnicové, náročné; nádivky bez míry (povidla, mák „dle libosti“, tvaroh: na libru 3 žloutky + 3 vejce). Doporučit s. 375 jako samostatný návrh. Hodně másla. |
| 356 (č. 21) | Vánočka | Vánočka (pletená, s rozinkami a mandlemi) | snídaně a pečivo | Ikona | úplné (4 žejdlíky mouky, 10 lotů másla, 6 lotů cukru, 2 loty droždí, ¼ libry rozinek, ¼ libry mandlí, mléko) | Počet vajec není uveden (jen na potření). Pletení z 9 dílů. Doba pečení hodina; kniha radí dělat dvě menší. |
| 199 (č. 73) | Pražená kaše | Opražená krupicová kaše s máslem | snídaně a pečivo | Snídaně z krupice, 3 suroviny | úplné (půl libry krupice, 4 loty másla, slaná voda „tolik, až se utvoří hustá kaše“) | Navrch sázená vejce. Množství vody není uvedeno; dnes se podává i sladká. |

### Sladké

| Str. | Nadpis v knize | Moderní název | Kapitola | Proč | Množství | Poznámka |
|---|---|---|---|---|---|---|
| 173 (č. 5) | Švestkové knedlíky | Tvarohové švestkové knedlíky | sladké | Ikona české kuchyně | částečné (4 loty másla, 4 vejce + 2 žloutky, žejdlík mléka, čtvrt libry tvarohu; mouka „tuhé těsto“; švestky bez počtu) | Těsto tvarohové s mlékem, bez brambor. Posyp tvarohem nebo perníkem s cukrem; máslo. Č. 6 s kvasnicemi. |
| 184 (č. 34) | Žemlovka a hrozinkami | Žemlovka s rozinkami | sladké | Ze starých žemlí, levné, tradiční | částečné (2 vejce, sladká smetana, cukr, hrozinky, pomerančová kůra „dle libosti“) | Počet žemlí a množství cukru nejsou uvedeny. Jablka v č. 31 (s. 183). |
| 183 (č. 31) | Smaženec chlebový | Jablečný nákyp z chleba (vrstvený) | sladké | Levné; „i nejtvrdšího chleba“ | částečné (půl druhého žejdlíku strouhané střídy, 8–10 jablek, cukr se skořicí, máslo) | Pečený v troubě. Sladké, zbytky chleba. Kniha výslovně radí použít tvrdý chléb. |

**Celkem 26 záznamů** (6 polévek, 3 z jednoho hrnce, 5 maso a ryby, 4 bez masa, 4 přílohy a zelenina, 3 pečivo, 3 sladké; u knedlíků a koláčů jsou sdruženy varianty).

**Rezerva (nezařazeno, ale vhodné při potřebě doplnit):** s. 32 č. 53 hrachová polévka (půl žejdlíku hrachu, částečné), s. 290 č. 18 čočková polévka, s. 176 č. 13 tvarohové knedlíky (půl libry tvarohu, částečné), s. 174 č. 8 zemčatové knedlíky na jiný způsob (úplné), s. 188 č. 44 válená štrudle s jablky (úplné), s. 193 č. 57 kraple s povidly (knedlíčky, částečné), s. 197 č. 67 zelné svítky (placky se zelím), s. 49 č. 16 roštěnec s kyselou smetanou (žádné množství), s. 362 č. 36 laciné rohlíčky ku kávě (úplné), s. 352 č. 11 koláč se švestkami (úplné), s. 475 č. 10 nakládání zelí (úplné sůl a kmín, počet hlávek „kopa“), s. 469 č. 1 jaternice, jelita, klobásy (podíly: 2 díly masa : 1 díl žemle).

---

## 4. Problémy a rizika

- **Chybějící porce:** počet osob se uvádí jen u zhruba 50 z 1 081 receptů. Výtěžnost nutno odhadnout (např. podle množství mouky/masa) a `originalYield` vynechat, jak určuje `books.md`. Pokud je „pro 6 osob“ (č. 28 s. 23, č. 40 s. 99), přepočet na 4 porce je jednoduchý.
- **Nejasné míry žejdlíku:** 572 výskytů. Žejdlík = 0,35 l (vídeňský) nebo 0,5 l; u mouky se měří objemově (2 žejdlíky mouky ≈ 250–280 g). Doporučení: 1 žejdlík = 0,35 l a u mouky ≈ 125 g na žejdlík; označit `verified: false`.
- **Lot a libra:** přepočet 1 lot = 17,5 g, 1 libra = 560 g (rozdíl proti 500 g je 12 %). Vše označit jako přibližné.
- **Mouka a strouhanka „tolik, aby…“:** téměř všechny knedlíky, těsta a zahušťování. Při digitalizaci doplnit odhadem (např. houskové knedlíky ≈ 300–400 g mouky na 6 vajec) a poznamenat do `note`.
- **Obrovské množství másla a vajec:** (6 vajec do knedlíku, 12 lotů másla na koláče, 10–12 žloutků do těsta). Nesplňuje motto „levné“; u vybraných receptů zmínit možnost redukce, ale text nepřepisovat.
- **Nemoderní postupy bez udání teploty:** pečení „v troubě“, „zvolna“, „v rozpálené troubě“; doba nepřesná. Na táboře lze troubu nahradit víkem s žárem shora (hrnec s víkem a uhlíky).
- **Odkazy na jiná čísla:** („dle čísla 46“, „čís. 27“, „viz mezi míšeninkami“) – hlavně nádivky (s. 375), omáčky, polévky. Mohou odkazovat do jiného oddílu a číslo se opakuje, proto nutno zadávat se stranou.
- **Základ jsou masité vývary:** mnoho polévek a omáček stojí na hovězím vývaru, který se vaří dlouho (3 hodiny); na táboře náhrada kostkou nebo vodou.
- **Surovin dnes málo běžných nebo problematických:** hovězí lůj a morek (náhrada sádlo), krev (kapr na černo, krvavé jelito), vemeno, mozeček, plíce, drůbky, kaprle (kapary), sardele, rakouské víno, muškátový květ, homolka cukru, vinný ocet ve velkých množstvích, **perník** jako zahušťovadlo, vlašské ořechy v omáčce, šneci, raci, ústřice, lanýže, želva (nevybráno).
- **Kvasnice:** „obyčejné kvasnice“ (tekuté, pivní) vs. „lisované“ (droždí); kniha dává poměr 3 lžíce obyčejných = 1 lot lisovaných (~17 g čerstvého droždí). Dnešní droždí je silnější; 1 lot ≈ půl kostky (21 g) je rozumný odhad.
- **Pojmy s měnícím se významem:** „svíčková“ (Lungenbraten, marinovaná pečeně), „jitrničky“ (placky), „kejta“ (kus masa i nádivka tvaru kejty), „kaše“ (hustá hmota), „svítek“ (nákyp), „štrudle“ (palačinky i závin), „krupice“ (krupice i rýžová krupice), „kroupy“. Při modernizaci je potřeba ověřit proti kontextu a nepřejímat dnešní význam.
- **Bezpečnost:** domácí zabijačka (s. 469–470), uzení se salnýtrem (s. 470, „lot salitru na libru soli“) a sušení hub (s. 473) nejsou bezpečné bez znalostí; nezařazeno, a pokud ano, pak jen s poznámkou. Kniha varuje před záměnou hub („při kupování hub zvláštní opatrnost“, s. 473) i bylinek (s. 9).
- **Chybějící obvyklá česká jídla:** guláš, bramborák, kulajda, zelňačka, škubánky, kuba, trhanec nejsou v textu vůbec; nelze je z této knihy digitalizovat. Nejbližší: kyselé zelí s uzeným (s. 99), pražená krupicová kaše (s. 199), polévka z hrachu (s. 291), moučné knedlíky (s. 172).
- **Chyby textu (OCR/převod):** TSV vynechává některé nadpisy (např. č. 6 svíčková na s. 44, č. 27 polévka se zemčaty na s. 23, č. 26 zemčatová polévka na s. 293 a další); řádky 479–482 jsou jídelníčky v jednom řádku. Chyby v textu jako „Edo“ = „Kdo“, „ná níž“, „kapusta“ = zelí/kapusta, rozdělená slova přes řádek.
