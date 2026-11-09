"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT = "#f97316";
const valid = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);
export function ProfileAccentEditor({ userId }: { userId: string }) {
  const [color, setColor] = useState(DEFAULT);
  const [saved, setSaved] = useState(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.from("ihps_profile_accents").select("accent_color").eq("user_id", userId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (data?.accent_color && valid(data.accent_color)) { setColor(data.accent_color); setSaved(data.accent_color); }
      if (error) setMessage(error.message);
    });
    return () => { active = false; };
  }, [userId]);
  async function save(value: string) {
    if (!valid(value)) { setMessage("Enter a six-digit hex color, such as #a855f7."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || user?.id !== userId) throw new Error("Sign in again to edit your profile.");
      const { error } = await supabase.rpc("ihps_set_profile_accent", { p_color: value.toLowerCase() });
      if (error) throw error;
      setSaved(value.toLowerCase()); setColor(value.toLowerCase()); setMessage("Accent color saved!");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save color."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-white/10 bg-[#1b1b20] p-5">
    <h2 className="text-xl font-extrabold">PROFILE ACCENT</h2>
    <p className="mt-1 text-sm text-gray-400">Choose any color for the highlights on your public profile.</p>
    <div className="mt-4 flex items-center gap-4">
      <input type="color" aria-label="Choose accent color" value={valid(color) ? color : saved} onChange={e => setColor(e.target.value)} className="h-20 w-24 cursor-pointer rounded-lg border border-white/20 bg-transparent p-1" />
      <div className="min-w-0 flex-1"><label htmlFor="ihps-accent-hex" className="text-xs font-bold text-gray-400">HEX COLOR</label>
        <input id="ihps-accent-hex" value={color} maxLength={7} onChange={e => setColor(e.target.value)} spellCheck={false} className="mt-1 w-full rounded-lg border border-white/20 bg-[#101014] px-3 py-2 font-mono text-white outline-none focus:border-white/50" />
        <p className="mt-1 text-xs text-gray-400">Click the color square for the full color picker.</p>
      </div>
    </div>
    <div className="mt-4 rounded-lg border border-white/10 bg-[#101014] p-4" style={{borderLeftColor: valid(color) ? color : saved, borderLeftWidth: 4}}>
      <span className="text-xs font-bold" style={{color: valid(color) ? color : saved}}>LIVE PREVIEW</span>
      <p className="mt-1 font-bold">Your profile highlights will use this color.</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy || !valid(color)} onClick={() => void save(color)} className="rounded-lg px-4 py-2 text-sm font-bold text-black disabled:opacity-40" style={{backgroundColor:valid(color) ? color : saved}}>{busy ? "SAVING..." : "SAVE ACCENT"}</button>
      <button type="button" disabled={busy} onClick={() => void save(DEFAULT)} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-gray-200 disabled:opacity-40">RESET TO ORANGE</button>
    </div>
    {message && <p role="status" className="mt-3 text-sm text-gray-300">{message}</p>}
  </section>;
}
