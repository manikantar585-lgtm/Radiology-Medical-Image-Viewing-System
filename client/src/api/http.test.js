import {
  API_URL,
  authHeaders,
  clearSession,
  getStoredUser,
  installSessionExpiryHandler,
  isAuthenticated,
  jsonHeaders,
  saveSession,
} from "./http";

const session = { token: "abc.def.ghi", user: { id: 1, fullName: "Dr Test" } };

beforeEach(() => {
  localStorage.clear();
});

describe("session storage", () => {
  test("saves and reads the session", () => {
    saveSession(session);

    expect(isAuthenticated()).toBe(true);
    expect(getStoredUser()).toEqual(session.user);
  });

  test("clearSession signs the user out", () => {
    saveSession(session);
    clearSession();

    expect(isAuthenticated()).toBe(false);
    expect(getStoredUser()).toBeNull();
  });

  test("a stored user without a token is not authenticated", () => {
    localStorage.setItem("loggedInUser", JSON.stringify(session.user));
    expect(isAuthenticated()).toBe(false);
  });

  test("corrupt stored user data is treated as signed out", () => {
    localStorage.setItem("loggedInUser", "{not json");
    expect(getStoredUser()).toBeNull();
  });
});

describe("request headers", () => {
  test("include the bearer token when signed in", () => {
    saveSession(session);

    expect(authHeaders()).toEqual({ Authorization: "Bearer abc.def.ghi" });
    expect(jsonHeaders()).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer abc.def.ghi",
    });
  });

  test("are empty when signed out", () => {
    expect(authHeaders()).toEqual({});
  });
});

describe("installSessionExpiryHandler", () => {
  const originalFetch = window.fetch;
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { assign: jest.fn() };
  });

  afterEach(() => {
    window.fetch = originalFetch;
    window.location = originalLocation;
  });

  function mockFetchStatus(status) {
    window.fetch = jest.fn().mockResolvedValue({ status });
    installSessionExpiryHandler();
  }

  test("signs out when an API call returns 401", async () => {
    saveSession(session);
    mockFetchStatus(401);

    await window.fetch(`${API_URL}/api/patients`);

    expect(isAuthenticated()).toBe(false);
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  test("ignores 401 from login, which means wrong credentials", async () => {
    saveSession(session);
    mockFetchStatus(401);

    await window.fetch(`${API_URL}/api/login`, { method: "POST" });

    expect(isAuthenticated()).toBe(true);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("ignores successful responses", async () => {
    saveSession(session);
    mockFetchStatus(200);

    await window.fetch(`${API_URL}/api/patients`);

    expect(isAuthenticated()).toBe(true);
  });
});
