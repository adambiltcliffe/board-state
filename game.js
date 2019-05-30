import produce, { applyPatches } from "immer";
import { JSON_delta } from "./vendor/json_delta";

class Game {
  static filter(state) {
    const filter = this.getFilters();
    // We have to ensure that a new object is created for each filtered view
    // otherwise Immer's state-sharing ends up causing incorrect results
    return { ...produce(state, filter) };
  }

  static getFilters() {
    // default implementation if not overridden
    return () => {};
  }

  static playAction(state, action) {
    if (this._context !== undefined) {
      throw new Error(
        "Nested calls to playAction()/replayAction() are not supported"
      );
    }
    let view, newState, diffs;
    try {
      this._context = { mode: "play", diffs: [] };
      view = this.filter(state);
      newState = produce(state, draft => {
        return this.updateState(draft, action);
      });
    } finally {
      diffs = this._context.diffs;
      this._context = undefined;
    }
    if (process.env.NODE_ENV != "production") {
      // development or test
      const replayResult = this.replayAction(view, action, diffs);
      const diff = JSON_delta.diff(replayResult, this.filter(newState));
      if (diff.length != 0) {
        throw new Error(
          "Result of replaying the action did not match the new state"
        );
      }
    }
    return { state: newState, newInfo: diffs };
  }

  static replayAction(state, action, diffs) {
    if (this._context !== undefined) {
      throw new Error(
        "Nested calls to playAction()/replayAction() are not supported"
      );
    }
    let result;
    try {
      this._context = { mode: "replay", diffs, diffIndex: 0 };
      result = produce(state, draft => {
        return this.updateState(draft, action);
      });
    } finally {
      this._context = undefined;
    }
    return result;
  }

  static applyUpdate(state, transform) {
    switch (this._context.mode) {
      case "play":
        this._playApplyUpdate(state, transform);
        break;
      case "replay":
        this._replayApplyUpdate(state, transform);
        break;
    }
  }

  static _playApplyUpdate(state, transform) {
    const filter = this.filter.bind(this);
    const view = produce(state, filter);
    transform(state);
    const updatedView = produce(state, filter);
    this._context.diffs.push(JSON_delta.diff(view, updatedView));
  }

  static _replayApplyUpdate(state, _transform) {
    const diff = this._context.diffs[this._context.diffIndex];
    JSON_delta.patch(state, diff);
    this._context.diffIndex++;
  }
}

export default Game;
