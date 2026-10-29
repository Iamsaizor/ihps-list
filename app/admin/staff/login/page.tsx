"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data, error: rpcError } = await supabase.rpc("ihps_is_founder", { p_user: user.id });
      if (active && !rpcError && data === true) router.replace("/admin/staff");
    }
    void checkSession();
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("Could not verify the account.");
      if (!data.user.email_confirmed_at) throw new Error("Verify your email first.");

      const { data: isFounder, error: founderError } = await supabase.rpc(
        "ihps_is_founder", { p_user: data.user.id }
      );
      if (founderError) throw founderError;
      if (isFounder !== true) throw new Error("Founder access required. This account is not authorized.");

      router.replace("/admin/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#101014] text-white flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#1c1c21] p-8">
        <Link href="/" className="text-3xl font-black text-[#ff7900]">ihPS</Link>
        <p className="mt-6 text-xs font-bold tracking-widest text-[#ff7900]">AUTHORIZED PERSONNEL</p>
        <h1 className="mt-2 text-3xl font-black">FOUNDER LOGIN</h1>
        <p className="mt-2 text-sm text-gray-400">Sign in with an account authorized to manage ihPS staff.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Email
            <input type="email" required autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-[#101014] p-3 outline-none focus:border-orange-500" />
          </label>
          <label className="block text-sm font-semibold">Password
            <input type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-[#101014] p-3 outline-none focus:border-orange-500" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-600 p-3 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[#ff7900] px-4 py-3 font-black disabled:opacity-50">
            {loading ? "CHECKING ACCESS..." : "SIGN IN"}
          </button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-gray-400">← Back to ihPS</Link>
      </section>
    </main>
  );
}
