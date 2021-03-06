import produce from "immer";
import { JSON_delta } from "./vendor-json-delta";

import deepcopy from "deepcopy";

const context = Symbol("context");

class Game {
  static setupFilters(state) {
    const filters = this.getFilters(state);
    let f;
    if (typeof filters == "function") {
      f = { default: filters };
      this[context].filterMode = "single";
    } else {
      f = filters;
      this[context].filterMode = "multi";
    }
    this[context].filters = {};
    for (let filterKey in f) {
      this[context].filters[filterKey] = produce(f[filterKey]);
    }
  }

  static filter(state, filterKey) {
    const filters = this.getFilters(state);
    if (typeof filters == "function") {
      return produce(state, filters);
    } else {
      return produce(state, filters[filterKey]);
    }
  }

  static getFilters() {
    // default implementation if not overridden
    return () => {};
  }

  static playAction(state, action) {
    if (this[context] !== undefined) {
      throw new Error(
        "Nested calls to playAction()/replayAction() are not supported"
      );
    }
    let views = {},
      newState,
      oldContext;
    try {
      this[context] = { mode: "play", diffs: {} };
      this.setupFilters(state);
      for (let filterKey in this[context].filters) {
        views[filterKey] = this[context].filters[filterKey](state);
        this[context].diffs[filterKey] = [];
      }
      newState = produce(state, draft => {
        return this.updateState(draft, action);
      });
    } finally {
      oldContext = this[context];
      this[context] = undefined;
    }
    if (process.env.NODE_ENV != "production") {
      // development or test
      for (let filterKey in oldContext.filters) {
        const replayResult = this.replayAction(
          views[filterKey],
          action,
          oldContext.diffs[filterKey]
        );
        const filteredNewState = oldContext.filters[filterKey](newState);
        const diff = JSON_delta.diff(replayResult, filteredNewState);
        if (diff.length != 0) {
          const error = new Error(
            "Result of replaying the action did not match the new state"
          );
          error.result = filteredNewState;
          error.replay = replayResult;
          error.diff = diff;
          throw error;
        }
      }
    }
    if (oldContext.filterMode == "single") {
      const newInfo = oldContext.diffs["default"];
      return { state: newState, newInfo };
    } else {
      return { state: newState, newInfos: oldContext.diffs };
    }
  }

  static replayAction(state, action, diffs) {
    if (this[context] !== undefined) {
      throw new Error(
        "Nested calls to playAction()/replayAction() are not supported"
      );
    }
    let result;
    try {
      this[context] = { mode: "replay", diffs, diffIndex: 0 };
      result = produce(state, draft => {
        return this.updateState(draft, action);
      });
    } finally {
      this[context] = undefined;
    }
    return result;
  }

  static applyUpdate(state, transform) {
    switch (this[context].mode) {
      case "play":
        this._playApplyUpdate(state, transform);
        break;
      case "replay":
        this._replayApplyUpdate(state, transform);
        break;
    }
  }

  static _playApplyUpdate(draft, transform) {
    // Have to clone the previous state here as Immer will try to help out with
    // structural sharing which breaks because this is really a mutable draft
    const original = deepcopy(draft);
    const views = {};
    for (let filterKey in this[context].filters) {
      views[filterKey] = produce(original, this[context].filters[filterKey]);
    }
    transform(draft);
    const updatedViews = {};
    for (let filterKey in this[context].filters) {
      updatedViews[filterKey] = produce(
        draft,
        this[context].filters[filterKey]
      );
      // We deepcopy the diff here to ensure that it contains references
      // only to plain objects and not proxies
      const diff = deepcopy(
        JSON_delta.diff(views[filterKey], updatedViews[filterKey])
      );
      this[context].diffs[filterKey].push(diff);
    }
  }

  static _replayApplyUpdate(state, _transform) {
    // We also have to clone the diff we are applying, because otherwise
    // modifying the state later on can also modify the original diff!
    const diff = deepcopy(this[context].diffs[this[context].diffIndex]);
    JSON_delta.patch(state, diff);
    this[context].diffIndex++;
  }
}

export default Game;
