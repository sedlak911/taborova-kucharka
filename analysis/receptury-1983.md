# Receptury teplých pokrmů (MO ČSR, 4. vydání 1983): analýza textu

Zdroj: `docs/Receptury teplých pokrmů.pdf` (648 PDF stran), OCR po stranách v `extracted/receptury-teplych-pokrmu-1983/page_NNNN.txt` (2,7 mil. znaků), strojově vytažené nadpisy v `analysis/receptury-1983_titles.tsv`.

**Konvence čísel stran:** všude níže je „str.“ = **číslo PDF strany** (shodné s `page_NNNN.txt` a se sloupcem 1 v TSV). Tištěné číslo je jiné, viz sekce 2.

Titulní list uvádí „Merkur Praha 1986“, předmluva „4. vydání“ (soubor shrnuje vydání 1976, 1979, 1983). Závaznost podle ceníků MC-7/71/1982 a MC-7/69/1982.

---

## 1. Struktura knihy

Úvod: str. 2 předmluva, 3–5 seznam novinek 4. vydání (**duplicitní nadpisy v TSV na str. 3–6 ignorovat**), 6–19 „Seznam receptur“ (tištěný obsah, dvousloupcový, OCR se sloupci míchá). Vlastní receptury str. 20–610, pak konzervy a normy.

První 3 číslice kódu = skupina, 4.–5. číslice = pořadí; písmenná varianta (`/A`, `/B`…) = jiná hmotnost/suroviny/úprava. První dvě číslice 10–19 dělí dle kapitol:

| Kapitola | Prefix | Skupina | Str. PDF | Počet kódů v TSV (vč. variant / základních) |
|---|---|---|---|---|
| Polévky (předěl str. 20) | 101 | Bílé polévky | 21–48 | 47 / 45 (+10101 Vývar B chybí v TSV, je na str. 21) |
| | 102 | Hnědé polévky | 49–66 | 36 / 31 |
| | 103 | Přesnídávkové masité polévky | 67–74 | 15 / 13 |
| | 104 | Zdravotní polévky | 75–79 | 8 / 8 |
| Hovězí | 110 | Pečené hovězí | 81–92 | 23 / 21 |
| | 111 | Dušené hovězí | 93–122 | 58 / 43 |
| | 113 | Vařené hovězí | 123 | 3 |
| | 115 | Hovězí droby | 124–130 | 13 |
| | 116 | Minutky z hovězího | 131–138 | 16 |
| | 117 | Zdravotní pokrmy z hovězího | 139 | 2 |
| Telecí | 120 | Pečené telecí | 141–148 | 15 / 12 |
| | 121 | Dušené telecí | 149–158 | 17 |
| | 122 | Smažené telecí | 159–160 | 4 |
| | 123 | Vařené telecí | 161 | 1 |
| | 125 | Telecí droby | 163–175 | 26 / 25 |
| | 126 | Minutky z telecího | 176–185 | 18 / 17 |
| | 127 | Zdravotní pokrmy z telecího | 186–188 | 6 |
| Vepřové | 130 | Pečené vepřové | 190–199 | 20 / 16 |
| | 131 | Dušené vepřové | 200–222 | 43 / 41 |
| | 132 | Smažené vepřové | 223–224 | 3 / 2 |
| | 133 | Vařené vepřové | 225–226 | 3 |
| | 134 | Uzené vepřové | 227–233 | 16 / 11 |
| | 135 | Vepřové droby | 234–240 | 13 |
| | 136 | Minutky z vepřového | 241–251 | 21 |
| Skopové / kůzlečí | 140 | Skopové zadní | 254–260 | 12 / 6 |
| | 141 | Skopové přední | 261–268 | 15 |
| | 142 | Kůzle nebo jehně | 269–272 | 6 |
| | 147 | Zdravotní z kůzlečího | 273–274 | 2 |
| Mleté maso, uzeniny, italská | 151 | Hovězí mleté | 278 | 2 |
| | 152 | Telecí mleté | 279–283 | 3 |
| | 153 | Vepřové mleté (jelita, jitrnice, prejty) | 284–293 | 16 / 13 |
| | 154 | Směsi mletého masa (sekané, karbanátky, plněné) | 294–307 | 20 |
| | 155 | Uzeniny / pokrmy s použitím uzenin | 308–310 | 5 |
| | 156 | Pokrmy italské kuchyně | 312–315 | 7 |
| | 157 | Zdravotní ze sekaného masa | 316–317 | 3 |
| Zvěřina (předěl str. 318) | 160 | Srnec | 319–325 | 12 / 6 |
| | 161 | Daněk a jelen | 326–328 | 4 |
| | 162 | Zajíc | 329–332 | 5 / 4 |
| | 164 | Divoký kanec | 333–335 | 4 |
| | 166 | Bažant | 336–337 | 4 |
| | 168 | Divoká husa nebo kachna | 338–339 | 3 |
| Drůbež | 170 | Kuře | 345–366 | 39 / 38 |
| | 171 | Slepice | 367–368 | 4 |
| | 172 | Husa | 369–372 | 4 / 3 |
| | 173 | Kachna | 374 | 1 |
| | 174 | Drůbeží droby | 375–381 | 10 |
| | 175 | Krůta | 382–384 | 3 |
| | 176 | Holub | 385 | 1 |
| | 177 | Lehké zdravotní z drůbeže | 386–388 | 5 / 4 |
| | 179 | Ostatní z drůbeže | 389 | 2 |
| Ryby (předěl str. 390) | 180 | Ryby sladkovodní (kapr) | 391–404 | 26 / 24 |
| | 181 | Ryby sladkovodní (štika, candát, pstruh…) | 405–416 | 24 / 14 |
| | 182 | Ryby mořské (filé) | 417–422 | 11 |
| | 183 | Ryby mořské (losos, treska, sleď…) | 422–430 | 18 |
| | 184 | Ryby mořské (aljašská treska) | 431–441 | 21 |
| | 187 | Lehké zdravotní z ryb sladkovodních | 442–446 | 9 / 3 |
| Bezmasé pokrmy (předěl str. 447) | 190 | Omáčky | 448–453 | 14 |
| | 191 | Zeleninové pokrmy | 454–471 | 38 |
| | 192 | Vaječné pokrmy | 472–484 | 31 / 30 |
| | 193 | Luštěninové pokrmy | 486–488 | 6 / 5 |
| | 194 | Ostatní bezmasé (brambory, těstoviny, houby, sýr, rýže) | 490–518 | 62 / 58 |
| Moučníky (předěl str. 519) | 195 | Moučníky (menší porce, dezert / přesnídávka) | 520–543 | 58 / 51 |
| Moučné pokrmy (předěl str. 544) | 196 | Moučné pokrmy (porce jako hlavní jídlo, 300–360 g) | 545–561 | 31 / 24 (rozsah v TSV 520 je chyba, to jsou odkazy) |
| Přílohy (předěl str. 562) | 199 | Přílohy k pokrmům (brambory, knedlíky, těstoviny, rýže, zelenina, saláty, másla, svítky) | 563–610 | 131 / 77 |
| Konzervy | 25xx | Pokrmy s použitím masových konzerv (kódy tohoto bloku OCR nepřečetl) | 611–624 | nezjištěno |
| Normy (nerecepty) | | ČSN 58 3601 (společná ustanovení), ON 58 8171 (maso dělené pro kuchařské účely), ČSN 57 3099 (zabitá hydina), tabulky | 625–648 | 0 |

Součty: v TSV po vyloučení str. <20 je **1 099 unikátních kódů, 944 základních** (bez písmenné varianty), reálně o desítky víc (TSV nezachytilo např. 10101 a 19607). Čísla jsou dolní odhad: OCR nadpisy s předponou nebo bez pomlčky TSV minuly.

Pozor na **dvojí podoba stejného pokrmu**: moučníky ve 195 (porce cca 80–200 g, jako zákusek) vs. 196 (porce 300–360 g, hlavní jídlo). Kódy 19513/A, 19523, 19525, 19528 ve 195 jsou často jen odkaz na plný předpis ve 196 (19607/A, 19611, 19625, 19627). Pro digitalizaci brát 196.

---

## 2. Formát receptury a čísla stran

**Hlavička:** `KÓD — NÁZEV [(Minutka)]    10 porcí`, pod ní řádek `1 porce: 0,33 l včetně vložky` (polévky v litrech), `1 porce: 183 g, z toho masa 63 g (4 ks)` (hlavní jídla), `1 porce: 90 g`. Vždy **10 porcí** (výjimka OCR chyby typu „19 porcí“, „A0 porcí“ je 10). Následuje 2–3 řádky senzorický popis hotového pokrmu (barva, vůně, chuť, konzistence).

**Tělo, dvousloupcové:** vlevo „Výrobní postup“ (souvislý text, krátké věty), vpravo tabulka `Druh potravin | hrubá | odpad | čistá` v **g na 10 porcí** (ne na porci). Při délce postupu se sloupce v OCR **prokládají po řádcích** (řádek postupu, řádek tabulky), názvy surovin se trhají. Číslice v tabulce OCR často čte špatně (`7` místo `-`, `M`/`U`/`o` místo `—`, `l`/`I` místo `1`, desetinná čárka jako tečka), proto je nutné čísla ověřit podle součtů nebo obrázku.

**Patička tabulky:** `Hmotnost potravin` (hrubá / odpad / čistá), `Ztráty celkem` (g, ztráta varem a odpad), `Množství hotové polévky` / `Hmotnost hotového výrobku` (g celkem, vydělit 10 = porce), u vývaru `Množství procezeného vývaru: 3 litry`. Pak bývá `Vhodné přílohy:` / `Vhodný doplněk:` (např. houskové knedlíky, těstoviny, dušená rýže, kyselá okurka), často bez čísla receptury.

**Odkazy na jiné receptury:** v tabulce jako řádek suroviny `Vývar B, receptura č. 10101` (3000 g), `Vývar hovězí č. 10201`; v postupu `podle výrobního postupu receptury č. 19607 — DUKÁTOVÉ BUCHTIČKY S VANILKOVÝM KRÉMEM na str. 584` (číslo strany = **tištěné**, ne PDF). Příloha se odkazuje jen názvem; číslo najdeš v 199.

**Značka „(Minutka)“** = pokrm s rychlým dohotovením (hlavně smažené, restované, na roštu); slouží kalkulaci cen, nic neříká o rychlosti pro domácího kuchaře.

**Čísla stran: tištěná vs. PDF.** Každá PDF strana je jedna tištěná strana (v OCR jedna výjimka „right half of spread“), ale tištěné číslo je od PDF vzdálené o rostoucí offset. Tištěné číslo je na konci textu strany (u menších stran někdy chybí). Příčina růstu (3 PDF strany na 2 tištěné? chybějící listy?) není ověřena, offset se zvyšuje po jednotkách zhruba každých 15–25 stran. Ověřené body:

| PDF strana | tištěná | offset | ověřeno |
|---|---|---|---|
| 22 (10103 Selská, 10104 Bramborová) | 28 | +6 | konec `page_0022.txt` |
| 100 (11109/A, 11110/A roštěná) | 108 | +8 | konec `page_0100.txt` |
| 200 (13101 Žebírko, 13102 Segedín) | 215 | +15 | konec `page_0200.txt` |
| 300 (15407 Sarma) | 321 | +21 | konec `page_0300.txt` |
| 400 (18027 Kapr na paprice) | 430 | +30 | konec `page_0400.txt` |
| 500 (19422 Houbové flíčky) | 533 | +33 | konec `page_0500.txt` |
| 600 (19955 Fazolové lusky) | 638 | +38 | konec `page_0600.txt` |

Odhad pro převod: tištěná ≈ PDF + 6 (str. 21–60), +8 (≈100), +15 (≈200), +21 (≈300), +30 (≈400), +33 (≈500), +38 (≈600). Pro odkazy typu „na str. 584“ ber PDF = 584 − (33…37), tj. v tomto případě řešit hledáním kódu v TSV, ne výpočtem. **Pro práci vždy použít TSV (PDF strana), ne offset.**

**Spolehlivost OCR:** text je dobře čitelný (diakritika správná), ale (1) sloupce postupu a tabulky se míchají, (2) názvy mají občasné překlepy (`SKOPOVAÁ`, `KŮÚZLE`, `ČESNEKOVÁ OMÁČKA` bez variant, `Fepř`, `Sadie sk` místo `Sádlo škvařené`), (3) čísla v tabulkách se mylně čtou (viz výše), (4) u hustých stran se sloučí dva recepty a druhý nadpis ztratí kód nebo pomlčku (TSV je tak minulo, např. 10101, 19607), (5) na straně bývají **dvě receptury** (půl strany každá), (6) tištěný obsah (str. 7–19) je nepoužitelný ke strojovému párování. Doporučení: hmotnosti vždy zkontrolovat proti `Hmotnost potravin` a `Množství hotového výrobku` a u každé receptury nahlédnout na PNG (pdftoppm -r 110).

---

## 3. Výběr důležitých receptur

Kritéria: ikonická česká jídla, levné a vydatné, proveditelné doma nebo na táboře. Všechny strany ověřeny v OCR textu (hlavička, porce, odkazy). Pořadí v každé kapitole = doporučená priorita. **P1** = udělat určitě (první kolo), **P2** = další.

### 3.1 Hlavní výběr (28 receptur)

| Str. PDF | Kód | Název v knize | Moderní název | Kapitola | Proč | Závislosti | Poznámka | Pri |
|---|---|---|---|---|---|---|---|---|
| 82 | 11002 | Svíčková na smetaně | Svíčková na smetaně | maso-a-ryby | nejikoničtější jídlo, 213 g porce | houskové knedlíky 19909/A (str. 569), případně brusinky | margarín + smetana; hovězí „na svíčkovou“ je zadek, ne svíčková | P1 |
| 190 | 13001 | Vepřová pečeně | Vepřo knedlo zelo | maso-a-ryby | základ „vepřo“ | houskové nebo bramborové knedlíky 19909/A (569) / 19906 (566), kysané zelí 19920 (584) | OCR nadpis „VEPŘOVÁ PEČENÉ“; v 4. vydání upravená výtěžnost jen u /B, /C | P1 |
| 105 | 11117 | Španělský ptáček | Španělský ptáček | maso-a-ryby | klasika jídelen, 220 g porce | dušená rýže 19912 (579) nebo knedlíky | sádlo, náplň (špek, okurka, vejce) | P1 |
| 224 | 13202 | Smažený vepřový řízek (Minutka) | Smažený vepřový řízek | maso-a-ryby | základ, levné | bramborový salát 19908 (567), vařené brambory 19904 (564) | Minutka, smažení v tuku | P1 |
| 294 | 15401 | Sekaná pečeně | Sekaná pečeně | maso-a-ryby | levná, vydatná, výlet | brambory 19904 (564) nebo kaše 19905/A (565) | rohlíky, sádlo | P1 |
| 391 | 18002 | Kapr smažený (Minutka) | Smažený kapr | maso-a-ryby | ikona, 160 g porce | bramborový salát 19908 (567) | drahá surovina, spíš sezónní | P2 |
| 345 | 17001 | Kuře pečené s nádivkou | Pečené kuře s nádivkou | maso-a-ryby | nedělní klasika, 320 g porce | brambory 19904 (564) | margarín + máslo; hmotnost kuřete dle normy | P2 |
| 93 | 11101 | Hovězí guláš | Hovězí guláš | z-jednoho-hrnce | základ, 183 g porce | houskové knedlíky 19909/A (569), chléb | sádlo, paprika | P1 |
| 200 | 13102 | Segedínský guláš | Segedínský guláš | z-jednoho-hrnce | ikona, 215 g porce | houskové knedlíky 19909/A (569) | kysané zelí kupovat, ne sterilované; smetana | P1 |
| 217 | 13134 | Kotlíkový guláš s nočky | Kotlíkový guláš s noky | z-jednoho-hrnce | kotlík = tábor, 340 g porce | žádná (noky v receptu) | sádlo | P1 |
| 310 | 15505 | Bramborový guláš se salámem | Bramborový guláš se salámem | z-jednoho-hrnce | velmi levný, 345 g | Vývar B 10101 (str. 21) | salám | P1 |
| 232 | 13410 | Francouzské brambory | Francouzské brambory | z-jednoho-hrnce | levné, pekáč, 350 g | žádná (uzená plec se vaří součástí) | uzená vepřová plec rolovaná, smetana, vejce | P1 |
| 488 | 19305 | Šoulet | Šoulet (kroupy s fazolemi) | z-jednoho-hrnce | vydatný, levný | odkazy na luštěniny 19915/19916 (583) | v knize i 17202/A husa v šouletu | P2 |
| 35 | 10129 | Polévka dršťková | Dršťková polévka | polevky | ikona, 0,33 l včetně 32 g drštěk | žádná vývar, sádlo | dršťky kupovat vařené/předvařené; polévkové koření | P1 |
| 46 | 10149 | Polévka kulajda | Kulajda | polevky | ikona | Vývar B 10101 (str. 21) | sádlo, kopr nakládaný, ocet, zastřené vejce | P1 |
| 34 | 10127 | Polévka čočková kyselá s brambory | Čočková na kyselo | polevky | levná, vydatná | Vývar B 10101 (21) | polévkové koření | P1 |
| 22 | 10104 | Polévka bramborová | Bramboračka | polevky | základ | Vývar B 10101 (21) | sušené houby, polévkové koření 20 g, kmín, majoránka | P1 |
| 36 | 10130 | Polévka gulášová | Gulášová polévka | polevky | tábor, vydatná | Vývar B 10101 (21) | 20 g masa/porci | P2 |
| 53 | 10210/A | Polévka česneková s osmaženým chlebem | Česnečka s krutony | polevky | levná, ikona | Vývar hovězí 10201 (str. 49) | polévkové koření; OCR hlavička na str. 53 sdílí 10210, /A, /B | P2 |
| 448 | 19001 | Koprová omáčka | Koprovka | bezmasa | ikona; k vejcím/knedlíkům | Vývar B 10101 (21); knedlíky 19909 (569) | margarín + máslo + smetana; 19474 (str. 515) je totéž s knedlíky jako hotové jídlo | P1 |
| 492 | 19406 | Bramborák | Bramborák | bezmasa | ikona, 90 g porce | žádná | sádlo; 19406/A se škvarky (493) | P1 |
| 507 | 19440 | Smažený sýr (Minutka) | Smažený sýr | bezmasa | ikona, 140 g (2 plátky) | hranolky 19901 (563) nebo vařené brambory 19904 (564) | tatarka/majonéza není v receptu | P1 |
| 486 | 19302 | Čočka se sázeným vejcem | Čočka na kyselo s vejcem | bezmasa | levná, ikona, 300 g | sázené vejce 19221 (480) | sádlo; příloha může být okurka | P1 |
| 461 | 19116 | Lečo s vejci (Minutka) | Lečo s vejci | bezmasa | levné, sezónní | brambory/chléb | 170 g porce | P2 |
| 566 | 19906 | Bramborové knedlíky | Bramborové knedlíky | prilohy-a-zelenina | základ příloh | žádná (i varianta z přípravku 19906/B) | bez sádla; maštěné varianty /C /D | P1 |
| 569 | 19909/A | Houskové knedlíky maštěné máslem | Houskové knedlíky | prilohy-a-zelenina | k omáčkám, 165 g porce | žádná | /B se sádlem; /C kynuté | P1 |
| 584 | 19920 | Kysané zelí | Dušené kysané zelí | prilohy-a-zelenina | k vepřo, guláši | žádná | sádlo; 19921 hlávkové zelí hned vedle | P1 |
| 565 | 19905/A | Bramborová kaše | Bramborová kaše | prilohy-a-zelenina | základ příloh | žádná | máslo; /B bez másla | P2 |
| 567 | 19908 | Bramborový salát | Bramborový salát | prilohy-a-zelenina | k řízku a kaprovi, 200 g | žádná | 19908/A znojemský (str. 568) | P2 |
| 315 | 15608 | Špagety s vepřovým masem a rajčaty | Špagety s masovou omáčkou | testoviny-a-ryze | 420 g porce | těstoviny jsou součástí | sýr; 15606 boloňské je jinde | P1 |
| 208 | 13115 | Rizoto z vepřového masa | Vepřové rizoto | testoviny-a-ryze | rizoto, 280 g | rýže součástí | sýr | P1 |
| 491 | 19403 | Makarony po pražsku | Zapečené makarony | testoviny-a-ryze | levné, 300 g | žádná | margarín, sýr | P2 |
| 579 | 19912 | Rýže dušená | Dušená rýže | testoviny-a-ryze | příloha ke guláši, ptáčkům | žádná | varianty /A–/K (hrášková, kari…) str. 579–582 | P2 |
| 549 | 19607/A | Dukátové buchtičky se šodó | Buchtičky se šodó | sladke | ikona, 300 g porce | základ těsta z 19607 (str. 548, kde OCR ztratilo hlavičku) | šodó z bílého vína, žloutků | P1 |
| 522 | 19506 | Palačinky se zavařeninou | Palačinky se zavařeninou | sladke | základ, 100 g (2 ks) | žádná | margarín; 196 verze 19605 je na str. 547 | P1 |
| 552 | 19611 | Švestkové knedlíky | Ovocné knedlíky | sladke | ikona, 340 g | žádná | sypání a maštění v hmotnosti; /A z přípravku | P1 |
| 514 | 19471 | Jablková žemlovka | Žemlovka | sladke | levná, 300 g | žádná | máslo; verze v 195: 19504 (521), v 196: 19603 (546) | P1 |
| 554 | 19612 | Kynuté knedlíky s povidly | Kynuté knedlíky s povidly | sladke | ikona | žádná | povidla koupit | P2 |
| 560 | 19625 | Bramborové šišky s houskou | Bramborové šišky | sladke | levné, 360 g | žádná | /bez housky 19525 (528) | P2 |
| 561 | 19627 | Rýžová kaše s máslem | Rýžová kaše | sladke | 360 g | žádná | levné | P2 |

Poznámka k počtu: tabulka má 38 řádků. **P1 = 27 receptur** (první kolo, kolem 25 podle zadání), P2 = 11 jako rezerva. Přílohy (knedlíky, zelí, brambory, kaše, salát, rýže) jsou závislosti nad hlavními jídly, takže je potřeba digitalizovat s nimi.

### 3.2 Pokrytí kapitol

| Kapitola | P1 | P2 |
|---|---|---|
| polevky | 10129, 10149, 10127, 10104 | 10130, 10210/A |
| z-jednoho-hrnce | 11101, 13102, 13134, 15505, 13410 | 19305 |
| maso-a-ryby | 11002, 13001, 11117, 13202, 15401 | 18002, 17001 |
| bezmasa | 19001, 19406, 19440, 19302 | 19116 |
| prilohy-a-zelenina | 19906, 19909/A, 19920 | 19905/A, 19908 |
| testoviny-a-ryze | 15608, 13115 | 19403, 19912 |
| sladke | 19607/A, 19506, 19611, 19471 | 19612, 19625, 19627 |

### 3.3 Vazby pro dávky

- Polévky 10104, 10127, 10130, 10149 + bramborový guláš 15505 + omáčka 19001 + čočka na kyselo: všechny potřebují **Vývar B 10101 (str. 21)**; udělat ten jako první. Česnečka 10210/A potřebuje **Vývar hovězí 10201 (str. 49)**.
- Svíčková, guláše, vepřo, koprovka: společné přílohy **19909/A, 19906, 19920**.
- Řízek, kapr, sýr: společné přílohy **19908, 19904, 19901**.

---

## 4. Problémy a rizika

1. **Odkazy na jiné receptury.** Téměř každá polévka vyžaduje Vývar B 10101 (3 l z kostí, 3 h varu; 1 porce polévky = 250–300 ml vývaru) nebo hovězí 10201. Řešení: v aplikaci buď vložit vývar jako samostatný recept (`10101`), nebo přepočítat na kostky/vodu. Vývar C z drůbeže (10201/C) je novinka 4. vydání (uvedeno na str. 3).
2. **Přílohy jen jménem.** „Vhodné přílohy“ obvykle bez čísla; je nutné ručně spojit s kódy ze skupiny 199. Některé pokrmy mají přílohu přímo v porci (Kotlíkový guláš, Francouzské brambory, Bramborový guláš).
3. **Odkazy se stranou jsou tištěné** („na str. 584“), nikoli PDF: převod viz sekce 2, ověřit v TSV.
4. **Polévkové koření.** Surovina `Polévkové koření` (10–20 g na 10 porcí) se objevuje na asi 50 stranách a kniha ho nedefinuje (zřejmě hotová kořenicí směs; značka v textu není). Doporučení: zapsat jako volitelnou položku, nebo nahradit solí a bylinkami; v aplikaci nemít položku katalogu „polévkové koření“ bez poznámky.
5. **Margarín a sádlo.** Margarín je tuk na zásmažku (185 stran), sádlo „škvařené“ na 176 stranách (vepřové, bramborák, kulajda). Mapování na katalog: margarín → máslo nebo olej; sádlo → sádlo nebo olej. Máslo se ve výběru vyskytuje jen u 19909/A, 19905/A, 19471, 17001, 19001.
6. **Sterilované a průmyslové polotovary.** „Sterilované“ se v textu objevuje asi na 82 stranách (druhy surovin podle stránek neověřeny). Pro domácí variantu nahradit čerstvými nebo kupovanými; u zelí je výchozí kysané. Dále „bramborový přípravek“ a „hrachová kaše z prášku“ (varianty `/B`, `19303/A`): ignorovat.
7. **Porce a poměry.** Všechno je na 10 porcí v g, a to **hrubé** (včetně odpadu) i čisté. Pro přepočet na 4 porce brát hrubou hmotnost × 0,4; počet kusů (např. „Vejce 6 ks“) po přepočtu zaokrouhlit. Polévky: 3,3 l na 10 porcí = 0,33 l na porci.
8. **Velikost porce neodpovídá domácí.** 1 porce = „normová“ porce stravovacího zařízení: u masa 60–65 g čistého masa, příloha 150–200 g; na 4 porce to vychází malé množství masa (např. svíčková 4 × 63 g = 252 g). Doporučit v poznámce, že jde o jídelní normu, ne o rodinnou porci.
9. **Minutky a odborné termíny.** „Minutka“ = označení pro kalkulaci. Mnoho jídel používá „maso dělené pro kuchařské účely“ (ON 58 8171, v příloze na konci knihy) a hmotnostní výtěžnosti (hrubá/odpad/čistá), které v domácnosti nedáme; vždy používat čistou hmotnost.
10. **Kvalita OCR čísel.** Hmotnosti (zejména „hrubá“ vs. „čistá“) a desetinná místa se čtou špatně; vždy kontrola proti součtu `Hmotnost potravin` a proti obrázku strany. Pokud kontrolní součet nesedí, brát obrázek.
11. **Duplicitní receptury.** Stejný název se opakuje v různých skupinách (např. rýžový nákyp s jablky 19470, 19502, 19621; jablková žemlovka 19471, 19504, 19603; bramborový guláš 15505 vs. 19405) a s odlišnou porcí; při digitalizaci vybrat jednu a zmínit variantu.
12. **TSV mezery.** TSV neobsahuje 10101 (Vývar B), 10201 (Vývar hovězí, jen str. 49), 19607 (str. 548, hlavička ztracená), a obsahuje chyby v kódech (např. `19122` místo 10122 Polévka kmínová s vejcem). Před zpracováním dávky vždy ověřit kód ve `page_NNNN.txt`.
13. **Nejasný odkaz.** Polévka zelná 10112 (str. 26) odkazuje na „receptura č. 10301“, kterou OCR nenalezlo (pravděpodobně překlep čísla vývaru); proto zelná není ve výběru.
14. **Edice.** Titulní list 1986, předmluva 4. vydání 1983 (ceníky 1982). Cenové údaje v textu nejsou, jen normy hmotností.
