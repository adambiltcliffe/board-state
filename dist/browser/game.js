function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

import produce from "immer";
import { JSON_delta } from "./vendor-json-delta";
import deepcopy from "deepcopy";
var context = Symbol("context");

var Game =
/*#__PURE__*/
function () {
  function Game() {
    _classCallCheck(this, Game);
  }

  _createClass(Game, null, [{
    key: "setupFilters",
    value: function setupFilters(state) {
      var filters = this.getFilters(state);
      var f;

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

      for (var filterKey in f) {
        this[context].filters[filterKey] = produce(f[filterKey]);
      }
    }
  }, {
    key: "filter",
    value: function filter(state, filterKey) {
      var filters = this.getFilters(state);

      if (typeof filters == "function") {
        return produce(state, filters);
      } else {
        return produce(state, filters[filterKey]);
      }
    }
  }, {
    key: "getFilters",
    value: function getFilters() {
      // default implementation if not overridden
      return function () {};
    }
  }, {
    key: "playAction",
    value: function playAction(state, action) {
      var _this = this;

      if (this[context] !== undefined) {
        throw new Error("Nested calls to playAction()/replayAction() are not supported");
      }

      var views = {},
          newState,
          oldContext;

      try {
        this[context] = {
          mode: "play",
          diffs: {}
        };
        this.setupFilters(state);

        for (var filterKey in this[context].filters) {
          views[filterKey] = this[context].filters[filterKey](state);
          this[context].diffs[filterKey] = [];
        }

        newState = produce(state, function (draft) {
          return _this.updateState(draft, action);
        });
      } finally {
        oldContext = this[context];
        this[context] = undefined;
      }

      if (process.env.NODE_ENV != "production") {
        // development or test
        for (var _filterKey in oldContext.filters) {
          var replayResult = this.replayAction(views[_filterKey], action, oldContext.diffs[_filterKey]);

          var filteredNewState = oldContext.filters[_filterKey](newState);

          var diff = JSON_delta.diff(replayResult, filteredNewState);

          if (diff.length != 0) {
            var error = new Error("Result of replaying the action did not match the new state");
            error.result = filteredNewState;
            error.replay = replayResult;
            error.diff = diff;
            throw error;
          }
        }
      }

      if (oldContext.filterMode == "single") {
        var newInfo = oldContext.diffs["default"];
        return {
          state: newState,
          newInfo: newInfo
        };
      } else {
        return {
          state: newState,
          newInfos: oldContext.diffs
        };
      }
    }
  }, {
    key: "replayAction",
    value: function replayAction(state, action, diffs) {
      var _this2 = this;

      if (this[context] !== undefined) {
        throw new Error("Nested calls to playAction()/replayAction() are not supported");
      }

      var result;

      try {
        this[context] = {
          mode: "replay",
          diffs: diffs,
          diffIndex: 0
        };
        result = produce(state, function (draft) {
          return _this2.updateState(draft, action);
        });
      } finally {
        this[context] = undefined;
      }

      return result;
    }
  }, {
    key: "applyUpdate",
    value: function applyUpdate(state, transform) {
      switch (this[context].mode) {
        case "play":
          this._playApplyUpdate(state, transform);

          break;

        case "replay":
          this._replayApplyUpdate(state, transform);

          break;
      }
    }
  }, {
    key: "_playApplyUpdate",
    value: function _playApplyUpdate(draft, transform) {
      // Have to clone the previous state here as Immer will try to help out with
      // structural sharing which breaks because this is really a mutable draft
      var original = deepcopy(draft);
      var views = {};

      for (var filterKey in this[context].filters) {
        views[filterKey] = produce(original, this[context].filters[filterKey]);
      }

      transform(draft);
      var updatedViews = {};

      for (var _filterKey2 in this[context].filters) {
        updatedViews[_filterKey2] = produce(draft, this[context].filters[_filterKey2]); // We deepcopy the diff here to ensure that it contains references
        // only to plain objects and not proxies

        var diff = deepcopy(JSON_delta.diff(views[_filterKey2], updatedViews[_filterKey2]));

        this[context].diffs[_filterKey2].push(diff);
      }
    }
  }, {
    key: "_replayApplyUpdate",
    value: function _replayApplyUpdate(state, _transform) {
      // We also have to clone the diff we are applying, because otherwise
      // modifying the state later on can also modify the original diff!
      var diff = deepcopy(this[context].diffs[this[context].diffIndex]);
      JSON_delta.patch(state, diff);
      this[context].diffIndex++;
    }
  }]);

  return Game;
}();

export default Game;
//# sourceMappingURL=game.js.map