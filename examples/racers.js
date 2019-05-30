import Game from '../game'

// This is a somewhat arbitrary example intended to showcase how to deal
// with games in which information is revealed during a player's turn which
// influences the resolution of an action.

// Each player has two pawns positioned on a track. Each turn the player
// chooses one of their two pawns to move, and then reveals the top card of
// a deck. The pawn moves that many spaces forward and then, if it has
// landed on an opponent's pawn, the opposing pawn is returned to the start.

class Racers extends Game {
    static updateState(state, action) {
        if (action == 'start') {
            return ({
                player: 0,
                pawns: [[0, 0], [0, 0]],
                deck: [2,3,1,10,5,9,8,4,6,7]
            })
        } else {
            this.applyUpdate(state, fs => {
              fs.revealedCard = fs.deck.shift()
            })
            const dist = state.revealedCard
            state.pawns[state.player][action] += dist
            const newSpace = state.pawns[state.player][action]
            if (state.pawns[1-state.player][0] == newSpace) {
                state.pawns[1-state.player][0] = 0
            }
            if (state.pawns[1-state.player][1] == newSpace) {
                state.pawns[1-state.player][1] = 0
            }
            state.player = 1-state.player
        }
    }
}

export default Racers
