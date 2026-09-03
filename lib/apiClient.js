// Single place that knows the app's own base URL, so it isn't hardcoded
// (or duplicated) in every component that calls the API.
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export function apiUrl(path) {
  return `${BASE_URL}${path}`;
}

// Thin wrapper around fetch() that all client components should use to talk
// to our own /api routes, so the base URL and cookie behavior stay consistent.
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    credentials: "same-origin",
    ...options,
  });
}
