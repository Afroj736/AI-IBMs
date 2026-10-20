/**
 * Resolves API base URL for browser requests.
 * When the app is opened via LAN IP (e.g. http://192.168.x.x:3000),
 * localhost would point at the wrong machine — use the same host for port 8000.
 */
export function resolveApiV1BaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000/api/v1`;
    }
  }

  return configured.replace(/\/$/, "");
}

export function resolveApiRootUrl(): string {
  return resolveApiV1BaseUrl().replace(/\/api\/v1\/?$/, "");
}
