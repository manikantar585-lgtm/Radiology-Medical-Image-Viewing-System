/*
 * Shared API configuration and session storage.
 *
 * The backend identifies users only by the signed JWT sent in the
 * Authorization header. The cached user object is for display; it is never
 * trusted by the server.
 */

export const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(
  /\/$/,
  ""
);

const TOKEN_KEY = "authToken";
const USER_KEY = "loggedInUser";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken() && getStoredUser());
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Headers that authenticate a request to the API. */
export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated headers for JSON request bodies. */
export function jsonHeaders() {
  return { "Content-Type": "application/json", ...authHeaders() };
}

/**
 * Signs the user out when the API rejects their session (expired or invalid
 * token), instead of leaving every page to show its own fetch error.
 * Login/register failures are excluded: those 401s mean wrong credentials.
 */
export function installSessionExpiryHandler() {
  const originalFetch = window.fetch.bind(window);
  const publicPaths = ["/api/login", "/api/register"];

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === "string" ? input : input?.url || "";

    if (
      response.status === 401 &&
      url.startsWith(API_URL) &&
      !publicPaths.some((path) => url.startsWith(`${API_URL}${path}`)) &&
      getToken()
    ) {
      clearSession();
      window.location.assign("/");
    }
    return response;
  };
}
