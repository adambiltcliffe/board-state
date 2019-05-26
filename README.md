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
simply as possible.

## Exclusions

`board-state` has no opinions on the validation of game actions. It is assumed that any action you
pass to `nextState` has already been validated to ensure that it is legal (of course, adding an
`isLegalAction` method to your `Game` subclass for your own use is perfectly possible).

There is no built-in notion of players or turn order. If your game has a concept of the currently-acting player,
you can have your state model implicitly assume that any action passed to `nextState` is taken
by the player whose turn it is (and enforce this elsewhere in your code). If more than one player
could potentially take the next action at any given time, you can store the acting player
explicitly along with the rest of the data describing each action.

## Basic functionality

The minimum you need to do is extend `Game` with an `updateState` function:

  class AddingGame extends Game {
      static updateState(state, number) {
          state.total += number
      }
  }

  AddingGame.nextState({ number: 0 }, 5) // returns { number: 5 }

`board-state` uses [immer](https://github.com/immerjs/immer) to allow you to mutate the state in `updateState` but ensure that a new
object is actually returned from `nextState`.

If your game has no hidden information, this is all you need, although we're not really sure why you
would need a third-party library in that case.

## Hiding information

This is still to come ...
