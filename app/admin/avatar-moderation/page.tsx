"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player={user_id:string;username:string;avatar_url:string|null};
export default function AvatarModeration(){
 const [players,setPlayers]=useState<Player[]>([]),[search,setSearch]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState<string|null>(null),[allowed,setAllowed]=useState(false);
 useEffect(()=>{let active=true;async function load(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const {data:grants}=await supabase.from("ihps_tag_staff_grants").select("tag").eq("user_id",user.id).eq("tag","Administrator");
  if(!active)return;const ok=user.id==="f4ce8a9d-4c39-4a26-9ad7-60470952a874"||Boolean(grants?.length);setAllowed(ok);if(!ok)return;
  const {data,error:e}=await supabase.from("player_profiles").select("user_id,username,avatar_url").order("username").limit(500);
  if(active){if(e)setError(e.message);else setPlayers((data??[]) as Player[]);}
 }void load();return()=>{active=false}},[]);
 async function remove(player:Player){if(!window.confirm(`Remove @${player.username}'s profile picture?`))return;setBusy(player.user_id);setError("");
  const {error:e}=await supabase.rpc("ihps_moderate_avatar",{p_user_id:player.user_id});
  if(e)setError(e.message);else setPlayers(prev=>prev.map(p=>p.user_id===player.user_id?{...p,avatar_url:null}:p));setBusy(null);
 }
 return <main className="min-h-screen bg-[#101014] p-6 text-white"><div className="mx-auto max-w-3xl"><Link href="/admin" className="text-orange-400">← Admin</Link><h1 className="mt-5 text-3xl font-black">Profile picture moderation</h1>{!allowed?<p className="mt-5 text-gray-300">Admin access required. Sign in as ihpslists or an Administrator.</p>:<><input className="mt-5 w-full rounded-lg bg-[#24242a] p-3" placeholder="Search players" value={search} onChange={e=>setSearch(e.target.value)}/>{players.filter(p=>p.username.toLowerCase().includes(search.toLowerCase())&&p.avatar_url).map(p=><div key={p.user_id} className="mt-3 flex items-center gap-4 rounded-lg border border-white/10 p-3"><img src={p.avatar_url!} alt="" className="h-14 w-14 rounded-lg object-cover"/><span className="flex-1 font-bold">@{p.username}</span><button disabled={busy!==null} onClick={()=>void remove(p)} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold disabled:opacity-50">Remove avatar</button></div>)}</>}{error&&<p role="alert" className="mt-4 text-red-300">{error}</p>}</div></main>;
}
