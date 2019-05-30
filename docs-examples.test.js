import Game, { updateFullState } from './game'

test('Basic example from the docs works as advertised', () => {
  const startState = { doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }}

  class MontyHall extends Game {
      static updateState(state, action) {
          if (action.type == 'open') {
            state.prize = state.doors[action.door]
          }
      }
  }

  const { state: result1 } = MontyHall.playAction(startState, { type: 'open', door: 1 })
  expect(result1).toEqual({ doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }, prize: 'goat' })
  const result2 = MontyHall.replayAction(startState, { type: 'open', door: 1 })
  expect(result2).toEqual({ doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }, prize: 'goat' })
})

test('Incorrect information-hiding example from the docs fails as advertised', () => {
  const startState = { doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }}

  class MontyHall extends Game {
      static updateState(state, action) {
          if (action.type == 'open') {
            state.prize = state.doors[action.door]
          }
      }
      static getFilters() {
        return (state) => {
          delete state.doors
        }
      }
  }

  const clientView = MontyHall.filter(startState)
  expect(clientView).toEqual({})
  expect(() => MontyHall.playAction(startState, { type: 'open', door: 1 })).toThrow()
})

test('Correct information-hiding example from the docs works as advertised', () => {
  const startState = { doors: { [1]: 'goat', [2]: 'goat', [3]: 'car' }, openDoors: {}, host: 'Monty' }

  class MontyHall extends Game {
      static updateState(state, action) {
          if (action.type == 'open') {
            this.applyUpdate(state, fullState => {
              fullState.openDoors[action.door] = fullState.doors[action.door]
            })
            state.prize = state.openDoors[action.door]
          }
      }
      static getFilters() {
        return (state) => {
          delete state.doors
        }
      }
  }

  const { state: serverState } = MontyHall.playAction(startState, { type: 'open', door: 1 })
  expect(serverState).toEqual({ ...startState, openDoors: { 1: 'goat' }, prize: 'goat' })
  //const clientState = MontyHall.replayAction(MontyHall.filter(startState), { type: 'open', door: 1 })
  //expect(clientState).toEqual({ openDoors: { 1: 'goat' }, prize: 'goat' })
})
