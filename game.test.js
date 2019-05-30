import Game from './game'

test('If getFilters() is not overridden, filter() returns the input unchanged', () => {
  const before = { hi: 'bye' }
  expect(Game.filter(before)).toBe(before)
})
