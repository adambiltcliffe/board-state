import Game from "./game";

// Most of the core functionality is tested by testing the examples instead

test("If getFilters() is not overridden, filter() returns the input unchanged", () => {
  const before = { hi: "bye" };
  expect(Game.filter(before)).toEqual(before);
});

test("Avoid immer issue where diff contains a revoked proxy", () => {
  class CardPlayGame extends Game {
    static updateState(state, action) {
      this.applyUpdate(state, fs => {
        const pos = fs.hands[action.player].indexOf(action.value);
        fs.hands[action.player].splice(pos, 1);
      });
    }
  }
  const s1 = { hands: { c: [9, 10] } };
  const { state: s2 } = CardPlayGame.playAction(s1, { player: "c", value: 9 });
  expect(s2).toEqual({ hands: { c: [10] } });
  const { state: s3 } = CardPlayGame.playAction(s2, { player: "c", value: 10 });
  expect(s3).toEqual({ hands: { c: [] } });
});

test("Ensure that modifying the state doesn't also modify diffs that were previously applied", () => {
  class TestGame extends Game {
    static updateState(state, action) {
      this.applyUpdate(state, fs => {
        fs.info = { foo: 1, secret: 2 };
      });
      state.info.public = 3;
    }
    static getFilters() {
      return s => {
        if (s.info) {
          delete s.info.secret;
        }
      };
    }
  }
  const { state, newInfo } = TestGame.playAction({}, {});
  expect(state).toEqual({ info: { foo: 1, secret: 2, public: 3 } });
  expect(newInfo).toEqual([[[["info"], { foo: 1 }]]]);
});
