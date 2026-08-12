import LoginForm from "@/app/login/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  return <main className="center-page"><section className="login-card">
    <div className="brand-mark">A</div><p className="eyebrow">RESEARCH STUDY</p><h1>Welcome to Auraly</h1>
    <p className="muted">Enter the anonymous credentials provided by the researcher. Do not share them.</p>
    {error && <div className="error" role="alert">The login ID or password was not accepted.</div>}
    <LoginForm />
    <p className="privacy-note">Auraly stores your study activity under an anonymous participant ID. It does not request your name or email.</p>
  </section></main>;
}
