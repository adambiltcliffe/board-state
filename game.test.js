import Game from "./game";

// Most of the core functionality is tested by testing the examples instead

test("If getFilters() is not overridden, filter() returns the input unchanged", () => {
  const before = { hi: "bye" };
  expect(Game.filter(before)).toEqual(before);
});

test("Complicated test to track down immer issue", () => {
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
});
