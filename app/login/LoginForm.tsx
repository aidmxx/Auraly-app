"use client";

import { useFormStatus } from "react-dom";
import { login } from "@/app/actions";

function LoginButton() {
  const { pending } = useFormStatus();

  return <button className="primary" disabled={pending}>{pending ? "Signing in…" : "Continue securely"}</button>;
}

export default function LoginForm() {
  return <form action={login} className="stack">
    <label>Anonymous login ID<input name="loginId" autoComplete="username" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
    <LoginButton />
  </form>;
}
