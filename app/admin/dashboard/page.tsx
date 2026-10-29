"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type StaffAccess = { is_founder: boolean; list_id: string };
type ListRow = { id: string; name: string };
type Tile = { title: string; detail: string; href: string; icon: string; badge?: string };

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [founder, setFounder] = useState(false);
  const [moderatedLists, setModeratedLists] = useState<string[]>([]);
  const [listNames, setListNames] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !authData.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      const [accessResult, listsResult] = await Promise.all([
        supabase.rpc("ihps_my_staff_access"),
        supabase.from("lists").select("id,name"),
      ]);
      if (!alive) return;
      if (accessResult.error) {
        setError(accessResult.error.message);
        setLoading(false);
        return;
      }
      const access = (accessResult.data ?? []) as StaffAccess[];
      const lists = (listsResult.data ?? []) as ListRow[];
      const isFounder = access.some((row) => row.is_founder);
      const ids = [...new Set(access.map((row) => row.list_id))];
      setFounder(isFounder);
      setModeratedLists(ids);
      setListNames(lists.filter((list) => ids.includes(list.id)).map((list) => list.name));
      if (listsResult.error) setError(listsResult.error.message);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  const tiles: Tile[] = [
    ...(founder ? [{
      title: "LIST MANAGEMENT", detail: "Add, edit, delete and reorder levels across the ihPS lists.",
      href: "/admin", icon: "▤", badge: "FOUNDER",
    }] : []),
    ...(founder || moderatedLists.length ? [{
      title: "SUBMISSION REVIEWS", detail: "Review records, reverse decisions and view moderation history for your assigned lists.",
      href: "/admin/submissions", icon: "✓", badge: founder ? "ALL LISTS" : "ASSIGNED LISTS",
    }] : []),
    ...(founder ? [{
      title: "STAFF MANAGEMENT", detail: "Promote or remove moderators and assign their list-review permissions.",
      href: "/admin/staff", icon: "♛", badge: "FOUNDERS ONLY",
    }] : []),
  ];

  return (
    <main className="min-h-screen bg-[#101014] px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link href="/" className="text-3xl font-black text-[#ff7900]">ihPS</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">ADMIN PANEL</h1>
            <p className="mt-1 text-sm text-[#a4a6b7]">Choose where you want to go.</p>
          </div>
          <Link href="/" className="rounded-lg bg-[#26262d] px-4 py-2 text-sm font-bold hover:bg-[#36363f]">← VIEW LISTS</Link>
        </header>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[#1b1b21] p-6 text-[#a4a6b7]">Checking staff permissions…</div>
        ) : !signedIn ? (
          <section className="rounded-xl border border-white/10 bg-[#1b1b21] p-7">
            <h2 className="text-xl font-black">STAFF LOGIN REQUIRED</h2>
            <p className="mt-2 text-sm text-[#a4a6b7]">Sign in with your ihPS account to see your authorized tools.</p>
            <Link href="/admin/staff/login" className="mt-5 inline-block rounded-lg bg-[#ff7900] px-5 py-3 font-bold text-white">STAFF LOGIN →</Link>
          </section>
        ) : error ? (
          <div className="rounded-xl border border-red-700/60 bg-red-950/20 p-5 text-red-300">Unable to load staff access: {error}</div>
        ) : !tiles.length ? (
          <section className="rounded-xl border border-white/10 bg-[#1b1b21] p-7">
            <h2 className="text-xl font-black">NO STAFF PERMISSIONS</h2>
            <p className="mt-2 text-sm text-[#a4a6b7]">Your account is signed in, but it has not been assigned to any list. Ask a founder to grant access.</p>
            <Link href="/profile" className="mt-5 inline-block text-[#ff7900] hover:underline">Return to player area →</Link>
          </section>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-[#ff7900]/15 px-3 py-1 text-xs font-black text-[#ff9500]">{founder ? "FOUNDER" : "LIST MODERATOR"}</span>
              <span className="text-sm text-[#a4a6b7]">{founder ? "Access to all staff tools" : `Review access: ${listNames.join(", ") || "Assigned lists"}`}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((tile) => (
                <Link key={tile.href} href={tile.href} className="group flex min-h-[215px] flex-col rounded-xl border border-white/10 bg-[#1b1b21] p-6 transition hover:border-[#ff7900]/70 hover:bg-[#232329]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl font-black text-[#ff7900]">{tile.icon}</span>
                    {tile.badge && <span className="rounded bg-[#ff7900]/15 px-2 py-1 text-[10px] font-black tracking-wide text-[#ff9500]">{tile.badge}</span>}
                  </div>
                  <h2 className="mt-6 text-lg font-black">{tile.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[#a4a6b7]">{tile.detail}</p>
                  <span className="mt-5 text-sm font-black text-[#ff7900]">OPEN →</span>
                </Link>
              ))}
            </div>
            <p className="mt-7 text-xs leading-5 text-[#77798b]">Menu visibility is based on your staff role. Each destination must also enforce permissions through Supabase; hiding a link is not a security boundary.</p>
          </>
        )}
      </div>
    </main>
  );
}
