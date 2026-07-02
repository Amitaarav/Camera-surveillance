import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { env } from "@/config/env";

const JWT_ISSUER = "camera-surveillance";
const JWT_AUDIENCE = "camera-surveillance";
const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12,
  });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function createAccessJwt(
  payload: AuthTokenPayload,
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(jwtSecret);
}

export async function verifyJwtToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, jwtSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (
    !payload.sub ||
    typeof payload.sub !== "string" ||
    !payload.email ||
    typeof payload.email !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return { sub: payload.sub, email: payload.email as string };
}

export function createRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(64).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}
