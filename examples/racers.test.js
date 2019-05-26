import Racers from './racers'

test('Start state has pawns on square 0', () => {
    const s0 = Racers.nextState({}, 'start')
    expect(s0.pawns).toEqual([[0,0],[0,0]])
})

test('Moving a pawn works correctly and advances the turn', () => {
    const s0 = Racers.nextState({}, 'start')
    const s1 = Racers.nextState(s0, 0)
    expect(s1.pawns).toEqual([[1,0],[0,0]])
    expect(s1.player).toEqual(1)
})

test('Pawn captures send opponent back to start', () => {
    const s0 = Racers.nextState({}, 'start')
    const s1 = Racers.nextState(s0, 0)
    const s2 = Racers.nextState(s1, 1)
    expect(s2.pawns).toEqual([[0,0],[0,1]])
})
