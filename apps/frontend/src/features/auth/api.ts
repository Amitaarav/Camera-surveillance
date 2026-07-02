import { api } from "../../lib/axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post("/auth/logout", { refreshToken }),

  me: () =>
    api.get<{ user: { id: string; email: string; name: string } }>("/user/me").then((r) => r.data),
};
