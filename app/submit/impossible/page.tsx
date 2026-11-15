"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";

type Submission = {
 id:string;level_name:string;level_id:number;publisher:string;original_creators:string|null;
 length_seconds:number;bot_video_url:string;macro_software:string;macro_url:string|null;
 fps:number;tps:number;peak_cps:number|null;has_swift_clicks:boolean;has_macrobuffs:boolean;
 has_alignments:boolean;requires_tps_bypass:boolean;has_complex_triggers:boolean;
 suggested_position:number|null;level_description:string|null;technical_notes:string|null;
 botting_conditions:string|null;additional_notes:string|null;status:string;revision:number;
 created_at:string;updated_at:string;rejection_reason:string|null;placed_level_id:string|null;
};
type Message={id:string;submission_id:string;message:string;is_staff:boolean;is_internal:boolean;created_at:string};
type Notification={id:string;submission_id:string;message:string;read_at:string|null;created_at:string};
const input="w-full rounded-lg border border-white/10 bg-[#111115] px-3 py-3 text-sm text-white outline-none focus:border-orange-500";
const label="mb-1.5 block text-sm font-semibold text-gray-200";
const blank={
 level_name:"",level_id:"",publisher:"",original_creators:"",length_seconds:"",bot_video_url:"",
 macro_software:"",macro_url:"",fps:"",tps:"",peak_cps:"",has_swift_clicks:"no",
 has_macrobuffs:"no",has_alignments:"no",requires_tps_bypass:"no",has_complex_triggers:"no",
 suggested_position:"",level_description:"",technical_notes:"",botting_conditions:"",additional_notes:""
};
type Form=typeof blank;
const statusLabel=(s:string)=>s==="approved"?"Approved — Awaiting Placement":s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
function videoId(url:string){
 try{const u=new URL(url);if(["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com"].includes(u.hostname))return u.searchParams.get("v")||u.pathname.split("/").filter(Boolean).at(-1)||null;if(u.hostname==="youtu.be")return u.pathname.slice(1)||null;}catch{}return null;
}
export default function ImpossibleSubmitPage(){
 const [userId,setUserId]=useState<string|null>(null);
 const [rows,setRows]=useState<Submission[]>([]);
 const [messages,setMessages]=useState<Message[]>([]);
 const [notifications,setNotifications]=useState<Notification[]>([]);
 const [form,setForm]=useState<Form>(blank);
 const [editId,setEditId]=useState<string|null>(null);
 const [openId,setOpenId]=useState<string|null>(null);
 const [reply,setReply]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const update=(key:keyof Form,v:string)=>setForm(f=>({...f,[key]:v}));
 async function load(uid:string){
  const [a,b,c]=await Promise.all([
   supabase.from("ill_level_submissions").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
   supabase.from("ill_submission_messages").select("*").order("created_at",{ascending:true}),
   supabase.from("ill_submission_notifications").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(30)
  ]);
  if(a.error||b.error||c.error)setError(a.error?.message||b.error?.message||c.error?.message||"Could not load submissions.");
  setRows((a.data||[]) as Submission[]);
  setMessages((b.data||[]) as Message[]);
  setNotifications((c.data||[]) as Notification[]);
 }
 useEffect(()=>{
  let alive=true;
  void supabase.auth.getUser().then(({data})=>{if(!alive)return;setUserId(data.user?.id||null);if(data.user)void load(data.user.id)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setUserId(session?.user.id||null);if(session?.user)void load(session.user.id);else {setRows([]);setMessages([]);setNotifications([])}});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 function edit(s:Submission){
  const f:Form={...blank};
  for(const k of Object.keys(f) as (keyof Form)[]){
   const v=s[k as keyof Submission];
   f[k]=typeof v==="boolean"?(v?"yes":"no"):v==null?"":String(v);
  }
  setForm(f);setEditId(s.id);setConfirmed(false);setError("");setSuccess("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();setError("");setSuccess("");
  if(!userId){setError("Sign in first.");return}
  if(!confirmed){setError("Confirm that you successfully botted the entire level.");return}
  if(Number(form.length_seconds)<30){setError("ILL levels must be at least 30 seconds.");return}
  if(!form.bot_video_url.startsWith("https://")){setError("Provide a valid HTTPS bot completion link.");return}
  setBusy(true);
  const payload=Object.fromEntries(Object.entries(form).map(([k,v])=>[k,["has_swift_clicks","has_macrobuffs","has_alignments","requires_tps_bypass","has_complex_triggers"].includes(k)?v==="yes":v]));
  const {error:e2}=await supabase.rpc("ill_submit_level",{p_payload:payload,p_submission_id:editId});
  if(e2)setError(e2.message);else{setSuccess(editId?"Submission revised and returned to pending review.":"Level submitted for ILL review!");setEditId(null);setForm(blank);setConfirmed(false);await load(userId)}
  setBusy(false);
 }
 async function action(id:string,action:string){
  if(!confirm(`Are you sure you want to ${action} this submission?`))return;
  setBusy(true);setError("");
  const {error:e}=await supabase.rpc("ill_change_submission",{p_id:id,p_action:action,p_detail:null,p_placed_level_id:null});
  if(e)setError(e.message);else if(userId)await load(userId);
  setBusy(false);
 }
 async function post(id:string){
  if(!reply.trim())return;
  setBusy(true);setError("");
  const {error:e}=await supabase.rpc("ill_post_message",{p_id:id,p_message:reply,p_internal:false});
  if(e)setError(e.message);else{setReply("");if(userId)await load(userId)}
  setBusy(false);
 }
 async function read(n:Notification){
  await supabase.rpc("ill_mark_notification_read",{p_id:n.id});
  setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x));
  setOpenId(n.submission_id);
 }
 return <main className="min-h-screen bg-[#101014] px-4 py-7 text-white"><div className="mx-auto max-w-7xl">
  <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div>
   <Link href="/" className="text-3xl font-black text-orange-500">ihPS</Link>
   <h1 className="mt-2 text-3xl font-extrabold">IMPOSSIBLE LEVEL SUBMISSION</h1>
   <p className="text-sm text-gray-400">Submit bot-verified impossible levels. This is NOT a human record submission.</p>
  </div><div className="flex gap-2"><Link href="/submit" className="rounded-lg bg-[#29292f] px-4 py-3 text-sm font-bold">RECORD SUBMISSIONS</Link><Link href="/" className="rounded-lg bg-[#29292f] px-4 py-3 text-sm font-bold">← VIEW LISTS</Link></div></header>
  {error&&<p role="alert" className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
  {success&&<p className="mb-4 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-300">{success}</p>}
  {!userId&&<p className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">You must <Link className="font-bold underline" href="/login">sign in</Link> to submit levels.</p>}
  <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
   <section className="rounded-xl border border-white/10 bg-[#19191e] p-5">
    <h2 className="mb-4 text-xl font-bold">{editId?"Revise your submission":"Submit an impossible level"}</h2>
    <form onSubmit={submit} className="space-y-4">
     <div className="grid gap-4 sm:grid-cols-2">
      {([["level_name","Level name *","text"],["level_id","Level ID *","number"],["publisher","Publisher *","text"],["original_creators","Original creator(s)","text"],["length_seconds","Length in seconds (30+) *","number"],["bot_video_url","0–100% bot completion URL *","url"],["macro_software","Bot / macro software *","text"],["macro_url","Macro download URL (optional)","url"],["fps","FPS used *","number"],["tps","TPS used *","number"],["peak_cps","Estimated peak CPS","number"],["suggested_position","Suggested placement","number"]] as [keyof Form,string,string][]).map(([k,title,type])=><div key={k}><label htmlFor={k} className={label}>{title}</label><input id={k} className={input} type={type} required={title.includes("*")} min={type==="number"?(k==="length_seconds"?"30":"0"):undefined} step={k==="fps"||k==="tps"||k==="peak_cps"?"any":undefined} value={form[k]} onChange={e=>update(k,e.target.value)} placeholder={k==="bot_video_url"||k==="macro_url"?"https://...":undefined}/></div>)}
     </div>
     <div className="grid gap-4 sm:grid-cols-2">
      {([["has_swift_clicks","Contains swift clicks?"],["has_macrobuffs","Contains macrobuffs?"],["has_alignments","Contains alignments?"],["requires_tps_bypass","Requires TPS bypass?"],["has_complex_triggers","Uses complex triggers?"]] as [keyof Form,string][]).map(([k,title])=><div key={k}><label htmlFor={k} className={label}>{title}</label><select id={k} className={input} value={form[k]} onChange={e=>update(k,e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></div>)}
     </div>
     {([["level_description","Level description"],["technical_notes","Technical explanation / special mechanics"],["botting_conditions","Botting conditions / playback instructions"],["additional_notes","Additional notes"]] as [keyof Form,string][]).map(([k,title])=><div key={k}><label htmlFor={k} className={label}>{title}</label><textarea id={k} className={input} rows={3} value={form[k]} onChange={e=>update(k,e.target.value)}/></div>)}
     <label className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 accent-orange-500"/>I confirm that I successfully botted this level from 0% to 100%, and the submitted evidence is authentic.</label>
     <div className="flex flex-wrap gap-2"><button disabled={busy||!userId} className="rounded-lg bg-orange-500 px-5 py-3 font-black disabled:opacity-40">{busy?"SAVING...":editId?"SAVE REVISION":"SUBMIT LEVEL"}</button>{editId&&<button type="button" className="rounded-lg bg-[#29292f] px-4 py-3 font-bold" onClick={()=>{setEditId(null);setForm(blank);setConfirmed(false)}}>CANCEL EDIT</button>}</div>
    </form>
   </section>
   <div className="space-y-5">
    <aside className="rounded-xl border border-white/10 bg-[#19191e] p-5">
     <h2 className="mb-3 text-xl font-bold">Submission Guidelines</h2>
     <div className="space-y-3 text-sm text-gray-300">
      <p><strong className="text-white">ILL only:</strong> This form submits a new impossible level, not a human progress record.</p>
      <p><strong className="text-white">Bot proof:</strong> A successful full 0–100% bot completion is mandatory.</p>
      <p><strong className="text-white">Macro requests:</strong> Staff may ask for your macro file. A failed staff replay does not automatically mean rejection.</p>
      <p><strong className="text-white">Approval ≠ placement:</strong> Approved submissions await manual list placement.</p>
      <p><strong className="text-white">Originality:</strong> Meaningful gameplay, visual, or technical effort is required.</p>
      <p><strong className="text-white">Swift clicks:</strong> Only Yes/No is requested; no count required.</p>
     </div>
     <Link href="/rules/impossible" className="mt-4 inline-block font-bold text-orange-400 underline">Read ILL rules</Link>
    </aside>
    <aside className="rounded-xl border border-white/10 bg-[#19191e] p-5">
     <h2 className="mb-3 text-lg font-bold">Notifications {notifications.filter(n=>!n.read_at).length>0?`(${notifications.filter(n=>!n.read_at).length} unread)`:""}</h2>
     {notifications.length===0?<p className="text-sm text-gray-400">No notifications yet.</p>:notifications.map(n=><button key={n.id} onClick={()=>void read(n)} className={`mb-2 w-full rounded-lg p-3 text-left text-sm ${n.read_at?"bg-[#222229] text-gray-400":"border border-orange-500/40 bg-orange-500/10 text-white"}`}>{n.message}<span className="mt-1 block text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span></button>)}
    </aside>
   </div>
  </div>
  <section className="mt-7 rounded-xl border border-white/10 bg-[#19191e] p-5">
   <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">MY ILL SUBMISSIONS</h2><button onClick={()=>userId&&void load(userId)} className="rounded bg-[#29292f] px-3 py-2 text-xs font-bold">REFRESH</button></div>
   {!rows.length?<p className="text-sm text-gray-400">No level submissions yet.</p>:rows.map(s=><article key={s.id} className="mb-3 rounded-xl border border-white/10 bg-[#111115] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{s.level_name} <span className="text-xs text-gray-400">#{s.level_id}</span></h3><p className="text-xs text-gray-400">Submitted {new Date(s.created_at).toLocaleString()} · Revision {s.revision}</p></div><span className="rounded bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-400">{statusLabel(s.status)}</span></div>
    {s.rejection_reason&&<p className="mt-2 text-sm text-red-300">Staff feedback: {s.rejection_reason}</p>}
    {s.status==="placed"&&s.placed_level_id&&<Link href="/?list=impossible" className="mt-2 inline-block text-sm text-orange-400 underline">View Impossible List</Link>}
    <div className="mt-3 flex flex-wrap gap-2">
     <button onClick={()=>setOpenId(openId===s.id?null:s.id)} className="rounded bg-[#29292f] px-3 py-2 text-xs font-bold">{openId===s.id?"HIDE":"VIEW"} DISCUSSION</button>
     {["pending","evidence_requested","rejected"].includes(s.status)&&<button onClick={()=>edit(s)} className="rounded bg-[#29292f] px-3 py-2 text-xs font-bold">EDIT / RESUBMIT</button>}
     {["pending","under_review","evidence_requested","rejected"].includes(s.status)&&<button disabled={busy} onClick={()=>void action(s.id,"withdraw")} className="rounded bg-red-900/50 px-3 py-2 text-xs font-bold">WITHDRAW</button>}
    </div>
    {openId===s.id&&<div className="mt-4 space-y-3 rounded-lg bg-[#1d1d23] p-4">
     {messages.filter(m=>m.submission_id===s.id).length===0?<p className="text-sm text-gray-400">No messages yet.</p>:messages.filter(m=>m.submission_id===s.id).map(m=><div key={m.id} className="border-b border-white/10 pb-2 text-sm"><strong className={m.is_staff?"text-orange-400":"text-white"}>{m.is_staff?"ILL Staff":"You"}</strong><span className="ml-2 text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</span><p className="mt-1 whitespace-pre-wrap">{m.message}</p></div>)}
     <textarea className={input} value={reply} onChange={e=>setReply(e.target.value)} rows={2} placeholder="Reply to staff or provide requested evidence..."/>
     <button disabled={busy||!reply.trim()} onClick={()=>void post(s.id)} className="rounded bg-orange-500 px-4 py-2 text-sm font-bold disabled:opacity-40">SEND REPLY</button>
    </div>}
   </article>)}
  </section>
 </div></main>;
}
