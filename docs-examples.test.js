import Game from "./game";

test("Basic example from the docs works as advertised", () => {
  const startState = { doors: { [1]: "goat", [2]: "goat", [3]: "car" } };

  class MontyHall extends Game {
    static updateState(state, action) {
      if (action.type == "open") {
        state.prize = state.doors[action.door];
      }
    }
  }

  const { state } = MontyHall.playAction(startState, { type: "open", door: 1 });
  expect(state).toEqual({
    doors: { [1]: "goat", [2]: "goat", [3]: "car" },
    prize: "goat"
  });

  const view = MontyHall.replayAction(startState, { type: "open", door: 1 });
  expect(view).toEqual({
    doors: { [1]: "goat", [2]: "goat", [3]: "car" },
    prize: "goat"
  });
});

test("Incorrect information-hiding example from the docs fails as advertised", () => {
  const startState = { doors: { [1]: "goat", [2]: "goat", [3]: "car" } };

  class MontyHall extends Game {
    static updateState(state, action) {
      if (action.type == "open") {
        state.prize = state.doors[action.door];
      }
    }
    static getFilters() {
      return state => {
        delete state.doors;
      };
    }
  }

  const clientView = MontyHall.filter(startState);
  expect(clientView).toEqual({});
  expect(() =>
    MontyHall.playAction(startState, { type: "open", door: 1 })
  ).toThrow();
});

test("Correct information-hiding example from the docs works as advertised", () => {
  const startState = {
    doors: { [1]: "goat", [2]: "goat", [3]: "car" },
    openDoors: {}
  };

  class MontyHall extends Game {
    static updateState(state, action) {
      if (action.type == "open") {
        this.applyUpdate(state, fullState => {
          fullState.openDoors[action.door] = fullState.doors[action.door];
        });
        state.prize = state.openDoors[action.door];
      }
    }
    static getFilters() {
      return state => {
        delete state.doors;
      };
    }
  }

  const { state, newInfo } = MontyHall.playAction(startState, {
    type: "open",
    door: 1
  });
  expect(state).toEqual({
    ...startState,
    openDoors: { 1: "goat" },
    prize: "goat"
  });

  const clientView = MontyHall.filter(startState);
  const newClientView = MontyHall.replayAction(
    clientView,
    { type: "open", door: 1 },
    newInfo
  );
  expect(newClientView).toEqual({ openDoors: { 1: "goat" }, prize: "goat" });
  expect(newInfo).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              Array [
                "openDoors",
                "1",
              ],
              "goat",
            ],
          ],
        ]
    `);
});

test("Example of how not to do randomness fails", () => {
  class BadRandomGame extends Game {
    static updateState(state, _) {
      state.randomNumber = Math.random();
    }
  }
  expect(() => BadRandomGame.playAction({}, {})).toThrow();
});

test("Example of how to do randomness succeeds", () => {
  class GoodRandomGame extends Game {
    static updateState(state, _) {
      this.applyUpdate(state, fs => {
        fs.randomNumber = Math.random();
      });
    }
  }
  expect(() => GoodRandomGame.playAction({}, {})).not.toThrow();
});

test("Example with hidden information works as advertised", () => {
  const startState = { total: 0, hands: { a: [2, 3, 7], b: [4, 5, 6] } };

  class CardPlayGame extends Game {
    static getFilters() {
      return {
        a: s => {
          delete s.hands.b;
        },
        b: s => {
          delete s.hands.a;
        }
      };
    }
    static updateState(state, action) {
      this.applyUpdate(state, fs => {
        const pos = fs.hands[action.player].indexOf(action.value);
        fs.hands[action.player].splice(pos, 1);
      });
      state.total += action.value;
    }
  }

  const action = { player: "a", value: 3 };
  const { state: newState, newInfos } = CardPlayGame.playAction(
    startState,
    action
  );
  expect(newState).toEqual({ total: 3, hands: { a: [2, 7], b: [4, 5, 6] } });

  const aStartView = CardPlayGame.filter(startState, "a");
  const aNewView = CardPlayGame.replayAction(aStartView, action, newInfos.a);
  expect(aNewView).toEqual({ total: 3, hands: { a: [2, 7] } });

  const bStartView = CardPlayGame.filter(startState, "b");
  const bNewView = CardPlayGame.replayAction(bStartView, action, newInfos.b);
  expect(bNewView).toEqual({ total: 3, hands: { b: [4, 5, 6] } });

  expect(newInfos).toMatchInlineSnapshot(`
    Object {
      "a": Array [
        Array [
          Array [
            Array [
              "hands",
              "a",
              1,
            ],
          ],
        ],
      ],
      "b": Array [
        Array [],
      ],
    }
  `);
});

test("Second example with hidden information works as advertised", () => {
  const startState = { total: 10, hands: { a: [2, 3, 7], b: [4, 5, 6], c: [9, 10] } };

  class CardPlayGame extends Game {
    static getFilters(state) {
      const filters = {}
      for (let playerID in state.hands) {
        filters[playerID] = s => {
          s.handCounts = {}
          for (let p in s.hands) {
            s.handCounts[p] = s.hands[p].length
          }
          s.hands = { [playerID]: s.hands[playerID] }
        }
      }
      return filters
    }
    static updateState(state, action) {
      this.applyUpdate(state, fs => {
        const pos = fs.hands[action.player].indexOf(action.value);
        fs.hands[action.player].splice(pos, 1);
      });
      state.total += action.value;
    }
  }

  const action = { player: "a", value: 3 };
  const { state: newState, newInfos } = CardPlayGame.playAction(
    startState,
    action
  );
  expect(newState).toEqual({ total: 13, hands: { a: [2, 7], b: [4, 5, 6], c: [9, 10] } });

  const bStartView = CardPlayGame.filter(startState, "b");
  const bNewView = CardPlayGame.replayAction(bStartView, action, newInfos.b);
  expect(bNewView).toEqual({ total: 13, hands: { b: [4, 5, 6] }, handCounts: { a: 2, b: 3, c: 2} });
})
