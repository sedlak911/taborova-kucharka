import type { Chapter } from '@/domain/types'

export interface ChapterMeta {
  title: string
  quote: string
  quoteSource: string
  intro: string
}

/** Citáty jsou skutečné věty z digitalizovaných knih (PDF strana = strana v extracted/). */
export const CHAPTER_META: Record<Chapter, ChapterMeta> = {
  polevky: {
    title: 'Polévky',
    quote: 'Tato výborná a výživná polévka je dar z nebes pro využití starého chleba, který se už nikdy nesmí vyhodit. (This excellent and nutritious soup is a godsend for using the stale bread that must never again be thrown away.)',
    quoteSource: 'The Italian Cook Book, 1919, PDF s. 11 (Chlebová polévka)',
    intro: 'Polévka byla základem polních kuchyní i italských domácností: levná, sytá a z toho, co zrovna bylo po ruce. Najdete tu od vojenských klasik z velkokuchyní po rustikální italské polévky ze starého chleba.',
  },
  'z-jednoho-hrnce': {
    title: 'Z jednoho hrnce',
    quote: 'Polenta je v severní Itálii velmi oblíbené jídlo a dá se připravit mnoha způsoby. (The polenta is a very popular dish in Northern Italy and can be prepared in various ways.)',
    quoteSource: 'The Italian Cook Book, 1919, PDF s. 117 (Polenta s klobásami)',
    intro: 'Jídla, která se uvaří, udusí nebo upečou v jediné nádobě. Polní kuchyně na tom stála: jeden kotel, málo nádobí a pořádná porce pro všechny. Ideální na kemp, na chatu i na rychlou večeři.',
  },
  'maso-a-ryby': {
    title: 'Maso a ryby',
    quote: 'Je to výborný způsob, jak připravit tuhé kuře. (This is an excellent way to cook tough chickens.)',
    quoteSource: 'The Italian Cook Book, 1919, PDF s. 34 (Kuře po lovecku)',
    intro: 'Maso se v historických kuchařkách šetřilo a zpracovávalo tak, aby vydrželo a nasytilo: dušení, sekaná, játra, grilování. Ryby zastupuje například italská solená treska.',
  },
  bezmasa: {
    title: 'Bezmasá a luštěniny',
    quote: 'Vařte na mírném ohni 1½ hodiny, dokud nejsou fazole právě měkké. (Simmer 1-1/2 hours or until beans are just tender.)',
    quoteSource: 'Armed Forces Recipe Service, 2003, PDF s. 1484 (Vařené fazole)',
    intro: 'Luštěniny a sýr dodávaly vojákům bílkoviny levně a v zásobě. Jednoduchá bezmasá jídla, která dnes dobře poslouží i vegetariánům.',
  },
  'prilohy-a-zelenina': {
    title: 'Přílohy a zelenina',
    quote: 'Pečte v pomalé troubě (300 °F) 3 až 4 hodiny a podle potřeby přidávejte tekutinu z vařených fazolí. (Bake in slow oven (300°F.) 3 to 4 hours, adding liquid from the boiled beans as needed.)',
    quoteSource: 'The Cook Book of the United States Navy, 1944, PDF s. 259 (Pečené fazole po bostonsku)',
    intro: 'Brambory, zelí, mrkev i dušená zelenina. Přílohy z armádních kuchařek jsou prosté, ale spolehlivé a dobře se přizpůsobí menším porcím.',
  },
  'testoviny-a-ryze': {
    title: 'Těstoviny a rýže',
    quote: 'Takto jsou špagety nejjednodušeji podávány. (This is the simplest form in which the spaghetti may be served.)',
    quoteSource: 'The Italian Cook Book, 1919, PDF s. 21 (Špagety s máslem a sýrem)',
    intro: 'Těstoviny a rýže jsou levná a sytá základna každého jídelníčku. Od italských receptů z roku 1919 po armádní makarony a dušenou rýži pro velké skupiny.',
  },
  'snidane-a-pecivo': {
    title: 'Snídaně a pečivo',
    quote: 'Vsypte obilovinu a sůl do vroucí vody a míchejte, aby se nevytvořily hrudky. (Add cereal and salt to boiling water; stir to prevent lumping.)',
    quoteSource: 'Armed Forces Recipe Service, 2003, PDF s. 292 (Ovesná kaše)',
    intro: 'Kaše, chleby a drobné pečivo: snídaně, která zahřeje a vydrží do oběda. Většina receptů vyžaduje jen základní suroviny a trochu trpělivosti s těstem.',
  },
  sladke: {
    title: 'Sladké',
    quote: 'Často míchejte naběračkou, dokud směs nezíská pevnost marmelády. (Stir often with the ladle until the mixture acquires the firmness of marmalade.)',
    quoteSource: 'The Italian Cook Book, 1919, PDF s. 155 (Meruňkový džem)',
    intro: 'Puddingy, nákypy, koláče a džemy. Sladké pokrmy z vojenských i domácích kuchařek, často z několika základních surovin.',
  },
  napoje: {
    title: 'Nápoje',
    quote: 'Čaj se nesmí nikdy vařit, protože by získal hořkou chuť. (Tea must never be boiled as this produces a bitter flavor.)',
    quoteSource: 'Armed Forces Recipe Service, 2003, PDF s. 98 (Černý čaj)',
    intro: 'Horké i studené nápoje: čaj, kakao, limonáda a sirupy. Malé recepty, které se hodí k jídlu i na cestu.',
  },
}
