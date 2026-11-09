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
 "Founder":"Official founder of ihPS (staff-assigned)",
 "Administrator":"Currently holds ihPS administrator permissions",
 "Demon List Mod":"Currently moderates the Demon List",
 "Challenge List Mod":"Currently moderates the Challenge List",
 "Impossible List Mod":"Currently moderates the Impossible List",
 "Future Demon List Mod":"Currently moderates the Future Demon List",
 "Developer":"Official ihPS developer (staff-assigned)",
 "List Manager":"Currently holds list-management permissions",
 "Top 1 Player":"Currently ranked #1 on the overall player leaderboard",
 "Top 3 Player":"Currently ranked in the overall leaderboard Top 3",
 "Top 5 Player":"Currently ranked in the overall leaderboard Top 5",
 "Demon List Champion":"Currently ranked #1 on the Demon List player leaderboard",
 "Demon List Elite":"Currently ranked in the Demon List player leaderboard Top 3",
 "Demon List Veteran":"Currently ranked in the Demon List player leaderboard Top 10",
 "Challenge List Champion":"Currently ranked #1 on the Challenge List player leaderboard",
 "Challenge List Elite":"Currently ranked in the Challenge List player leaderboard Top 3",
 "Challenge List Veteran":"Currently ranked in the Challenge List player leaderboard Top 10",
 "Dual Champion":"Currently ranked #1 on both Demon and Challenge player leaderboards",
 "Dual Elite":"Currently ranked in the Top 3 on both Demon and Challenge player leaderboards",
 "Top 1 Demon Victor":"Have an accepted 100% completion of the current #1 Demon List level",
 "Top 1 Challenge Victor":"Have an accepted 100% completion of the current #1 Challenge List level",
 "Exorcist":"Complete every level currently on the Demon List",
 "Demon Obliterator":"Complete at least 75% of current Demon List levels",
 "Demon Killer":"Complete at least 50% of current Demon List levels",
 "Demon Hunter":"Complete at least 25% of current Demon List levels",
 "Masochist":"Complete every level currently on the Challenge List",
 "Challenge Obliterator":"Complete at least 75% of current Challenge List levels",
 "Challenge Destroyer":"Complete at least 50% of current Challenge List levels",
 "Challenge Killer":"Complete at least 25% of current Challenge List levels",
 "Hellraiser":"Creator of the current #1 Demon List level",
 "Hellbringer":"Verifier of the current #1 Demon List level",
 "Sadist":"Creator of the current #1 Challenge List level",
 "Sadomasochist":"Verifier of the current #1 Challenge List level",
 "Tormentor":"Creator of the current #1 Impossible List level",
 "Visionary":"Creator of the current #1 Future Demon List level",
 "Omni-Slayer":"Have completed every Demon and Challenge List level at the same time; permanent once earned",
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
 const {tags,setTags}=usePlayerTags(userId);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const equipped=tags.find(t=>t.equipped)?.tag??null;
 const owned=new Set(tags.map(t=>t.tag));
 const visibleCategories=Object.entries(categories)
  .map(([category,names])=>({category,names:names.filter(name=>owned.has(name))}))
  .filter(group=>group.names.length>0);
 async function equip(tag:string|null){
  setBusy(true);setError("");
  const {error:e}=await supabase.rpc("ihps_equip_tag",{p_tag:tag});
  if(e)setError(e.message);
  else setTags(old=>old.map(t=>({...t,equipped:t.tag===tag})));
  setBusy(false);
 }
 return <section className="rounded-xl border border-white/10 bg-[#1b1b20] p-5 text-white">
  <h2 className="text-xl font-black">PLAYER TAGS</h2>
  <p className="mt-1 text-sm text-gray-400">Only your unlocked tags appear here. Hover over a tag to see its requirement. Equip one at a time.</p>
  <div className="mt-4 rounded-lg bg-[#101014] p-4">
   <p className="mb-2 text-xs font-bold text-gray-400">EQUIPPED TAG</p>
   {equipped?<span title={descriptions[equipped]??equipped}><PlayerTagBadge tag={equipped}/></span>:<p className="text-gray-500">No tag equipped</p>}
  </div>
  {visibleCategories.length===0?
   <p className="mt-4 rounded-lg border border-white/10 bg-[#111115] p-4 text-sm text-gray-400">You don&apos;t currently have any unlocked tags. They&apos;ll appear here automatically when you qualify.</p>
   :<div className="mt-4 space-y-5">{visibleCategories.map(({category,names})=><div key={category}>
    <h3 className="mb-2 text-sm font-black text-orange-400">{category.toUpperCase()}</h3>
    <div className="space-y-2">{names.map(name=><div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111115] p-3">
     <div className="group relative min-w-0" title={descriptions[name]??name} tabIndex={0} aria-label={`${name}: ${descriptions[name]??name}`}>
      <p className="cursor-help font-semibold text-white decoration-dotted underline-offset-4 group-hover:underline group-focus:underline">{name}</p>
      <div role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-max max-w-[min(270px,70vw)] rounded-lg border border-orange-500/40 bg-[#25252d] px-3 py-2 text-xs font-normal leading-relaxed text-gray-100 shadow-xl group-hover:block group-focus:block">
       {descriptions[name]??"Currently eligible for this tag"}
      </div>
     </div>
     <button type="button" disabled={busy||equipped===name} onClick={()=>void equip(name)} className="shrink-0 rounded bg-orange-500 px-3 py-2 text-xs font-bold text-black disabled:bg-[#303039] disabled:text-gray-500">{equipped===name?"EQUIPPED":"EQUIP"}</button>
    </div>)}</div>
   </div>)}</div>}
  <button type="button" disabled={busy||!equipped} onClick={()=>void equip(null)} className="mt-4 rounded border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-40">UNEQUIP</button>
  {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
 </section>;
}
