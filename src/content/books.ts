import type { Book } from '../domain/types'

/** Název kuchařky (obal, titulní strana brožurky). */
export const COOKBOOK_TITLE = 'Recepty na vejlety, tábory a nebo když je do vejplaty daleko'

export interface BookMeta {
  title: string
  year: number
  era: string
  shortTitle: string
  description: string
  /** Názvy oddílů receptu, jak je používá kniha (výchozí „Postup“ a „Surovina“). */
  headings?: { steps?: string; ingredient?: string }
}

export const BOOK_META: Record<Book, BookMeta> = {
  'afrs-2003': {
    title: 'Armed Forces Recipe Service',
    year: 2003,
    era: 'afrs-2003',
    shortTitle: 'AFRS 2003',
    description: 'Společná recepturní sbírka americké armády, námořnictva a letectva (MCO P10110.42B, vydání z června 2003). Recepty jsou na kartách pro 100 porcí a obsahují výživové údaje i kritické kontrolní body hygieny; tato revize nahrazuje sady z let 1993, 1997 a 1999.',
  },
  'navy-1944': {
    title: 'The Cook Book of the United States Navy',
    year: 1944,
    era: 'navy-1944',
    shortTitle: 'Navy 1944',
    description: 'Kuchařka amerického námořnictva z 1. května 1944 s předmluvou generálního intendanta W. B. Younga. Shrnuje principy vaření, plánování jídelníčku a recepty založené na tehdy novém poznání o výživě; mnoho receptů vyzkoušel personál námořních kuchyní.',
  },
  'italian-1919': {
    title: 'The Italian Cook Book',
    year: 1919,
    era: 'italian-1919',
    shortTitle: 'Italian 1919',
    description: 'Praktické recepty italské kuchyně, které sestavila Maria Gentile (Italian Book Co., New York, 1919). Vznikla po první světové válce, kdy americké hospodyně učila šetrnosti, a představuje domácí kuchyni (cucina casalinga) jako chutnou, výživnou a úspornou.',
  },
  'feldkochbuch-1940': {
    title: 'Feldkochbuch',
    year: 1940,
    era: 'feldkochbuch-1940',
    shortTitle: 'Feldkochbuch 1940',
    description: 'Polní kuchařka německé branné moci, schválená 4. srpna 1938 a vytištěná v Berlíně roku 1940 v Reichsdruckerei. Obsahuje základní pravidla vaření v polní kuchyni, přehled pokrmů z brambor, zeleniny, kroup, těstovin a luštěnin a tabulku koření.',
  },
  'glasse-1747': {
    title: 'The Art of Cookery, Made Plain and Easy',
    year: 1747,
    era: 'glasse-1747',
    shortTitle: 'Glasse 1747',
    description: 'Nejslavnější anglická kuchařka 18. století od Hannah Glasse, poprvé vydaná roku 1747 „by a Lady“ a psaná prostě pro služebné. Digitalizovaný výtisk je nedatované „nové vydání“ londýnského knihkupce L. Wangforda z doby po autorčině smrti (1770), doplněné o 150 nových receptů.',
  },
  'rettigova-1868': {
    title: 'Domácí kuchařka',
    year: 1868,
    era: 'rettigova-1868',
    shortTitle: 'Rettigová 1868',
    description: 'Kuchařka Magdaleny Dobromily Rettigové, poprvé vydaná roku 1826 jako první velká kuchařka psaná česky. Text odpovídá vydání nakladatele Jaroslava Pospíšila z roku 1868; recepty jsou psané jako rady hospodyni, s množstvím v librách, lotech a lžících, často jen „dle libosti“.',
  },
  'hauptmann-1877': {
    title: 'Bread and Cake Baking',
    year: 1877,
    era: 'hauptmann-1877',
    shortTitle: 'Hauptmann 1877',
    description: 'Sbírka receptů pekaře Fredericka D. Hauptmanna na chléb, koláče, pie a zmrzlinu, vydaná v Pittsburghu roku 1877 u Stevenson & Foster. Psaná pro řemeslné pekaře i domácnosti, s radami k přípravě surovin a pečení.',
  },
  'wells-1890': {
    title: "The Bread and Biscuit Baker's and Sugar-Boiler's Assistant",
    year: 1890,
    era: 'wells-1890',
    shortTitle: 'Wells 1890',
    description: 'Příručka pekaře a cukráře Roberta Wellse ze Scarborough (2. vydání, Crosby Lockwood, Londýn 1890). Číslované recepty na chléb, sušenky, perníky, koláče, pečivo a cukrovinky jsou v pekárenských dávkách na libry a unce, jak je autor sám vyzkoušel v provozu.',
  },
  'army-baker-1945': {
    title: 'The Army Baker',
    year: 1945,
    era: 'army-baker-1945',
    shortTitle: 'Army Baker 1945',
    description: 'Technická příručka válečného ministerstva USA TM 10-410 pro armádní pekaře z dubna 1945, která nahradila vydání z roku 1942. Učí péct bílý kynutý chléb v kasárenské pekárně i v polních podmínkách s improvizovanými díži a pecemi a uvádí standardní receptury armádního chleba v procentech mouky.',
  },
  'receptury-1983': {
    title: 'Receptury teplých pokrmů',
    year: 1983,
    era: 'receptury-1983',
    shortTitle: 'Receptury 1983',
    headings: { steps: 'Výrobní postup', ingredient: 'Druh potravin' },
    description: 'Závazný soubor receptur pro restaurace a závodní jídelny, který vydalo ministerstvo obchodu ČSR (4. vydání, 1983). Každá receptura má číslo, výtěžek pro 10 porcí, hmotnosti surovin hrubé, odpad a čisté v gramech a popis, jak má hotový pokrm vypadat a chutnat.',
  },
  vlastni: {
    title: 'Vlastní recepty',
    year: 2026,
    era: 'vlastni',
    shortTitle: 'Vlastní',
    description: 'Recepty, které do sbírky přibyly mimo historické kuchařky. Jsou psané ve stejném formátu jako ostatní, aby se daly stejně přepočítávat a zařazovat do nákupních seznamů.',
  },
}
