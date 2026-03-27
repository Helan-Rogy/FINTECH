"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Eye, EyeOff, Loader } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Login failed.");
        return;
      }
      const role = data.user?.role;
      if (role === "analyst" || role === "admin") {
        router.push("/analyst");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(e: React.MouseEvent, demoEmail: string) {
    e.preventDefault();
    setEmail(demoEmail);
    setPassword("demo-password");
    setError(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <ShieldAlert size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">FinTech AI Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition"
            >
              {loading && <Loader size={14} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Demo accounts — click to fill:</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "User", email: "user@demo.com" },
              { label: "Analyst", email: "analyst@demo.com" },
              { label: "Admin", email: "admin@demo.com" },
            ].map(({ label, email: dEmail }) => (
              <button
                key={dEmail}
                onClick={(e) => fillDemo(e, dEmail)}
                className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 rounded px-3 py-2 bg-card transition"
              >
                <span className="font-medium text-foreground">{label}</span>
                <span className="font-mono">{dEmail}</span>
              </button>
            ))}
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Password: <span className="font-mono text-foreground">demo-password</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
