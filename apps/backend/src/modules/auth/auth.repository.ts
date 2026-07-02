import { db, eq, and } from "@/db/client";
import { users, refreshTokens } from "@repo/db/schema";
import type { RegisterDto } from "./auth.schema";

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function findUserById(id: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id));
  return user;
}

export async function createUser(data: RegisterDto & { passwordHash: string }) {
  const [createdUser] = await db
    .insert(users)
    .values({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  return createdUser;
}

export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function findValidRefreshToken(tokenHash: string) {
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
      ),
    );
  return storedToken;
}

export async function revokeRefreshTokenById(id: string) {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, id));
}

export async function revokeRefreshTokenByHash(tokenHash: string) {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
      ),
    );
}
