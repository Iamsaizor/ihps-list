"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { username: string; display_name: string | null };
export default function AccountHeader() {
 const [status,setStatus]=useState<"loading"|"guest"|"signed-in">("loading");
 const [player,setPlayer]=useState<Player|null>(null);
 const [email,setEmail]=useState("");
 const [menuOpen,setMenuOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  async function refresh(){
   const {data:{user}}=await supabase.auth.getUser(); if(!active)return;
   if(!user){setPlayer(null);setEmail("");setStatus("guest");setMenuOpen(false);return;}
   setEmail(user.email??"");setStatus("signed-in");
   const {data}=await supabase.from("player_profiles").select("username, display_name").eq("user_id",user.id).maybeSingle();
   if(active)setPlayer(data as Player|null);
  }
  void refresh();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>{if(active)void refresh();},0);});
  return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 async function logOut(){setBusy(true);const {error}=await supabase.auth.signOut();setBusy(false);if(error){window.alert(error.message);return;}setMenuOpen(false);window.location.reload();}
 const label=player?.display_name?.trim()||player?.username||email||"ACCOUNT";
 return <div className="relative shrink-0" onClick={e=>e.stopPropagation()}>
 {status==="loading"?<span className="rounded-lg bg-[#29292f] px-4 py-2 text-xs font-bold text-gray-400">CHECKING...</span>:
 status==="guest"?<Link href="/login?next=%2F" className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600">LOG IN</Link>:
 <><button type="button" onClick={()=>setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="flex max-w-52 items-center gap-2 rounded-full border border-white/20 bg-[#29292f] px-3 py-2 text-sm font-extrabold text-white hover:border-orange-500"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs">{label.slice(0,1).toUpperCase()}</span><span className="truncate">{label}</span><span className="text-orange-400">▾</span></button>
 {menuOpen&&<div className="absolute right-0 top-full z-[90] mt-2 w-64 rounded-xl border border-white/15 bg-[#202026] p-3 shadow-2xl"><p className="truncate text-sm font-extrabold">{label}</p>{player?.username&&<p className="truncate text-xs text-gray-400">@{player.username}</p>}<p className="mt-1 truncate text-xs text-gray-500" title={email}>{email}</p><div className="my-3 border-t border-white/10"/><Link href="/profile" className="block rounded-md px-3 py-2 text-sm font-bold hover:bg-white/10">PLAYER AREA</Link>{player?.username&&<Link href={`/players/${encodeURIComponent(player.username)}`} className="block rounded-md px-3 py-2 text-sm font-bold hover:bg-white/10">PUBLIC PROFILE</Link>}<button type="button" disabled={busy} onClick={logOut} className="mt-2 w-full rounded-md bg-red-600/20 px-3 py-2 text-left text-sm font-bold text-red-300 hover:bg-red-600/30 disabled:opacity-50">{busy?"SIGNING OUT...":"LOG OUT"}</button></div>}</>}
 </div>;
}
