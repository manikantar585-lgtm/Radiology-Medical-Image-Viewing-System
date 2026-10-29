const { assertStrongPassword } = require("../src/services/userService");

describe("assertStrongPassword", () => {
  it.each(["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"])(
    "rejects %s",
    (password) => {
      expect(() => assertStrongPassword(password)).toThrow(/at least 8 characters/);
    }
  );

  it("accepts a password with upper, lower and digit", () => {
    expect(() => assertStrongPassword("Secret123")).not.toThrow();
  });
});
