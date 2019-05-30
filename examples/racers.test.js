import Racers from './racers'

test('Start state has pawns on square 0', () => {
    const { state: s0 } = Racers.playAction({}, 'start')
    expect(s0.pawns).toEqual([[0,0],[0,0]])
})

test('Moving a pawn works correctly and advances the turn', () => {
    const { state: s0 } = Racers.playAction({}, 'start')
    expect(s0).toHaveProperty('deck')
    const { state: s1 } = Racers.playAction(s0, 0)
    expect(s1.pawns).toEqual([[2,0],[0,0]])
    expect(s1.player).toEqual(1)
})

test('Pawn captures send opponent back to start', () => {
    const { state: s0 } = Racers.playAction({}, 'start')
    const { state: s1 } = Racers.playAction(s0, 0)
    const { state: s2 } = Racers.playAction(s1, 1)
    const { state: s3 } = Racers.playAction(s2, 0)
    expect(s3.pawns).toEqual([[3,0],[0,0]])
})
