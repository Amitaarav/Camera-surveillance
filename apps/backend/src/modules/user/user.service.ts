import { HTTPException } from "hono/http-exception";
import * as repository from "./user.repository";
import type { UpdateProfileDto } from "./user.schema";

export async function getProfile(id: string) {
  const user = await repository.findUserById(id);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return { user };
}

export async function updateProfile(id: string, data: UpdateProfileDto) {
  const updatedUser = await repository.updateUser(id, data);

  if (!updatedUser) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return { user: updatedUser };
}
