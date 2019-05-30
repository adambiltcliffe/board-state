import produce from "immer";
import { JSON_delta } from "./vendor/json_delta";

import deepcopy from 'deepcopy'

class Game {
  static filter(state) {
    const filter = this.getFilters();
    return produce(state, filter);
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

  static _playApplyUpdate(draft, transform) {
    const filter = this.filter.bind(this);
    // Have to clone the previous state here as Immer will try to help out with
    // structural sharing which breaks because this is really a mutable draft
    const view = produce(deepcopy(draft), filter);
    transform(draft);
    const updatedView = produce(draft, filter);
    this._context.diffs.push(JSON_delta.diff(view, updatedView));
  }

  static _replayApplyUpdate(state, _transform) {
    const diff = this._context.diffs[this._context.diffIndex];
    JSON_delta.patch(state, diff);
    this._context.diffIndex++;
  }
}

export default Game;
