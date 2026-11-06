import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, initialiseDatabase } from "@/lib/db";

const COOKIE = "auraly_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-change-me-before-production");

export type Session = { userId: string; loginId: string; role: "admin" | "participant"; condition: "A" | "B" | "C" | null };

export async function setSession(session: Session) {
  const token = await new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearSession() { (await cookies()).delete(COOKIE); }

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload as unknown as Session; } catch { return null; }
}

export async function requireUser(role?: Session["role"]) {
  const session = await getSession();
  if (!session || (role && session.role !== role)) redirect("/login");
  await initialiseDatabase();
  const result = await db().execute({ sql: "SELECT active FROM users WHERE id = ?", args: [session.userId] });
  if (!result.rows[0] || !Number(result.rows[0].active)) redirect("/login");
  return session;
}
