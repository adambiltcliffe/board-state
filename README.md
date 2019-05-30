`board-state` - A library for state machines with hidden information
===================================================================

## Purpose

This is a library for modelling the state of turn-based games such as board games, such as for use
in an online game server. The specific need which is addressed is the fact that many games have
information which is hidden from some or all players, and replicating this information to a game
client may enable players to reveal it by modifying the client code. However, we wish for clients
to be able to construct a history of state snapshots leading up to the present, without sending
the entire state over the network after each action.

The principle followed is that game actions can always be carried out on the basis of publically-available
information. This mirrors the design of most board games where the players are always able to verify for
themselves that another player's action is legal, even if that player has access to private information.
Therefore, during the resolution of an action, the only 'magic' needed is the ability to reveal hidden
information to whatever extent is needed to know what happens next.

Game states and actions in `board-state` are plain JSON-serializable Javascript objects, in order
to facilitate storing them in a database or sending them over a websocket or HTTP transport as
simply as possible. Classes are used to collect the logic for a particular game together, but logic
is located in static methods which accept a state parameter, rather than in instance methods.

## Exclusions

`board-state` has no opinions on the validation of game actions. It is assumed that any action you
pass to `playAction` has already been validated to ensure that it is legal (of course, adding an
`isLegalAction` method to your `Game` subclass for your own use is perfectly possible).

There is no built-in notion of players or turn order. If your game has a concept of the currently-acting player,
you can have your state model implicitly assume that any action passed to `playAction` is taken
by the player whose turn it is (and enforce this elsewhere in your code). If more than one player
could potentially take the next action at any given time, you can store the acting player
explicitly along with the rest of the data describing each action.

## Basic functionality

The minimum you need to do is extend `Game` with an `updateState` function:

```javascript
const startState = { doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }}

class MontyHall extends Game {
    static updateState(state, action) {
        if (action.type == 'open') {
          state.prize = doors[action.door]
        }
    }
}

const { state } = MontyHall.playAction(startState, { type: 'open', door: 1 })
// state = { doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }, prize: 'goat' }
```

`board-state` uses [immer](https://github.com/immerjs/immer) to allow you to mutate the state in `updateState` but ensure that a new
object is actually returned from `playAction`.

If you serialize the `startState` and `action` you can send them to the client and replay the game:

```javascript
const view = MontyHall.replayAction(startState, { type: 'open', door: 1 })
// view = { doors: {[1]: 'goat', [2]: 'goat', [3]: 'car' }, prize: 'goat' }
```

Note that `playAction` returns an object with a `state` property whereas `replayAction` returns the state directly.
We will see the reason for this shortly.

If your game has no hidden information, this is all you need, although we're not really sure why you
would need a third-party library in that case.

## Hiding information

If we send the `startState` above to the client then the client can inspect it and find out which door hides
the prize, which is undesirable. We can define a function to filter out secret information from the state:

```javascript
// in our MontyHall class
static getFilters() {
  return (state) => {
    delete state.doors
  }
}

// later
const clientView = MontyHall.filter(startState) // returns {}
```

However, this will throw when we try to take an action, because clients can no longer verify that the
value of `prize` was set correctly based on publicly-available information:

```javascript
const { state } = MontyHall.playAction(startState, { type: 'open', door: 1 }) // throws an error
```

(Note: `playAction` checks that the action can be correctly played back on the client without access to
private state. This check is disabled if `process.env.NODE_ENV` is set to `"production"`, in which case
the above will not throw, but you will get an error later on when you try to replay the action on the
client.)

We need to publically reveal what was behind the door when it's opened. However, this takes place in
the middle of resolving the action, so we need to ask for the door to be opened and then carry on:

```javascript
const startState = { doors: { [1]: 'goat', [2]: 'goat', [3]: 'car' }, openDoors: {} }

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

const { state, newInfo } = MontyHall.playAction(startState, { type: 'open', door: 1 })
// state = {...startState, openDoors: { 1: 'goat' }, prize: 'goat' }
```

Note that after calling `applyUpdate` we read from the (now-public) property `openDoors` rather
than from `doors` (which is still secret).

The object returned by `playAction` has a second property `newInfo`, which encodes the secret
information that was revealed in the course of resolving the action. You need to send this object
(which does not contain any other secret state) to the client in order to pass it to `replayAction`:

```javascript
const clientView = MontyHall.filter(startState)
const newClientView = MontyHall.replayAction(clientView, { type: 'open', door: 1 }, newInfo)
// newClientView = { openDoors: { 1: 'goat' }, prize: 'goat' }
```
