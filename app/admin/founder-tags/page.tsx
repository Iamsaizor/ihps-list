"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { user_id: string; username: string; display_name: string | null; staff_tags: string[] };
const STAFF_TAGS = ["Administrator", "Demon List Mod", "Challenge List Mod", "Impossible List Mod", "Future Demon List Mod", "Developer", "List Manager"];

export default function FounderTagManagement() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verified, setVerified] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true); setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Sign in with your Founder account."); setVerified(false); setLoading(false); return; }
    const { data, error: err } = await supabase.rpc("ihps_founder_tag_users", { p_search: query });
    if (err) { setError(err.message); setVerified(false); setPlayers([]); }
    else { setPlayers((data ?? []) as Player[]); setVerified(true); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(""); }, [load]);

  async function changeTag(player: Player, tag: string) {
    const enabled = !player.staff_tags.includes(tag);
    if (!window.confirm(`${enabled ? "Grant" : "Revoke"} ${tag} ${enabled ? "to" : "from"} @${player.username}?`)) return;
    setBusy(`${player.user_id}:${tag}`); setError(""); setNotice("");
    const { error: err } = await supabase.rpc("ihps_founder_set_staff_tag", {
      p_target_user_id: player.user_id, p_tag: tag, p_enabled: enabled,
    });
    if (err) setError(err.message);
    else {
      setPlayers(old => old.map(p => p.user_id !== player.user_id ? p : {
        ...p, staff_tags: enabled ? [...p.staff_tags, tag] : p.staff_tags.filter(t => t !== tag),
      }));
      setNotice(`${tag} ${enabled ? "granted to" : "revoked from"} @${player.username}.`);
    }
    setBusy("");
  }

  return <main className="min-h-screen bg-[#101014] px-4 py-8 text-white">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div><Link href="/" className="font-black text-orange-500">ihPS</Link><h1 className="text-3xl font-black">FOUNDER · TAG MANAGEMENT</h1><p className="mt-1 text-sm text-gray-400">Grant or revoke staff profile tags for registered accounts.</p></div>
        <Link href="/profile" className="rounded bg-[#2b2b33] px-4 py-2">Back to profile</Link>
      </div>
      {error && <p role="alert" className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-red-300">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-green-300">{notice}</p>}
      {verified && <>
        <form className="mb-5 flex gap-2" onSubmit={e => { e.preventDefault(); void load(search); }}>
          <input className="min-w-0 flex-1 rounded border border-white/20 bg-[#1d1d23] px-4 py-3" placeholder="Search player username or display name" value={search} onChange={e => setSearch(e.target.value)} maxLength={100}/>
          <button className="rounded bg-orange-500 px-5 py-3 font-bold text-black" disabled={loading}>SEARCH</button>
        </form>
        <p className="mb-4 text-xs text-gray-400">Founder cannot be assigned here. These are display tags only; they do not grant website or database permissions.</p>
        <div className="space-y-4">{players.map(player => <section key={player.user_id} className="rounded-xl border border-white/10 bg-[#1b1b21] p-4">
          <div className="mb-3"><Link href={`/players/${encodeURIComponent(player.username)}`} className="text-lg font-bold text-orange-400 hover:underline">{player.display_name || player.username}</Link><span className="ml-2 text-sm text-gray-400">@{player.username}</span>{player.staff_tags.includes("Founder") && <span className="ml-2 text-xs text-amber-400">FOUNDER</span>}</div>
          <div className="flex flex-wrap gap-2">{STAFF_TAGS.map(tag => { const has = player.staff_tags.includes(tag); return <button key={tag} type="button" disabled={Boolean(busy)} onClick={() => void changeTag(player,tag)} title={has ? `Revoke ${tag}` : `Grant ${tag}`} className={`rounded border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${has ? "border-orange-500 bg-orange-500/15 text-orange-300" : "border-white/15 bg-[#2a2a32] text-gray-300"}`}>{has ? "✓ " : "+ "}{tag}</button>; })}</div>
        </section>)}</div>
        {!loading && players.length === 0 && <p className="text-gray-400">No matching players.</p>}
      </>}
      {loading && <p className="text-gray-400">Loading players...</p>}
    </div>
  </main>;
}
