import { HTTPException } from "hono/http-exception";
import * as repository from "./auth.repository";
import {
  hashPassword,
  verifyPassword,
  createAccessJwt,
  createRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} from "./auth.utils";
import type { LoginDto, RegisterDto, RefreshDto, LogoutDto } from "./auth.schema";

async function issueTokenPair(userId: string, email: string) {
  const accessToken = await createAccessJwt({ sub: userId, email });
  const { raw, hash } = createRefreshToken();
  const expiresAt = refreshTokenExpiresAt();

  await repository.storeRefreshToken(userId, hash, expiresAt);

  return { accessToken, refreshToken: raw };
}

export async function registerUser(data: RegisterDto) {
  const existingUser = await repository.findUserByEmail(data.email);

  if (existingUser) {
    throw new HTTPException(409, { message: "Email already registered" });
  }

  const passwordHash = await hashPassword(data.password);
  const createdUser = await repository.createUser({ ...data, passwordHash });

  if (!createdUser) {
    throw new HTTPException(500, { message: "Failed to create user" });
  }

  const tokens = await issueTokenPair(createdUser.id, createdUser.email);

  return { user: createdUser, ...tokens };
}

export async function loginUser(data: LoginDto) {
  const user = await repository.findUserByEmail(data.email);

  if (!user) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const validPassword = await verifyPassword(data.password, user.passwordHash);
  if (!validPassword) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const tokens = await issueTokenPair(user.id, user.email);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  };
}

export async function refreshUserToken(data: RefreshDto) {
  const tokenHash = hashToken(data.refreshToken);
  const storedToken = await repository.findValidRefreshToken(tokenHash);

  if (!storedToken) {
    throw new HTTPException(401, {
      message: "Invalid or expired refresh token",
    });
  }

  if (storedToken.expiresAt < new Date()) {
    throw new HTTPException(401, { message: "Refresh token expired" });
  }

  const user = await repository.findUserById(storedToken.userId);

  if (!user) {
    throw new HTTPException(401, { message: "User not found" });
  }

  await repository.revokeRefreshTokenById(storedToken.id);
  const tokens = await issueTokenPair(user.id, user.email);

  return tokens;
}

export async function logoutUser(data: LogoutDto) {
  const tokenHash = hashToken(data.refreshToken);
  await repository.revokeRefreshTokenByHash(tokenHash);
}
