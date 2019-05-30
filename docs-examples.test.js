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
      state.randomNumber = Math.random()
    }
  }
  expect(() => BadRandomGame.playAction({}, {})).toThrow()
})

test("Example of how to do randomness succeeds", () => {
  class GoodRandomGame extends Game {
    static updateState(state, _) {
      this.applyUpdate(state, fs => {
        fs.randomNumber = Math.random()
      })
    }
  }
  expect(() => GoodRandomGame.playAction({}, {})).not.toThrow()
})
