import { db, eq } from "@/db/client";
import { users } from "@repo/db/schema";
import type { UpdateProfileDto } from "./user.schema";

export async function findUserById(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id));

  return user;
}

export async function updateUser(id: string, data: UpdateProfileDto) {
  const [updatedUser] = await db
    .update(users)
    .set({ name: data.name })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  return updatedUser;
}
