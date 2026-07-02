import * as authService from "./auth.service";

export const register = async (c: any) => {
  const data = c.req.valid("json");
  const result = await authService.registerUser(data);
  return c.json(result, 201);
};

export const login = async (c: any) => {
  const data = c.req.valid("json");
  const result = await authService.loginUser(data);
  return c.json(result);
};

export const refresh = async (c: any) => {
  const data = c.req.valid("json");
  const result = await authService.refreshUserToken(data);
  return c.json(result);
};

export const logout = async (c: any) => {
  const data = c.req.valid("json");
  await authService.logoutUser(data);
  return c.body(null, 204);
};
