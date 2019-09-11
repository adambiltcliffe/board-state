"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _immer = _interopRequireDefault(require("immer"));

var _vendorJsonDelta = require("./vendor-json-delta");

var _deepcopy = _interopRequireDefault(require("deepcopy"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const context = Symbol("context");

class Game {
  static setupFilters(state) {
    const filters = this.getFilters(state);
    let f;

    if (typeof filters == "function") {
      f = {
        default: filters
      };
      this[context].filterMode = "single";
    } else {
      f = filters;
      this[context].filterMode = "multi";
    }

    this[context].filters = {};

    for (let filterKey in f) {
      this[context].filters[filterKey] = (0, _immer.default)(f[filterKey]);
    }
  }

  static filter(state, filterKey) {
    const filters = this.getFilters(state);

    if (typeof filters == "function") {
      return (0, _immer.default)(state, filters);
    } else {
      return (0, _immer.default)(state, filters[filterKey]);
    }
  }

  static getFilters() {
    // default implementation if not overridden
    return () => {};
  }

  static playAction(state, action) {
    if (this[context] !== undefined) {
      throw new Error("Nested calls to playAction()/replayAction() are not supported");
    }

    let views = {},
        newState,
        oldContext;

    try {
      this[context] = {
        mode: "play",
        diffs: {}
      };
      this.setupFilters(state);

      for (let filterKey in this[context].filters) {
        views[filterKey] = this[context].filters[filterKey](state);
        this[context].diffs[filterKey] = [];
      }

      newState = (0, _immer.default)(state, draft => {
        return this.updateState(draft, action);
      });
    } finally {
      oldContext = this[context];
      this[context] = undefined;
    }

    if (process.env.NODE_ENV != "production") {
      // development or test
      for (let filterKey in oldContext.filters) {
        const replayResult = this.replayAction(views[filterKey], action, oldContext.diffs[filterKey]);
        const filteredNewState = oldContext.filters[filterKey](newState);

        const diff = _vendorJsonDelta.JSON_delta.diff(replayResult, filteredNewState);

        if (diff.length != 0) {
          const error = new Error("Result of replaying the action did not match the new state");
          error.result = filteredNewState;
          error.replay = replayResult;
          error.diff = diff;
          throw error;
        }
      }
    }

    if (oldContext.filterMode == "single") {
      const newInfo = oldContext.diffs["default"];
      return {
        state: newState,
        newInfo
      };
    } else {
      return {
        state: newState,
        newInfos: oldContext.diffs
      };
    }
  }

  static replayAction(state, action, diffs) {
    if (this[context] !== undefined) {
      throw new Error("Nested calls to playAction()/replayAction() are not supported");
    }

    let result;

    try {
      this[context] = {
        mode: "replay",
        diffs,
        diffIndex: 0
      };
      result = (0, _immer.default)(state, draft => {
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
    const original = (0, _deepcopy.default)(draft);
    const views = {};

    for (let filterKey in this[context].filters) {
      views[filterKey] = (0, _immer.default)(original, this[context].filters[filterKey]);
    }

    transform(draft);
    const updatedViews = {};

    for (let filterKey in this[context].filters) {
      updatedViews[filterKey] = (0, _immer.default)(draft, this[context].filters[filterKey]); // We deepcopy the diff here to ensure that it contains references
      // only to plain objects and not proxies

      const diff = (0, _deepcopy.default)(_vendorJsonDelta.JSON_delta.diff(views[filterKey], updatedViews[filterKey]));
      this[context].diffs[filterKey].push(diff);
    }
  }

  static _replayApplyUpdate(state, _transform) {
    // We also have to clone the diff we are applying, because otherwise
    // modifying the state later on can also modify the original diff!
    const diff = (0, _deepcopy.default)(this[context].diffs[this[context].diffIndex]);

    _vendorJsonDelta.JSON_delta.patch(state, diff);

    this[context].diffIndex++;
  }

}

var _default = Game;
exports.default = _default;
//# sourceMappingURL=game.js.map