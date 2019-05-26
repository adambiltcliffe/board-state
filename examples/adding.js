import Game from '../game'

class AddingGame extends Game {
    static updateState(state, number) {
        state.total += number
    }
}

export default AddingGame
