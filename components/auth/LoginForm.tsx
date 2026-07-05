"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";

export function LoginForm() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, pin }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Invalid credentials");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <GlassCard className="card-padded shadow-[var(--shadow-md)]">
        <div className="mb-8 text-center">
          <p className="text-[0.733rem] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            OS2 Performance Apparel
          </p>
          <h1 className="mt-3 text-[1.2rem] font-semibold tracking-tight text-[var(--text-primary)]">
            Customer portal
          </h1>
          <p className="mt-2 text-[0.867rem] text-[var(--text-secondary)]">
            Enter your customer name and PIN
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <GlassInput
            label="Customer name"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="e.g. Fairhall School"
            autoComplete="username"
            required
          />
          <GlassInput
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-2.5 text-[0.867rem] text-red-700">
              {error}
            </p>
          )}

          <GlassButton type="submit" className="w-full !py-3" loading={loading}>
            Sign in
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
