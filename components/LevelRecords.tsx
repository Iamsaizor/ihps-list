"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RecordRow = {
  submission_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  country_code: string | null;
  percent: number | string;
  completion_url: string;
  accepted_at: string | null;
};

function flag(code: string | null): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return "🌐";
  return [...code.toUpperCase()].map((letter) =>
    String.fromCodePoint(letter.charCodeAt(0) + 127397)
  ).join("");
}

function safeVideoUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

const PAGE_SIZE = 8;

export default function LevelRecords({ levelId }: { levelId: string | null }) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setRecords([]);
    setSearch("");
    setPage(1);
    setError("");
    if (!levelId) { setLoading(false); return; }
    let active = true;
    async function load() {
      if (!active) return;
      setLoading(true);
      // Fetch all pages, so search and the count cover the entire level.
      const all: RecordRow[] = [];
      for (let start = 0; start < 10000; start += 1000) {
        const { data, error: fetchError } = await supabase
          .from("public_level_records")
          .select("submission_id,user_id,username,display_name,country_code,percent,completion_url,accepted_at")
          .eq("level_id", levelId)
          .order("accepted_at", { ascending: true, nullsFirst: false })
          .range(start, start + 999);
        if (!active) return;
        if (fetchError) { setError(fetchError.message); setLoading(false); return; }
        const batch = (data ?? []) as RecordRow[];
        all.push(...batch);
        if (batch.length < 1000) break;
      }
      setRecords(all);
      setError("");
      setLoading(false);
    }
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => { void load(); }, 30000);
    return () => { active = false; window.removeEventListener("focus", onFocus); window.clearInterval(interval); };
  }, [levelId]);

  const filtered = useMemo(() => records.filter((record) =>
    `${record.display_name ?? ""} ${record.username ?? ""}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [records, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-w-0">
      <h2 className="border-b border-white/30 pb-2 text-2xl font-bold">Records ({records.length})</h2>
      <label className="mt-4 block">
        <span className="sr-only">Search records</span>
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="⌕  Search players..."
          className="w-full rounded-lg border border-white/10 bg-[#101014] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500"
        />
      </label>
      {loading && records.length === 0 && <p className="mt-4 text-sm text-gray-400">Loading records...</p>}
      {error && <p className="mt-4 text-sm text-red-400">Could not load records: {error}. Run the included SQL in Supabase.</p>}
      {!loading && !error && records.length === 0 && <p className="mt-4 text-sm text-gray-400">No accepted records yet.</p>}
      {!error && <div className="mt-3 space-y-1">
        {visible.map((record) => {
          const name = record.display_name?.trim() || record.username || "Unknown player";
          const videoUrl = safeVideoUrl(record.completion_url);
          return (
            <div key={record.submission_id} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-white/5">
              <span className="shrink-0 text-2xl" title={record.country_code || "No country selected"}>{flag(record.country_code)}</span>
              <div className="min-w-0 flex-1">
                {record.username ? (
                  <Link href={`/players/${encodeURIComponent(record.username)}`} className="block truncate text-sm font-semibold text-white hover:text-orange-400 hover:underline">{name}</Link>
                ) : <span className="block truncate text-sm font-semibold">{name}</span>}
                <div className="mt-0.5 text-xs text-gray-400">
                  <span className="font-bold text-orange-400">{Number(record.percent).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                  {record.accepted_at && <span className="ml-2">{new Date(record.accepted_at).toLocaleDateString()}</span>}
                </div>
              </div>
              {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" title="Watch completion" aria-label={`Watch ${name}'s completion`} className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-orange-500">▶</a>}
            </div>
          );
        })}
        {!loading && records.length > 0 && filtered.length === 0 && <p className="py-4 text-sm text-gray-400">No matching players.</p>}
      </div>}
      {filtered.length > PAGE_SIZE && <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md bg-[#29292f] px-3 py-2 disabled:opacity-40">Previous</button>
        <span className="rounded-md bg-orange-500 px-3 py-2 font-bold">{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md bg-[#29292f] px-3 py-2 disabled:opacity-40">Next</button>
      </div>}
    </div>
  );
}
