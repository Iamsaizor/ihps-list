"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
type Row={id:string;list_id:string;level_id:string;user_id:string;percent:number;status:string;completion_url:string;raw_footage_url:string|null;stream_url:string|null;previous_session_url:string|null;device:string;mod_menu:string;notes:string|null;exception_reason:string|null;review_notes:string|null;created_at:string};
type List={id:string;name:string};type Level={id:string;name:string};
type PlayerProfile={user_id:string;username:string;display_name:string|null};
type History={actor_id:string;from_status:string;to_status:string;reason:string|null;changed_at:string};
export default function SubmissionReview(){
 const [profiles,setProfiles]=useState<Record<string,PlayerProfile>>({}),[rows,setRows]=useState<Row[]>([]),[lists,setLists]=useState<List[]>([]),[levels,setLevels]=useState<Level[]>([]),[allowed,setAllowed]=useState<string[]>([]),[userId,setUserId]=useState(""),[filter,setFilter]=useState("pending"),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(""),[error,setError]=useState(""),[history,setHistory]=useState<Record<string,History[]>>({}),[expanded,setExpanded]=useState<string|null>(null);
 async function load(){setError("");const u=await supabase.auth.getUser();if(!u.data.user){setError("Sign in to review submissions.");return;}setUserId(u.data.user.id);
  const [ls,lv,rights]=await Promise.all([supabase.from("lists").select("id,name"),supabase.from("levels").select("id,name"),supabase.rpc("ihps_my_staff_access")]);
  if(ls.error||lv.error||rights.error){setError(ls.error?.message||lv.error?.message||rights.error?.message||"Unable to load");return;}
  setLists((ls.data||[]) as List[]);setLevels((lv.data||[]) as Level[]);
  const ids=(rights.data||[]).map((x:{list_id:string})=>x.list_id);setAllowed(ids);
  if(!ids.length){setRows([]);setError("You have no assigned review lists.");return;}
  const r=await supabase.from("record_submissions").select("*").in("list_id",ids).order("created_at",{ascending:false}).limit(500);
  if(r.error){setError(r.error.message);return;}
  const submissions=(r.data||[]) as Row[];
  setRows(submissions);
  const playerIds=[...new Set(submissions.map(row=>row.user_id).filter(Boolean))];
  if(!playerIds.length){setProfiles({});return;}
  const playerResult=await supabase.from("player_profiles").select("user_id,username,display_name").in("user_id",playerIds);
  if(playerResult.error){setError("Player names could not be loaded: "+playerResult.error.message);return;}
  setProfiles(Object.fromEntries(((playerResult.data||[]) as PlayerProfile[]).map(profile=>[profile.user_id,profile])));
 }
 useEffect(()=>{void load()},[]);
 async function review(row:Row,status:"accepted"|"rejected"){
  if(row.user_id===userId){setError("You cannot review or reverse your own submission.");return;}
  const reversal=row.status!=="pending";
  const reason=(notes[row.id]??row.review_notes??"").trim();
  if(reversal&&!reason){setError("Enter a reason before reversing an existing decision.");return;}
  if(!confirm(`${reversal?"REVERSE PREVIOUS DECISION AND ":""}${status.toUpperCase()} this record?${reversal?" This will affect the player's points.":""}`))return;
  setBusy(row.id);setError("");
  const r=await supabase.rpc("review_record",{p_submission_id:row.id,p_status:status,p_notes:reason});
  if(r.error)setError(r.error.message);
  await load();setBusy("");
 }
 async function toggleHistory(id:string){if(expanded===id){setExpanded(null);return;}setExpanded(id);const r=await supabase.rpc("ihps_submission_review_history",{p_submission_id:id});if(r.error)setError(r.error.message);else setHistory(h=>({...h,[id]:(r.data||[]) as History[]}));}
 return <main className="min-h-screen bg-[#101014] p-5 text-white"><div className="mx-auto max-w-6xl"><header className="mb-5 flex items-center justify-between border-b border-white/10 pb-4"><div><Link href="/admin" className="text-2xl font-black text-orange-500">ihPS</Link><h1 className="text-3xl font-black">SUBMISSION REVIEWS</h1><p className="text-sm text-gray-400">Assigned lists only · Decisions can be reversed · Self-review is prohibited</p></div><div className="flex gap-2"><Link href="/admin/staff" className="rounded bg-[#29292f] px-3 py-2">Staff panel</Link><button onClick={()=>void load()} className="rounded bg-orange-500 px-4 py-2 font-bold">REFRESH</button></div></header>
 {error&&<p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-red-300">{error}</p>}
 <div className="mb-4 flex flex-wrap gap-2">{["pending","accepted","rejected","all"].map(f=><button key={f} className={`rounded px-4 py-2 font-bold ${filter===f?"bg-orange-500":"bg-[#29292f]"}`} onClick={()=>setFilter(f)}>{f.toUpperCase()}</button>)}</div>
 {rows.filter(r=>filter==="all"||r.status===filter).map(r=><article key={r.id} className="mb-4 rounded-xl border border-white/10 bg-[#1b1b21] p-5"><div className="mb-2 flex justify-between gap-3"><h2 className="text-xl font-bold">{levels.find(x=>x.id===r.level_id)?.name||r.level_id} — {r.percent}%</h2><span className={r.status==="accepted"?"text-green-400":r.status==="rejected"?"text-red-400":"text-orange-400"}>{r.status.toUpperCase()}</span></div>
 <p className="text-sm text-gray-400">{lists.find(x=>x.id===r.list_id)?.name} · Player: {profiles[r.user_id]?.username ? <Link href={`/players/${encodeURIComponent(profiles[r.user_id].username)}`} className="text-orange-400 hover:underline">{profiles[r.user_id].display_name?.trim()||profiles[r.user_id].username} (@{profiles[r.user_id].username})</Link> : <span className="text-gray-300">Unknown player</span>} · {new Date(r.created_at).toLocaleString()}</p><p className="text-sm text-gray-400">Device: {r.device} · Mod menu: {r.mod_menu}</p>
 <div className="my-3 flex flex-wrap gap-4 text-orange-400">{[["Completion",r.completion_url],["Raw footage",r.raw_footage_url],["Livestream",r.stream_url],["Previous session",r.previous_session_url]].filter((x):x is string[]=>Boolean(x[1])).map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer" className="underline">{label}</a>)}</div>
 {r.notes&&<p>Notes: {r.notes}</p>}{r.exception_reason&&<p className="text-orange-300">Exception: {r.exception_reason}</p>}
 <textarea className="mt-3 w-full rounded border border-white/10 bg-[#101014] p-3" placeholder={r.status==="pending"?"Staff notes / rejection reason":"Required: reason for reversing the decision"} value={notes[r.id]??(r.status==="pending"?r.review_notes??"":"")} onChange={e=>setNotes(n=>({...n,[r.id]:e.target.value}))}/>
 {r.user_id===userId?<p className="mt-3 rounded bg-red-900/30 p-3 text-red-300">YOUR SUBMISSION — Another moderator must review this.</p>:<div className="mt-3 flex flex-wrap gap-2"><button disabled={busy===r.id||!allowed.includes(r.list_id)||r.status==="accepted"} onClick={()=>void review(r,"accepted")} className="rounded bg-green-700 px-5 py-2 font-bold disabled:opacity-40">{r.status==="rejected"?"REVOKE REJECTION → ACCEPT":"ACCEPT"}</button><button disabled={busy===r.id||!allowed.includes(r.list_id)||r.status==="rejected"} onClick={()=>void review(r,"rejected")} className="rounded bg-red-800 px-5 py-2 font-bold disabled:opacity-40">{r.status==="accepted"?"REVOKE ACCEPTANCE → REJECT":"REJECT"}</button></div>}
 <button onClick={()=>void toggleHistory(r.id)} className="mt-4 text-sm text-orange-400 underline">{expanded===r.id?"Hide":"View"} decision history</button>
 {expanded===r.id&&<div className="mt-3 rounded bg-[#101014] p-3 text-sm">{(history[r.id]||[]).length===0?<p className="text-gray-400">No recorded history yet (older decisions may predate this update).</p>:(history[r.id]||[]).map((h,i)=><div key={i} className="border-b border-white/10 py-2"><strong>{h.from_status.toUpperCase()} → {h.to_status.toUpperCase()}</strong><span className="ml-2 text-gray-400">{new Date(h.changed_at).toLocaleString()} · Staff: {profiles[h.actor_id]?.display_name?.trim()||profiles[h.actor_id]?.username||"Unknown staff member"}</span>{h.reason&&<p className="text-gray-300">Reason: {h.reason}</p>}</div>)}</div>}
 </article>)}
 {!rows.some(r=>filter==="all"||r.status===filter)&&<p className="text-gray-400">No submissions in this category.</p>}
 </div></main>;
}
