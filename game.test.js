import Game from './game'

// Most of the core functionality is tested by testing the examples instead

test('If getFilters() is not overridden, filter() returns the input unchanged', () => {
  const before = { hi: 'bye' }
  expect(Game.filter(before)).toBe(before)
})
