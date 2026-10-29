"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
type Notification = {id:string;title:string;body:string|null;url:string|null;kind:string;created_at:string;read_at:string|null};
export default function NotificationBell(){
 const [userId,setUserId]=useState<string|null>(null),[open,setOpen]=useState(false),[items,setItems]=useState<Notification[]>([]),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null);
 const refresh=useCallback(async(uid:string)=>{
  const {data,error}=await supabase.from("ihps_notifications").select("id,title,body,url,kind,created_at,read_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(50);
  if(error){setError("Unable to load notifications. Run the supplied SQL setup.");return;}
  setError("");setItems((data??[]) as Notification[]);
 },[]);
 useEffect(()=>{
  let live=true;
  async function getUser(){const {data:{user}}=await supabase.auth.getUser();if(live)setUserId(user?.id??null);}
  void getUser();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>setTimeout(()=>{if(live)void getUser();},0));
  return ()=>{live=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!userId){setItems([]);return;}
  void refresh(userId);const timer=setInterval(()=>void refresh(userId),20000);
  const onFocus=()=>void refresh(userId);window.addEventListener("focus",onFocus);
  return ()=>{clearInterval(timer);window.removeEventListener("focus",onFocus);};
 },[userId,refresh]);
 useEffect(()=>{const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
 async function markRead(id:string){if(!userId)return;const {error}=await supabase.from("ihps_notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);if(!error)setItems(prev=>prev.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));}
 async function markAll(){if(!userId)return;const {error}=await supabase.from("ihps_notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).is("read_at",null);if(!error)setItems(prev=>prev.map(n=>({...n,read_at:n.read_at??new Date().toISOString()})));}
 const unread=items.filter(n=>!n.read_at).length;
 return <div ref={root} className="relative shrink-0">
 <button type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={()=>setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-xl text-white transition hover:bg-orange-600" title="Notifications"><svg className="relative h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black">{unread>99?"99+":unread}</span>}</button>
 {open&&<div className="absolute right-0 top-full z-[90] mt-3 w-[min(92vw,390px)] overflow-hidden rounded-xl border border-white/15 bg-[#202026] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h3 className="text-lg font-extrabold">Notifications</h3><p className="text-xs text-gray-400">{unread} unread</p></div><button type="button" onClick={()=>void markAll()} disabled={!unread} className="text-xs font-bold text-orange-400 hover:underline disabled:opacity-40">Mark all read</button></div><div className="max-h-[440px] overflow-y-auto">{error?<p className="p-4 text-sm text-red-300">{error}</p>:items.length===0?<p className="p-6 text-center text-sm text-gray-400">No notifications yet.</p>:items.map(n=><div key={n.id} className={`border-b border-white/5 px-4 py-3 ${!n.read_at?"bg-orange-500/10":""}`}><div className="flex items-start gap-2"><span className="mt-1 text-orange-400">{n.kind==="submission"?"✓":"↕"}</span><div className="min-w-0 flex-1">{n.url?<Link href={n.url} onClick={()=>{void markRead(n.id);setOpen(false);}} className="block text-sm font-bold text-white hover:text-orange-400">{n.title}</Link>:<p className="text-sm font-bold">{n.title}</p>}{n.body&&<p className="mt-1 break-words text-xs leading-relaxed text-gray-300">{n.body}</p>}<p className="mt-2 text-[11px] text-gray-500">{new Date(n.created_at).toLocaleString()}</p></div>{!n.read_at&&<button type="button" onClick={()=>void markRead(n.id)} className="shrink-0 rounded-md px-2 py-1 text-xs text-orange-400 hover:bg-white/10" title="Mark read">●</button>}</div></div>)}</div></div>}
 </div>;
}
