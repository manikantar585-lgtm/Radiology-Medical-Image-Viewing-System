import { formatDate } from "./format";
import { DEFAULT_HOTKEYS, getSavedHotkeys, normalizeHotkey, saveHotkeys } from "./hotkeys";

describe("formatDate", () => {
  test("formats ISO dates", () => {
    expect(formatDate("2026-01-05T10:00:00Z")).toBe("05 Jan 2026");
  });

  test.each([null, undefined, ""])("returns a dash for %p", (value) => {
    expect(formatDate(value)).toBe("-");
  });

  test("returns unparseable input unchanged", () => {
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("hotkeys", () => {
  beforeEach(() => localStorage.clear());

  test("fall back to defaults when nothing is saved", () => {
    expect(getSavedHotkeys()).toEqual(DEFAULT_HOTKEYS);
  });

  test("merge saved bindings over the defaults", () => {
    saveHotkeys({ zoomIn: "I" });
    expect(getSavedHotkeys()).toEqual({ ...DEFAULT_HOTKEYS, zoomIn: "I" });
  });

  test("ignore corrupt saved data", () => {
    localStorage.setItem("radiologyHotkeys", "{bad");
    expect(getSavedHotkeys()).toEqual(DEFAULT_HOTKEYS);
  });

  test.each([
    ["Space", " "],
    ["Esc", "escape"],
    [" ArrowDown ", "arrowdown"],
    ["R", "r"],
  ])("normalizeHotkey(%p) is %p", (input, expected) => {
    expect(normalizeHotkey(input)).toBe(expected);
  });
});
