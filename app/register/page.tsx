"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const field =
  "w-full rounded-lg border border-white/15 bg-[#101014] px-4 py-3 text-white outline-none focus:border-orange-500";

function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : "/submit";
}

function RegisterPageContent() {
  const params = useSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const next = safeNext(params.get("next"));

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      setError(
        "Username must be 3–24 characters: letters, numbers or underscores."
      );
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const redirectTo = `${
        window.location.origin
      }/auth/callback?next=${encodeURIComponent(next)}`;

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            username: username.trim(),
          },
        },
      });

      if (signError) throw signError;

      if (!data.user) {
        throw new Error("Account registration did not complete.");
      }

      // The submission RPC verifies email confirmation server-side.
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101014] px-4 py-12 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1b1b20] p-7 shadow-xl">
        <Link
          href="/"
          className="text-3xl font-black text-orange-500"
        >
          ihPS
        </Link>

        <h1 className="mt-5 text-3xl font-extrabold">
          CREATE AN ACCOUNT
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          Browsing lists is free. A verified account is required
          to submit records.
        </p>

        {done ? (
          <div className="mt-7 rounded-lg border border-green-500/30 bg-green-500/10 p-5">
            <h2 className="font-bold text-green-300">
              Check your email!
            </h2>

            <p className="mt-2 text-sm text-gray-200">
              We sent a verification link to{" "}
              <strong>{email}</strong>. Open it to confirm your
              account, then sign in to submit records. Check spam
              if it doesn't arrive.
            </p>

            <Link
              className="mt-4 inline-block font-bold text-orange-400 underline"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              Go to login →
            </Link>
          </div>
        ) : (
          <form onSubmit={register} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Username
              <input
                className={`${field} mt-2`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                maxLength={24}
                placeholder="Nycto"
              />
            </label>

            <label className="block text-sm font-semibold">
              Email address
              <input
                className={`${field} mt-2`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-semibold">
              Password
              <input
                className={`${field} mt-2`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label className="block text-sm font-semibold">
              Confirm password
              <input
                className={`${field} mt-2`}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              disabled={busy}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 font-extrabold disabled:opacity-50"
            >
              {busy ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            className="font-bold text-orange-400 underline"
            href={`/login?next=${encodeURIComponent(next)}`}
          >
            Log in
          </Link>
        </p>

        <Link
          className="mt-4 block text-sm text-gray-500 underline"
          href="/"
        >
          ← View lists without an account
        </Link>
      </div>
    </main>
  );
}

// Suspense boundary fixes Next.js production prerendering.
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] px-4 py-12 text-white">
          <div className="mx-auto max-w-md text-center text-gray-400">
            Loading registration...
          </div>
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}