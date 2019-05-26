import produce from 'immer'

class Game {
    static nextState(state, action, config) {
        return produce(state, draft => {
            return this.updateState(draft, action, config)
        })
    }
}

export default Game
