import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import assistantAvatar from "@/assets/assistant-avatar.png";

type Rule = { label: string; pass: boolean };

function usePasswordRules(pw: string): Rule[] {
  return useMemo(
    () => [
      { label: "At least 8 characters", pass: pw.length >= 8 },
      { label: "Uppercase letter (A-Z)", pass: /[A-Z]/.test(pw) },
      { label: "Lowercase letter (a-z)", pass: /[a-z]/.test(pw) },
      { label: "Number (0-9)", pass: /\d/.test(pw) },
      { label: "Special character (!@#$…)", pass: /[^A-Za-z0-9]/.test(pw) },
    ],
    [pw],
  );
}

function strengthScore(rules: Rule[]): number {
  return rules.filter((r) => r.pass).length;
}

const STRENGTH_META = [
  { label: "Very weak", color: "bg-red-500", text: "text-red-500" },
  { label: "Weak", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Fair", color: "bg-yellow-500", text: "text-yellow-500" },
  { label: "Good", color: "bg-lime-500", text: "text-lime-500" },
  { label: "Strong", color: "bg-green-500", text: "text-green-500" },
  { label: "Very strong", color: "bg-green-600", text: "text-green-600" },
];

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — EduFlix Assistant" },
      { name: "description", content: "Sign in to chat with EduFlix's AI learning assistant and save your conversations." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRules = usePasswordRules(password);
  const score = strengthScore(passwordRules);
  const strength = STRENGTH_META[score];
  const passwordsMatchRules = score === 5;

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        if (!passwordsMatchRules) {
          setError("Please choose a password that meets all the strength requirements.");
          setBusy(false);
          return;
        }
        const { error: suError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { role } },
        });
        if (suError) throw suError;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: "/dashboard" });


      } else {

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="glass rounded-2xl border border-border p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={assistantAvatar} alt="EduFlix assistant" width={64} height={64} className="h-16 w-16" loading="lazy" />
          <h1 className="mt-3 text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat with the EduFlix learning assistant and keep your study threads.
          </p>
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none ring-primary/50 focus:ring-2"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 pr-10 text-sm outline-none ring-primary/50 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === "signup" && password.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-border bg-card/40 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Password strength</span>
                <span className={`text-xs font-semibold ${strength.text}`}>
                  {strength.label}
                </span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < score ? strength.color : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <ul className="mt-1 space-y-0.5">
                {passwordRules.map((r) => (
                  <li key={r.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {r.pass ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground/60" />
                    )}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === "signup" && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">I am a…</p>
              <div className="grid grid-cols-2 gap-2">
                {(["student", "teacher"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                      role === r
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-primary">{notice}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to EduFlix?" : "Already have an account?"}{" "}
          <button
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <GraduationCap className="h-3.5 w-3.5" /> Back to EduFlix
          </Link>
        </p>
      </div>
    </div>
  );
}
