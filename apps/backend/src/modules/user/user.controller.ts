import * as userService from "./user.service";

export const getMe = async (c: any) => {
  const { sub } = c.get("user");
  const result = await userService.getProfile(sub);
  return c.json(result);
};

export const patchMe = async (c: any) => {
  const { sub } = c.get("user");
  const data = c.req.valid("json");
  const result = await userService.updateProfile(sub, data);
  return c.json(result);
};
