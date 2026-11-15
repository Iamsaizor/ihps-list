"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
type Row={
 id:string;user_id:string;level_name:string;level_id:number;publisher:string;original_creators:string|null;
 length_seconds:number;bot_video_url:string;macro_software:string;macro_url:string|null;
 fps:number;tps:number;peak_cps:number|null;has_swift_clicks:boolean;has_macrobuffs:boolean;
 has_alignments:boolean;requires_tps_bypass:boolean;has_complex_triggers:boolean;
 suggested_position:number|null;level_description:string|null;technical_notes:string|null;
 botting_conditions:string|null;additional_notes:string|null;status:string;revision:number;
 created_at:string;updated_at:string;assigned_reviewer:string|null;placed_level_id:string|null;
};
type Message={id:string;submission_id:string;author_id:string;message:string;is_staff:boolean;is_internal:boolean;created_at:string};
type Audit={id:string;submission_id:string;actor_id:string;action:string;from_status:string|null;to_status:string|null;detail:string|null;created_at:string};
type Level={id:string;name:string;position:number};
const checks=[
 "Uploaded to ihPS","At least 30 seconds","0–100% bot completion evidence",
 "Reproducibly possible / evidence assessed","Technical conditions documented",
 "Meaningful gameplay, visual, or technical effort","Sufficiently original","No unresolved evidence concerns"
];
const input="w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2 text-sm text-white outline-none focus:border-orange-500";
const statuses=["pending","under_review","evidence_requested","approved","placed","rejected","withdrawn"];
const nice=(s:string)=>s==="approved"?"Approved — Awaiting Placement":s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
function youtubeId(url:string){
 try{const u=new URL(url);if(u.hostname==="youtu.be")return u.pathname.slice(1);if(["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com"].includes(u.hostname))return u.searchParams.get("v")||u.pathname.split("/").filter(Boolean).at(-1)||null;}catch{}return null;
}
export default function ImpossibleLevelReviews(){
 const [rows,setRows]=useState<Row[]>([]);
 const [messages,setMessages]=useState<Message[]>([]);
 const [audits,setAudits]=useState<Audit[]>([]);
 const [levels,setLevels]=useState<Level[]>([]);
 const [userId,setUserId]=useState("");
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState("pending");
 const [expanded,setExpanded]=useState<string|null>(null);
 const [detail,setDetail]=useState<Record<string,string>>({});
 const [draft,setDraft]=useState("");
 const [internal,setInternal]=useState(false);
 const [checkState,setCheckState]=useState<Record<string,boolean[]>>({});
 const [placedId,setPlacedId]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 async function load(){
  setError("");setLoading(true);
  const u=await supabase.auth.getUser();
  if(!u.data.user){setError("Sign in to review impossible level submissions.");setAuthorized(false);setLoading(false);return}
  setUserId(u.data.user.id);
  const [access,lists]=await Promise.all([supabase.rpc("ill_can_review"),supabase.from("lists").select("id,slug")]);
  if(access.error||lists.error){setError(access.error?.message||lists.error?.message||"Could not check permissions.");setLoading(false);return}
  if(!access.data){setError("Only Impossible List moderators and founders can access this page.");setAuthorized(false);setLoading(false);return}
  setAuthorized(true);
  const ill=(lists.data||[]).find((x:{slug:string})=>x.slug==="impossible");
  const [s,m,a,l]=await Promise.all([
   supabase.from("ill_level_submissions").select("*").order("created_at",{ascending:false}).limit(500),
   supabase.from("ill_submission_messages").select("*").order("created_at",{ascending:true}).limit(2000),
   supabase.from("ill_submission_audit").select("*").order("created_at",{ascending:false}).limit(2000),
   ill?supabase.from("levels").select("id,name,position").eq("list_id",ill.id).order("position"):Promise.resolve({data:[],error:null})
  ]);
  if(s.error||m.error||a.error||l.error)setError(s.error?.message||m.error?.message||a.error?.message||l.error?.message||"Could not load submissions.");
  setRows((s.data||[]) as Row[]);setMessages((m.data||[]) as Message[]);setAudits((a.data||[]) as Audit[]);setLevels((l.data||[]) as Level[]);
  const ck=await supabase.from("ill_submission_checklists").select("submission_id,reviewer_id,checks").eq("reviewer_id",u.data.user.id);
  if(ck.error)setError(ck.error.message);
  else setCheckState(Object.fromEntries((ck.data||[]).map((x:{submission_id:string;checks:boolean[]})=>[x.submission_id,x.checks])));
  setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 const shown=useMemo(()=>rows.filter(x=>filter==="all"||x.status===filter),[rows,filter]);
 async function change(row:Row,action:string){
  setError("");
  if(row.user_id===userId){setError("You cannot review your own level.");return}
  const note=(detail[row.id]||"").trim();
  if(["rejected","evidence_requested"].includes(action)&&!note){setError("Enter a reason or evidence request first.");return}
  if(action==="placed"&&!placedId[row.id]){setError("Select the existing ILL level entry first.");return}
  if(action==="approved"&&!confirm("Approve this submission? It will NOT add the level to the list."))return;
  if(action==="placed"&&!confirm("Confirm this level was already manually added and ranked on the ILL?"))return;
  setBusy(row.id);
  const {error:e}=await supabase.rpc("ill_change_submission",{p_id:row.id,p_action:action,p_detail:note||null,p_placed_level_id:action==="placed"?placedId[row.id]:null});
  if(e)setError(e.message);else await load();
  setBusy("");
 }
 async function post(row:Row){
  if(!draft.trim())return;
  setBusy(row.id);setError("");
  const {error:e}=await supabase.rpc("ill_post_message",{p_id:row.id,p_message:draft,p_internal:internal});
  if(e)setError(e.message);else{setDraft("");await load()}
  setBusy("");
 }
 async function toggleCheck(id:string,i:number){
  const next=checks.map((_,j)=>j===i?!((checkState[id]||[])[j]):!!((checkState[id]||[])[j]));
  setCheckState(v=>({...v,[id]:next}));
  const {error:e}=await supabase.rpc("ill_save_checklist",{p_submission_id:id,p_checks:next});
  if(e)setError("Checklist could not be saved: "+e.message);
 }
 return <main className="min-h-screen bg-[#101014] px-4 py-7 text-white"><div className="mx-auto max-w-6xl">
  <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><div>
   <Link href="/admin/dashboard" className="text-3xl font-black text-orange-500">ihPS</Link>
   <h1 className="mt-2 text-3xl font-black">IMPOSSIBLE LEVEL REVIEWS</h1>
   <p className="text-sm text-gray-400">ILL staff only · Approval and placement are separate</p>
  </div><div className="flex gap-2"><Link href="/admin/dashboard" className="rounded-lg bg-[#29292f] px-4 py-2 text-sm font-bold">STAFF PANEL</Link><button onClick={()=>void load()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold">REFRESH</button></div></header>
  {error&&<p role="alert" className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
  {loading?<p className="text-gray-400">Loading...</p>:authorized&&<>
   <div className="mb-5 flex flex-wrap gap-2">{["pending","under_review","evidence_requested","approved","placed","rejected","withdrawn","all"].map(st=><button key={st} onClick={()=>setFilter(st)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter===st?"bg-orange-500":"bg-[#29292f]"}`}>{nice(st).toUpperCase()} ({st==="all"?rows.length:rows.filter(x=>x.status===st).length})</button>)}</div>
   {!shown.length&&<p className="text-gray-400">No level submissions in this category.</p>}
   {shown.map(row=>{
    const vid=youtubeId(row.bot_video_url);
    const done=(checkState[row.id]||[]).filter(Boolean).length;
    return <article key={row.id} className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-[#1b1b21]">
     <div className="flex flex-wrap items-start justify-between gap-3 p-5">
      <div><h2 className="text-xl font-black">{row.level_name} <span className="text-sm font-normal text-gray-400">ID {row.level_id}</span></h2><p className="mt-1 text-sm text-gray-400">Publisher: {row.publisher} · {new Date(row.created_at).toLocaleString()} · Revision {row.revision}</p></div>
      <div className="flex items-center gap-3"><span className="text-xs font-bold text-orange-400">{nice(row.status)}</span><button onClick={()=>setExpanded(expanded===row.id?null:row.id)} className="rounded bg-[#29292f] px-3 py-2 text-xs font-bold">{expanded===row.id?"CLOSE":"REVIEW"}</button></div>
     </div>
     {expanded===row.id&&<div className="space-y-5 border-t border-white/10 p-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
       <div>
        {vid?<iframe title={`${row.level_name} bot completion`} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}`} className="aspect-video w-full rounded-lg bg-black" allowFullScreen/>:<a className="text-orange-400 underline" href={row.bot_video_url} target="_blank" rel="noopener noreferrer">Watch bot completion</a>}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-orange-400"><a href={row.bot_video_url} target="_blank" rel="noopener noreferrer" className="underline">BOT VIDEO</a>{row.macro_url&&<a href={row.macro_url} target="_blank" rel="noopener noreferrer" className="underline">MACRO FILE</a>}</div>
        <p className="mt-3 text-xs text-gray-400">A failed staff macro replay does NOT automatically justify rejection. Review technical conditions and other evidence.</p>
       </div>
       <div className="grid grid-cols-2 gap-3 text-sm">
        {([["Length",`${row.length_seconds}s`],["FPS",row.fps],["TPS",row.tps],["Bot",row.macro_software],["Peak CPS",row.peak_cps??"Not provided"],["Suggested rank",row.suggested_position?`#${row.suggested_position}`:"—"],["Swift clicks",row.has_swift_clicks?"YES":"NO"],["Macrobuffs",row.has_macrobuffs?"YES":"NO"],["Alignments",row.has_alignments?"YES":"NO"],["TPS bypass",row.requires_tps_bypass?"YES":"NO"],["Complex triggers",row.has_complex_triggers?"YES":"NO"],["Creators",row.original_creators||"—"]] as [string,string|number][]).map(([k,v])=><div key={k} className="rounded-lg bg-[#101014] p-3"><span className="block text-xs text-orange-400">{k}</span><strong className="break-words">{v}</strong></div>)}
       </div>
      </div>
      {([["Description",row.level_description],["Technical explanation",row.technical_notes],["Botting conditions",row.botting_conditions],["Creator notes",row.additional_notes]] as [string,string|null][]).filter(x=>x[1]).map(([k,v])=><div key={k}><h3 className="text-sm font-bold text-orange-400">{k}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{v}</p></div>)}
      <section className="rounded-lg border border-white/10 bg-[#111115] p-4"><h3 className="mb-3 font-bold">STAFF REVIEW CHECKLIST <span className="text-orange-400">{done}/{checks.length}</span></h3><div className="grid gap-2 sm:grid-cols-2">{checks.map((c,i)=><label key={c} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!(checkState[row.id]||[])[i]} onChange={()=>toggleCheck(row.id,i)} className="mt-1 accent-orange-500"/>{c}</label>)}</div><p className="mt-3 text-xs text-gray-500">Saved to your staff account. Each reviewer has their own checklist; checks do not replace staff judgment.</p></section>
      <section className="rounded-lg border border-white/10 bg-[#111115] p-4"><h3 className="mb-3 font-bold">STAFF DISCUSSION AND CREATOR MESSAGES</h3>
       {messages.filter(m=>m.submission_id===row.id).map(m=><div key={m.id} className="mb-3 border-b border-white/10 pb-2 text-sm"><span className={`font-bold ${m.is_internal?"text-yellow-400":m.is_staff?"text-orange-400":"text-white"}`}>{m.is_internal?"INTERNAL STAFF NOTE":m.is_staff?"STAFF":"CREATOR"}</span><span className="ml-2 text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</span><p className="mt-1 whitespace-pre-wrap">{m.message}</p></div>)}
       <textarea value={draft} onChange={e=>setDraft(e.target.value)} className={input} rows={3} placeholder="Reply, request technical details, or leave an internal note..."/>
       <label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)} className="accent-orange-500"/>Internal staff-only note (hidden from creator)</label>
       <button disabled={busy===row.id||!draft.trim()} onClick={()=>void post(row)} className="rounded bg-orange-500 px-4 py-2 text-sm font-bold disabled:opacity-40">POST MESSAGE</button>
      </section>
      <section className="rounded-lg border border-white/10 bg-[#111115] p-4">
       <h3 className="mb-3 font-bold">REVIEW ACTIONS</h3>
       {row.user_id===userId?<p className="mb-3 text-sm text-red-300">YOUR SUBMISSION — Another moderator must review it.</p>:null}
       <textarea className={input} rows={2} value={detail[row.id]||""} onChange={e=>setDetail(v=>({...v,[row.id]:e.target.value}))} placeholder="Reason for rejection / evidence request / decision notes..."/>
       <div className="mt-3 flex flex-wrap gap-2">
        {(["claim","under_review","evidence_requested","approved","rejected"] as const).map(a=><button key={a} disabled={busy===row.id||row.user_id===userId||row.status==="placed"||row.status==="withdrawn"} onClick={()=>void change(row,a)} className={`rounded px-3 py-2 text-xs font-bold disabled:opacity-40 ${a==="approved"?"bg-green-700":a==="rejected"?"bg-red-800":"bg-[#33333b]"}`}>{a==="claim"?"CLAIM REVIEW":a==="approved"?"APPROVE — AWAIT PLACEMENT":a==="evidence_requested"?"REQUEST EVIDENCE":a.replace("_"," ").toUpperCase()}</button>)}
       </div>
       {row.status==="approved"&&<div className="mt-4 rounded-lg border border-orange-500/30 p-4"><p className="mb-2 text-sm text-orange-300">First add and rank this level manually using List Management. Then link its existing entry here.</p><Link href="/admin" className="mb-3 inline-block text-sm font-bold text-orange-400 underline">OPEN LIST MANAGEMENT</Link><select className={input} value={placedId[row.id]||""} onChange={e=>setPlacedId(v=>({...v,[row.id]:e.target.value}))}><option value="">Select already-placed ILL level</option>{levels.map(l=><option key={l.id} value={l.id}>#{l.position} — {l.name}</option>)}</select><button disabled={!placedId[row.id]||busy===row.id||row.user_id===userId} onClick={()=>void change(row,"placed")} className="mt-3 rounded bg-green-700 px-4 py-2 text-sm font-bold disabled:opacity-40">MARK PLACED</button></div>}
      </section>
      <section className="rounded-lg border border-white/10 bg-[#111115] p-4"><h3 className="mb-3 font-bold">REVIEW HISTORY</h3>{audits.filter(a=>a.submission_id===row.id).map(a=><div key={a.id} className="border-b border-white/10 py-2 text-xs"><strong className="text-orange-400">{a.action.toUpperCase()}</strong> · {new Date(a.created_at).toLocaleString()} {a.from_status&&`· ${a.from_status} → ${a.to_status}`} {a.detail&&<p className="mt-1 text-gray-300">{a.detail}</p>}</div>)}</section>
     </div>}
    </article>;
   })}
  </>}
 </div></main>;
}
