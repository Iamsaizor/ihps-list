"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [, setResend] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email_confirmed_at) {
        router.replace(next);
      }
    });
  }, [next, router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const { data, error: signError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signError) throw signError;

      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setResend(true);

        throw new Error(
          "Verify your email before submitting records. Check your inbox."
        );
      }

      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail() {
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${
            window.location.origin
          }/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (resendError) throw resendError;

      setNotice(
        "Verification email requested. Check your inbox and spam folder."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not resend verification email."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101014] px-4 py-12 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1b1b20] p-7">
        <Link
          href="/"
          className="text-3xl font-black text-orange-500"
        >
          ihPS
        </Link>

        <h1 className="mt-5 text-3xl font-extrabold">LOG IN</h1>

        <p className="mt-2 text-sm text-gray-400">
          Sign in with your verified account to submit records.
        </p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input
              className={`${field} mt-2`}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            Password
            <input
              className={`${field} mt-2`}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {notice && (
            <p
              role="status"
              className="rounded-lg bg-green-500/10 p-3 text-sm text-green-300"
            >
              {notice}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 font-extrabold disabled:opacity-50"
          >
            {busy ? "PLEASE WAIT..." : "LOG IN"}
          </button>
        </form>

        <button
          disabled={busy || !email.trim()}
          onClick={resendEmail}
          className="mt-4 text-sm text-orange-400 underline disabled:opacity-40"
        >
          Resend verification email
        </button>

        <p className="mt-5 text-sm text-gray-400">
          New to ihPS?{" "}
          <Link
            className="font-bold text-orange-400 underline"
            href={`/register?next=${encodeURIComponent(next)}`}
          >
            Create an account
          </Link>
        </p>

        <Link
          href="/"
          className="mt-4 block text-sm text-gray-500 underline"
        >
          ← Browse lists as a guest
        </Link>
      </div>
    </main>
  );
}

// Fixes the Next.js production prerendering error.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#101014] px-4 py-12 text-white">
          <div className="mx-auto max-w-md text-center text-gray-400">
            Loading login...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}