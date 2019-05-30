import AddingGame from './adding'

test('Adds various numbers, including 0', () => {
    const s1 = { total: 0 }
    const { state: s2 } = AddingGame.playAction(s1, 4)
    const { state: s3 } = AddingGame.playAction(s2, 3)
    const { state: s4 } = AddingGame.playAction(s3, 0)
    expect(s1.total).toEqual(0)
    expect(s2.total).toEqual(4)
    expect(s3.total).toEqual(7)
    expect(s4.total).toEqual(7)
    expect(s2).not.toBe(s1)
    expect(s4).toBe(s3)
})

test('Does not interfere with other state', () => {
    const s1 = { total: 1, extra: 5, list: [] }
    const { state: s2 } = AddingGame.playAction(s1, 3)
    expect(s2.total).toEqual(4)
    expect(s2.extra).toEqual(5)
    expect(s2.list).toBe(s1.list)
})
