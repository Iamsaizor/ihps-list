"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TagRow = {tag:string;equipped:boolean};
const categories:Record<string,string[]> = {
  "Staff & Development":["Founder","Administrator","Demon List Mod","Challenge List Mod","Impossible List Mod","Future Demon List Mod","Developer","List Manager"],
  "Overall Leaderboard":["Top 1 Player","Top 3 Player","Top 5 Player"],
  "List Leaderboards":["Demon List Champion","Demon List Elite","Demon List Veteran","Challenge List Champion","Challenge List Elite","Challenge List Veteran","Dual Champion","Dual Elite"],
  "Top Victors":["Top 1 Demon Victor","Top 1 Challenge Victor"],
  "Demon Completions":["Exorcist","Demon Obliterator","Demon Killer","Demon Hunter"],
  "Challenge Completions":["Masochist","Challenge Obliterator","Challenge Destroyer","Challenge Killer"],
  "Creators & Verifiers":["Hellraiser","Hellbringer","Sadist","Sadomasochist","Tormentor","Visionary"],
  "Ultimate":["Omni-Slayer"],
};
const descriptions:Record<string,string>={
 "Exorcist":"Complete every current Demon List level", "Demon Obliterator":"Complete at least 75% of Demon List levels", "Demon Killer":"Complete at least 50% of Demon List levels", "Demon Hunter":"Complete at least 25% of Demon List levels",
 "Masochist":"Complete every current Challenge List level", "Challenge Obliterator":"Complete at least 75% of Challenge List levels", "Challenge Destroyer":"Complete at least 50% of Challenge List levels", "Challenge Killer":"Complete at least 25% of Challenge List levels",
 "Omni-Slayer":"Complete both entire lists once — permanent", "Hellraiser":"Creator of the current #1 Demon", "Hellbringer":"Verifier of the current #1 Demon", "Sadist":"Creator of the current #1 Challenge", "Sadomasochist":"Verifier of the current #1 Challenge", "Tormentor":"Creator of the current #1 Impossible level", "Visionary":"Creator of the current #1 Future Demon",
};
export function PlayerTagBadge({tag}:{tag:string|null|undefined}){
 if(!tag)return null;
 const special=tag==="Omni-Slayer";
 return <span className={`inline-block rounded border px-2 py-1 text-xs font-black tracking-wide ${special?"border-purple-400/60 bg-purple-500/15 text-purple-300":"border-orange-500/40 bg-orange-500/10 text-orange-300"}`}>{tag.toUpperCase()}</span>;
}
export function usePlayerTags(userId:string|null|undefined){
 const [tags,setTags]=useState<TagRow[]>([]);
 useEffect(()=>{if(!userId){setTags([]);return;}let alive=true;
 const refresh=async()=>{const {data}=await supabase.rpc("ihps_get_player_tags",{p_user_id:userId});if(alive)setTags((data||[]) as TagRow[]);};
 void refresh();const onFocus=()=>void refresh();window.addEventListener("focus",onFocus);
 return()=>{alive=false;window.removeEventListener("focus",onFocus)};
 },[userId]);
 return {tags,setTags};
}
export function PlayerTagSelector({userId}:{userId:string}){
 const {tags,setTags}=usePlayerTags(userId);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const equipped=tags.find(t=>t.equipped)?.tag??null;
 const unlocked=new Set(tags.map(t=>t.tag));
 async function equip(tag:string|null){setBusy(true);setError("");const {error:e}=await supabase.rpc("ihps_equip_tag",{p_tag:tag});
 if(e)setError(e.message);else setTags(old=>old.map(t=>({...t,equipped:t.tag===tag})));setBusy(false);}
 return <section className="rounded-xl border border-white/10 bg-[#1b1b20] p-5 text-white">
 <h2 className="text-xl font-black">PLAYER TAGS</h2><p className="mt-1 text-sm text-gray-400">Unlocked tags update automatically with your current rankings, records, and staff status. Equip one at a time.</p>
 <div className="mt-4 rounded-lg bg-[#101014] p-4"><p className="mb-2 text-xs font-bold text-gray-400">EQUIPPED TAG</p>{equipped?<PlayerTagBadge tag={equipped}/>:<p className="text-gray-500">No tag equipped</p>}</div>
 <div className="mt-4 space-y-5">{Object.entries(categories).map(([category,names])=><div key={category}><h3 className="mb-2 text-sm font-black text-orange-400">{category.toUpperCase()}</h3><div className="space-y-2">{names.map(name=><div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111115] p-3"><div><p className={`font-semibold ${unlocked.has(name)?"text-white":"text-gray-500"}`}>{name}</p><p className="text-xs text-gray-500">{descriptions[name]??(unlocked.has(name)?"Requirement currently met":"Requires the corresponding rank, role, or achievement")}</p></div><button type="button" disabled={busy||!unlocked.has(name)||equipped===name} onClick={()=>void equip(name)} className="shrink-0 rounded bg-orange-500 px-3 py-2 text-xs font-bold text-black disabled:bg-[#303039] disabled:text-gray-500">{equipped===name?"EQUIPPED":unlocked.has(name)?"EQUIP":"LOCKED"}</button></div>)}</div></div>)}</div>
 <button type="button" disabled={busy||!equipped} onClick={()=>void equip(null)} className="mt-4 rounded border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-40">UNEQUIP</button>
 {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section>;
}
