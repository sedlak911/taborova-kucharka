import type { Book } from '../domain/types'

/** Název kuchařky (obal, titulní strana brožurky). */
export const COOKBOOK_TITLE = 'Recepty na vejlety, tábory a nebo když je do vejplaty daleko'

export interface BookMeta {
  title: string
  year: number
  era: string
  shortTitle: string
  description: string
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
  vlastni: {
    title: 'Vlastní recepty',
    year: 2026,
    era: 'vlastni',
    shortTitle: 'Vlastní',
    description: 'Recepty, které do sbírky přibyly mimo historické kuchařky. Jsou psané ve stejném formátu jako ostatní, aby se daly stejně přepočítávat a zařazovat do nákupních seznamů.',
  },
}
