const TOKEN_KEY = "surveillance_tokens";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getTokens() !== null;
}
