// src/book/useOverflowHint.test.ts
import { OVERFLOW_EPSILON_PX, hasMoreBelow } from './useOverflowHint'

test('hasMoreBelow: zbývá obsah pod spodním okrajem', () => {
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 0 })).toBe(true)
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 })).toBe(false)
  // zaokrouhlení subpixelů nesmí nechat indikátor svítit na konci
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 - OVERFLOW_EPSILON_PX })).toBe(false)
  expect(hasMoreBelow({ scrollHeight: 400, clientHeight: 400, scrollTop: 0 })).toBe(false)
})
