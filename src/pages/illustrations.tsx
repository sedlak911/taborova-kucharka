import type { ReactNode } from 'react'
import type { Chapter } from '@/domain/types'

/** Jednoduché monochromatické siluety (currentColor), každá ve viewBoxu 0 0 100 100. */
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="chapter-illustration"
      viewBox="0 0 100 100"
      width="100"
      height="100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const filled = { fill: 'currentColor', stroke: 'none' } as const

/** Hrnec s párou. */
const Pot = () => (
  <Svg>
    <path d="M20 45h60v22a18 18 0 0 1-18 18H38a18 18 0 0 1-18-18z" {...filled} />
    <path d="M14 45h72M14 45h-4M86 45h4" />
    <path d="M38 36c-5-6 5-9 0-16M52 36c-5-6 5-9 0-16M66 36c-5-6 5-9 0-16" />
  </Svg>
)

/** Kotlík nad ohněm. */
const Kettle = () => (
  <Svg>
    <path d="M18 40a32 28 0 0 0 64 0z" {...filled} />
    <path d="M18 40h64M26 30a24 24 0 0 1 48 0" />
    <path d="M22 82l56-14M78 82L22 68" />
  </Svg>
)

/** Ryba. */
const Fish = () => (
  <Svg>
    <path d="M12 50c14-22 40-26 58-8l18-14v44L70 58c-18 18-44 14-58-8z" {...filled} />
    <circle cx="30" cy="46" r="3" fill="var(--paper, #f6ecd4)" stroke="none" />
  </Svg>
)

/** Miska s luštěninami. */
const Legumes = () => (
  <Svg>
    <path d="M12 50h76a38 30 0 0 1-76 0z" {...filled} />
    <ellipse cx="34" cy="40" rx="6" ry="4" {...filled} />
    <ellipse cx="50" cy="35" rx="6" ry="4" {...filled} />
    <ellipse cx="66" cy="40" rx="6" ry="4" {...filled} />
    <ellipse cx="42" cy="44" rx="5" ry="3.5" {...filled} />
    <ellipse cx="58" cy="44" rx="5" ry="3.5" {...filled} />
  </Svg>
)

/** Mrkev s natí. */
const Carrot = () => (
  <Svg>
    <path d="M38 38c8-6 20-6 28 2L30 90c-4 2-8-2-6-6z" {...filled} transform="rotate(8 50 60)" />
    <path d="M60 30c-4-12 2-20 8-24M60 30c6-8 16-10 24-8M60 30c-10-6-20-4-26 2" />
  </Svg>
)

/** Vařečka s nudlemi. */
const Noodles = () => (
  <Svg>
    <path d="M22 88L52 48" strokeWidth="5" />
    <ellipse cx="62" cy="36" rx="14" ry="10" transform="rotate(-50 62 36)" {...filled} />
    <path d="M40 60c-12 0-12-10-2-10s6 14 18 6M30 70c-10 2-12-8-4-8" />
    <path d="M74 56c8 2 10 12 2 16M70 64c6 4 6 12 0 14" />
  </Svg>
)

/** Hrnek s rohlíkem. */
const MugRoll = () => (
  <Svg>
    <path d="M14 42h42v28a14 14 0 0 1-14 14H28a14 14 0 0 1-14-14z" {...filled} />
    <path d="M56 50h6a10 10 0 0 1 0 20h-6" />
    <path d="M26 34c-4-5 4-7 0-12M38 34c-4-5 4-7 0-12" />
    <path d="M62 36c8-12 28-12 34 0-6 6-14 8-24 6z" {...filled} />
  </Svg>
)

/** Koláč. */
const Pie = () => (
  <Svg>
    <path d="M10 56h80l-8 28H18z" {...filled} />
    <path d="M12 56c0-22 76-22 76 0z" />
    <path d="M30 46l6-8M50 42v-9M70 46l-6-8" />
  </Svg>
)

/** Džbán. */
const Jug = () => (
  <Svg>
    <path d="M30 24h32l6 8c8 14 6 36-4 54H28c-10-18-12-40-4-54z" {...filled} />
    <path d="M68 40h6a10 10 0 0 1 0 22h-8" />
    <path d="M30 24c0-6 32-6 32 0" />
  </Svg>
)

const ILLUSTRATIONS: Record<Chapter, () => ReactNode> = {
  polevky: Pot,
  'z-jednoho-hrnce': Kettle,
  'maso-a-ryby': Fish,
  bezmasa: Legumes,
  'prilohy-a-zelenina': Carrot,
  'testoviny-a-ryze': Noodles,
  'snidane-a-pecivo': MugRoll,
  sladke: Pie,
  napoje: Jug,
}

export function ChapterIllustration({ chapter }: { chapter: Chapter }) {
  const Illustration = ILLUSTRATIONS[chapter]
  return <Illustration />
}
