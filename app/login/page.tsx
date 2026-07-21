"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", { name, password, redirect: false });

    setLoading(false);
    if (!res || res.error) {
      setError("Something went wrong signing in. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Kitchen Stock Manager</h1>
        <p className="mb-6 text-sm text-muted-foreground">Enter your name and your family&apos;s password</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
          />
          <input
            type="password"
            required
            placeholder="Family password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New family? Just make up a password and enter it above with your name — the first
          time it&apos;s used creates your family&apos;s space. Share that same password with your
          family so everyone can join and see the same stock.
        </p>
      </div>
    </div>
  );
}
