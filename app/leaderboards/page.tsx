"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = {
  user_id: string; username: string; display_name: string | null;
  country_code: string | null; region: string | null; avatar_url: string | null;
  created_at: string; demon_points: number | string; challenge_points: number | string;
  overall_points: number | string; demon_records: number; challenge_records: number;
};
type Board = "overall" | "demon" | "challenge";
const PAGE_SIZE = 25;
const boards: { id: Board; title: string; description: string }[] = [
  { id: "overall", title: "OVERALL", description: "Demon + Challenge points" },
  { id: "demon", title: "DEMON LIST", description: "Only Demon List records" },
  { id: "challenge", title: "CHALLENGE LIST", description: "Only Challenge List records" },
];
function flag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...Array.from(code, c => 127397 + c.charCodeAt(0)));
}
function safeAvatar(url: string | null) {
  if (!url) return null;
  try { return new URL(url).protocol === "https:" ? url : null; } catch { return null; }
}
function points(value: number | string) { return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function LeaderboardsPage() {
  const [board, setBoard] = useState<Board>("overall");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const column = `${board}_points`;
  const activeBoard = useMemo(() => boards.find(b => b.id === board)!, [board]);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => { if (alive) setUserId(data.user?.id ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUserId(session?.user.id ?? null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      let query = supabase.from("player_leaderboard_points")
        .select("user_id,username,display_name,country_code,region,avatar_url,created_at,demon_points,challenge_points,overall_points,demon_records,challenge_records", { count: "exact" });
      const term = search.trim().replace(/[%,()]/g, "");
      if (term) query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      const result = await query.order(column, { ascending: false })
        .order("username", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!alive) return;
      if (result.error) { setError(result.error.message); setPlayers([]); setCount(0); }
      else { setPlayers((result.data ?? []) as Player[]); setCount(result.count ?? 0); }
      setLoading(false);
    }, search ? 250 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [board, search, page, column]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <main className="min-h-screen bg-[#101014] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <Link href="/" className="text-3xl font-black text-orange-500">ihPS</Link>
          <nav className="flex flex-wrap gap-2 text-sm font-extrabold">
            <Link href="/" className="rounded-lg bg-[#29292f] px-4 py-2 hover:bg-[#38383f]">VIEW LISTS</Link>
            <Link href="/leaderboards" className="rounded-lg bg-orange-500 px-4 py-2">LEADERBOARDS</Link>
            <Link href="/profile" className="rounded-lg bg-[#29292f] px-4 py-2 hover:bg-[#38383f]">PLAYER AREA</Link>
            <Link href="/submit" className="rounded-lg bg-[#29292f] px-4 py-2 hover:bg-[#38383f]">SUBMIT RECORD</Link>
          </nav>
        </header>
        <section className="mb-6 rounded-xl border border-white/10 bg-[#1b1b20] p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-400">ihPS competitive rankings</p>
          <h1 className="mt-1 text-4xl font-black">PLAYER LEADERBOARDS</h1>
          <p className="mt-3 text-sm text-gray-400">Points update automatically when records are accepted or rejected and when levels change positions.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {boards.map(b => <button key={b.id} onClick={() => { setBoard(b.id); setPage(1); }}
              className={`rounded-lg border px-4 py-4 text-left transition ${board === b.id ? "border-orange-500 bg-orange-500/15" : "border-white/10 bg-[#111115] hover:bg-white/5"}`}>
              <span className={`block text-sm font-black ${board === b.id ? "text-orange-400" : "text-white"}`}>{b.title}</span>
              <span className="mt-1 block text-xs text-gray-400">{b.description}</span>
            </button>)}
          </div>
          <label className="mt-5 block text-xs font-bold text-gray-300">SEARCH PLAYERS
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search usernames or display names..." className="mt-2 block w-full rounded-lg border border-white/15 bg-[#111115] px-4 py-3 text-sm text-white outline-none focus:border-orange-500" />
          </label>
        </section>
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#1b1b20]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div><h2 className="text-xl font-black">{activeBoard.title} RANKINGS</h2><p className="mt-1 text-xs text-gray-400">{activeBoard.description}</p></div>
            <span className="text-sm font-bold text-orange-400">{loading ? "Loading..." : `${count.toLocaleString()} players`}</span>
          </div>
          {error ? <p className="p-6 text-red-300" role="alert">Unable to load rankings: {error}. Did you run ihps_live_points.sql?</p>
            : loading ? <p className="p-8 text-gray-400">Loading rankings...</p>
            : players.length === 0 ? <p className="p-8 text-gray-400">No players found.</p>
            : <div className="divide-y divide-white/5">
              {players.map((p, index) => <Link key={p.user_id} href={`/players/${encodeURIComponent(p.username)}`}
                className="flex items-center gap-3 px-4 py-4 transition hover:bg-white/5 sm:gap-5 sm:px-6">
                <span className={`w-9 shrink-0 text-center text-lg font-black ${page === 1 && index < 3 ? "text-orange-400" : "text-gray-500"}`}>#{(page - 1) * PAGE_SIZE + index + 1}</span>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#111115] text-2xl">
                  {safeAvatar(p.avatar_url) ? <img src={safeAvatar(p.avatar_url)!} alt="" className="h-full w-full object-cover" /> : flag(p.country_code)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="truncate font-black">{p.display_name?.trim() || p.username}</span><span>{flag(p.country_code)}</span>{p.user_id === userId && <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-black text-orange-400">YOU</span>}</div>
                  <p className="truncate text-xs text-gray-400">@{p.username}{p.region ? ` · ${p.region}` : ""}</p>
                  <p className="mt-1 text-xs text-gray-500">{p.demon_records} demon · {p.challenge_records} challenge records</p>
                </div>
                <div className="text-right"><div className="text-lg font-black text-orange-400">{points(p[column as keyof Pick<Player, "overall_points" | "demon_points" | "challenge_points">])}</div><div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{board} pts</div></div>
                <span className="font-black text-orange-400">›</span>
              </Link>)}
            </div>}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-sm">
            <span className="text-gray-400">{count ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, count)} of ${count}` : "No players"}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg bg-[#303037] px-4 py-2 font-bold disabled:opacity-30">← Previous</button>
              <span className="px-2 font-bold">{page} / {totalPages}</span>
              <button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg bg-[#303037] px-4 py-2 font-bold disabled:opacity-30">Next →</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
