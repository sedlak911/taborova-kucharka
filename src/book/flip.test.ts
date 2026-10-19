import { progressFromPointer, finishFlip, flipTransform, flipShadowOpacity } from './flip'

describe('progressFromPointer', () => {
  test('next: tažení doleva o celou šířku = 1', () => expect(progressFromPointer(800, 0, 800, 'next')).toBe(1))
  test('next: tažení doleva o polovinu = 0.5', () => expect(progressFromPointer(800, 400, 800, 'next')).toBeCloseTo(0.5))
  test('next: tažení doprava = 0', () => expect(progressFromPointer(800, 900, 800, 'next')).toBe(0))
  test('prev: tažení doprava o celou šířku = 1', () => expect(progressFromPointer(0, 800, 800, 'prev')).toBe(1))
  test('nepřeteče přes 1', () => expect(progressFromPointer(800, -500, 800, 'next')).toBe(1))
  test('pageWidth 0 vrátí 0, ne NaN', () => expect(progressFromPointer(800, 200, 0, 'next')).toBe(0))
})

describe('finishFlip', () => {
  test('přes polovinu dokončí', () => expect(finishFlip(0.6, 0)).toBe('complete'))
  test('pod polovinou vrátí', () => expect(finishFlip(0.3, 0)).toBe('cancelled'))
  test('rychlé švihnutí dokončí i pod polovinou', () => expect(finishFlip(0.2, 1.2)).toBe('complete'))
  test('rychlé švihnutí zpět zruší i nad polovinou', () => expect(finishFlip(0.8, -1.2)).toBe('cancelled'))
})

describe('flipTransform', () => {
  test('next na začátku 0°', () => expect(flipTransform(0, 'next')).toBe('rotateY(0deg)'))
  test('next na konci -180°', () => expect(flipTransform(1, 'next')).toBe('rotateY(-180deg)'))
  test('prev na konci 180°', () => expect(flipTransform(1, 'prev')).toBe('rotateY(180deg)'))
})

test('stín je nejsilnější uprostřed otáčení', () => {
  expect(flipShadowOpacity(0)).toBe(0)
  expect(flipShadowOpacity(0.5)).toBe(1)
  expect(flipShadowOpacity(1)).toBe(0)
})
