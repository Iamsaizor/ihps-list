"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type List = { id: string; name: string; slug: string };
type Level = { id: string; name: string; position: number; list_id: string };
function parseIllRun(value:string):{start:number;end:number;length:number}|null {
 const m=value.trim().match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:[-–—]\s*(\d+(?:\.\d+)?|\.\d+))?$/);
 if(!m)return null;
 const start=m[2]===undefined?0:Number(m[1]);
 const end=m[2]===undefined?Number(m[1]):Number(m[2]);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>100||end<=start)return null;
 return {start,end,length:Number((end-start).toFixed(8))};
}
type PlayerPoints = { overall_points: number | string; demon_points: number | string; challenge_points: number | string };
type LevelPoints = { level_id: string; points: number | string };
type AcceptedRecord = { percent: number | string };
const formatPoints = (n:number) => n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
type WorldRecord = { percent: number | string; username: string | null; display_name: string | null; completion_url: string | null }; 
type Submission = { id: string; level_id: string; status: string; created_at: string; percent: number; position_at_submission: number; tier_at_submission: number; review_notes: string | null };
const input = "w-full rounded-lg border border-white/10 bg-[#111115] px-3 py-3 text-sm text-white outline-none focus:border-ihps-500";
const label = "mb-1.5 block text-sm font-semibold text-gray-200";
const tierOne = [
  ["3-DEATH RULE", "Show at least 3 deaths directly before the successful run."],
  ["ENDSCREEN & MENU", "Wait for the endscreen, then exit to the level menu. Never exit early."],
  ["RAW FOOTAGE", "Provide downloadable raw footage recorded with OBS Studio, NVIDIA ShadowPlay, or AMD Software. Medal is not allowed."],
  ["AUDIBLE CLICKS", "Every physical click or tap must be clearly audible."],
  ["VIDEO QUALITY", "Aim for smooth, readable 720p / 60 FPS; persistent freezes or lag are grounds for rejection."],
  ["CHEAT INDICATOR", "Keep a visible cheat indicator on-screen throughout the run."],
];
const tierTwo = [
  ["WINNING ATTEMPT", "Only the successful attempt is required."],
  ["LEVEL DROPDOWN", "The level dropdown must be visible; exiting to the level menu is not required."],
  ["AUDIBLE CLICKS", "Clicks or taps must be audible, but volume requirements are more relaxed."],
  ["CHEAT INDICATOR", "A cheat indicator is mandatory. Without Geode or MegaHack, contact staff for an alternative."],
];
const illRules = [
 ["HUMAN-ONLY RECORDS","Every input must be performed manually. Bots, macros, noclip, speedhacks, and altered hitboxes are prohibited."],
 ["BEAT THE CURRENT WR","Your percentage must be strictly higher than the highest accepted human record. Ties and lower scores cannot be submitted."],
 ["NO MINIMUM PROGRESS","Even 0.05% can establish a record if it exceeds the current accepted WR."],
 ["START POSITIONS ALLOWED","Practice mode, checkpoints, and runs from any starting percentage are allowed. The submitted result is the highest percentage reached in one continuous legitimate run."],
 ["NO SPLICING","You cannot combine multiple runs or edit footage to fabricate progress."],
 ["MODIFICATIONS","CBF, FPS bypass, and TPS bypass are permitted under ILL technical rules."],
 ["RAW FOOTAGE REQUIRED","Every ILL world record submission must include a downloadable link to the original, unedited raw footage. A showcase or livestream alone is not enough."],
 ["VIDEO EVIDENCE","Provide a video showing the actual human attempt and a verifiable percentage. Staff may request clicks, input evidence, or technical settings."],
 ["NO TIERS","The ILL has no Tier 1 or Tier 2, 3-death requirement, or mandatory endscreen/level dropdown."],
 ["STAFF APPROVAL","Only accepted records become official. A pending submission must still exceed the WR when staff review it."],
];
const exceptions = [
  ["Recording failure", "A corrupted or full local recording may be replaced by a stream VOD only if clicks are exceptionally clear and staff unanimously approve."],
  ["Low-end hardware", "480p / 30 FPS may be allowed with evidence of hardware limits and clear raw clicks."],
  ["Trusted player", "Staff may excuse minor technical errors based on a proven history of legitimate top-level completions."],
  ["Livestreams", "A Top 5 stream VOD bypasses the 3-death rule, but simultaneous local OBS raw footage is still required."],
  ["First-attempt fluke", "Provide footage/VOD of your previous session; otherwise staff must manually review and may reject."],
];
export default function SubmitRecordPage() {
 const [lists,setLists]=useState<List[]>([]), [levels,setLevels]=useState<Level[]>([]), [history,setHistory]=useState<Submission[]>([]);
 const [userId,setUserId]=useState<string|null>(null), [listId,setListId]=useState(""), [levelId,setLevelId]=useState("");
 const [form,setForm]=useState({completion_url:"",raw_footage_url:"",stream_url:"",previous_session_url:"",device:"",mod_menu:"",custom_level_id:"",notes:"",exception_reason:"",percent:"100",suggested_position:"",difficulty_reason:""});
 const [wr,setWr]=useState<WorldRecord|null>(null),[wrLoading,setWrLoading]=useState(false),[wrError,setWrError]=useState("");
 const [accountPoints,setAccountPoints]=useState<PlayerPoints|null>(null);
 const [levelPoints,setLevelPoints]=useState<number|null>(null);
 const [bestAccepted,setBestAccepted]=useState<number|null>(null);
 const [previewLoading,setPreviewLoading]=useState(false);
 const [previewError,setPreviewError]=useState("");
 const [completionCheckLoading,setCompletionCheckLoading]=useState(false);
 const [completionCheckError,setCompletionCheckError]=useState("");
 const [busy,setBusy]=useState(false), [error,setError]=useState(""), [success,setSuccess]=useState("");
 const update=(key:keyof typeof form,value:string)=>setForm(prev=>({...prev,[key]:value}));
 useEffect(()=>{let active=true; (async()=>{const [a,b,c]=await Promise.all([supabase.from("lists").select("id,name,slug"),supabase.from("levels").select("id,name,position,list_id").order("position"),supabase.auth.getUser()]); if(!active)return; if(a.error)setError(a.error.message);if(b.error)setError(b.error.message);setLists((a.data??[]) as List[]);setLevels((b.data??[]) as Level[]);setListId((a.data??[])[0]?.id??"");setUserId(c.data.user?.id??null)})(); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUserId(session?.user.id??null));return()=>{active=false;subscription.unsubscribe()};},[]);
 useEffect(()=>{if(!userId)return;let live=true;supabase.from("record_submissions").select("id,level_id,status,created_at,percent,position_at_submission,tier_at_submission,review_notes").eq("user_id",userId).order("created_at",{ascending:false}).limit(50).then(({data})=>{if(live)setHistory((data??[]) as Submission[])});return()=>{live=false}},[userId,success]);
 const selectedList=lists.find(l=>l.id===listId);
 const isIll=selectedList?.slug?.toLowerCase()==="impossible";
 const isChallenge=selectedList?.slug?.toLowerCase()==="challenge";
 const isDemon=selectedList?.slug?.toLowerCase()==="demon";
 useEffect(()=>{
   let active=true;
   setAccountPoints(null);
   if(!userId)return;
   supabase.from("player_leaderboard_points").select("overall_points,demon_points,challenge_points").eq("user_id",userId).maybeSingle()
     .then(({data,error})=>{if(!active)return;if(!error)setAccountPoints((data as PlayerPoints|null)??{overall_points:0,demon_points:0,challenge_points:0});});
   return()=>{active=false};
 },[userId,success]);
 useEffect(()=>{
   let active=true;
   setLevelPoints(null);setBestAccepted(null);setPreviewError("");setCompletionCheckError("");
   if(!userId||!levelId||(!isChallenge&&!isDemon)){setPreviewLoading(false);setCompletionCheckLoading(false);return}
   setPreviewLoading(true);setCompletionCheckLoading(true);
   (async()=>{
     const [value,records]=await Promise.all([
       supabase.from("level_points").select("level_id,points").eq("level_id",levelId).maybeSingle(),
       supabase.from("public_level_records").select("percent").eq("level_id",levelId).eq("user_id",userId).order("percent",{ascending:false}).limit(1)
     ]);
     if(!active)return;
     if(records.error)setCompletionCheckError("Unable to check your existing completions. Please try again.");
     else setCompletionCheckError("");
     if(value.error||records.error){setPreviewError(value.error?.message||records.error?.message||"Could not load points");}
     else {const raw=Number((value.data as LevelPoints|null)?.points);setLevelPoints(value.data&&Number.isFinite(raw)?raw:null);setBestAccepted(records.data?.length?Number((records.data[0] as AcceptedRecord).percent):null)}
     setPreviewLoading(false);setCompletionCheckLoading(false);
   })();
   return()=>{active=false};
 },[userId,levelId,isChallenge,isDemon,success]);
 useEffect(()=>{
   setWr(null);setWrError("");
   if(!isIll||!levelId){setWrLoading(false);return}
   let active=true;
   async function fetchWr(){
     setWrLoading(true);
     const {data,error}=await supabase.from("public_level_records")
       .select("percent,username,display_name,completion_url")
       .eq("level_id",levelId).order("percent",{ascending:false}).limit(1);
     if(!active)return;
     if(error){setWrError(error.message);setWr(null)}else{setWr(data?.[0] as WorldRecord||null);setWrError("")}
     setWrLoading(false);
   }
   void fetchWr();
   const refresh=()=>void fetchWr();
   window.addEventListener("focus",refresh);
   return()=>{active=false;window.removeEventListener("focus",refresh)};
 },[isIll,levelId,success]);
 const illRun=isIll?parseIllRun(form.percent):null;
 const enteredPercent=isChallenge?100:isIll?(illRun?.end??NaN):Number(form.percent);
 const wrPercent=wr===null?null:Number(wr.percent);
 const illEligible=!isIll||(!wrLoading&&!wrError&&!!form.raw_footage_url.trim()&&Number.isFinite(enteredPercent)&&enteredPercent>0&&enteredPercent<=100&&(wrPercent===null||enteredPercent>wrPercent));
 const filtered=useMemo(()=>levels.filter(l=>l.list_id===listId),[levels,listId]);
 const selected=levels.find(l=>l.id===levelId); const topFive=selected?selected.position<=5:null;
 const recordValue=(pct:number|null)=>levelPoints===null||pct===null||!Number.isFinite(pct)||pct<=0?0:pct>=100?levelPoints:Math.round(levelPoints*50)/100;
 const projectedGain=levelPoints===null||!Number.isFinite(enteredPercent)||enteredPercent<=0||enteredPercent>100?null:Math.max(0,recordValue(enteredPercent)-recordValue(bestAccepted));
 const alreadyCompleted=(isChallenge||isDemon)&&bestAccepted!==null&&bestAccepted>=100;
 const currentOverall=accountPoints?Number(accountPoints.overall_points):null;
 const currentSelected=accountPoints?Number(isChallenge?accountPoints.challenge_points:accountPoints.demon_points):null;
 async function submit(e:React.FormEvent){e.preventDefault();setError("");setSuccess("");if(!userId){setError("Sign in to submit a record.");return}if(!selected){setError("Select a level.");return}if((isChallenge||isDemon)&&(completionCheckLoading||completionCheckError||previewLoading)){setError(completionCheckError||"Please wait while we check your existing records.");return}if(alreadyCompleted){setError("You already have an accepted 100% completion on this level. You cannot submit another record.");return}if(isIll&&!form.raw_footage_url.trim()){setError("Raw footage is required for every ILL world record.");return}if(isIll&&!illRun){setError("Enter a valid percentage or run such as 35-72.");return}if(isIll&&!illEligible){setError(wrLoading?"Checking current WR...":wrError?"Unable to verify current WR.":"Your percentage must be strictly higher than the current accepted world record.");return}setBusy(true);try{if(isChallenge||isDemon){const {data:existing,error:existingError}=await supabase.from("public_level_records").select("percent").eq("level_id",selected.id).eq("user_id",userId).gte("percent",100).limit(1);if(existingError)throw new Error("Unable to verify existing completions. Please try again.");if(existing?.length)throw new Error("You already have an accepted 100% completion on this level. You cannot submit another record.");}if(form.suggested_position && (!Number.isSafeInteger(Number(form.suggested_position)) || Number(form.suggested_position)<1 || Number(form.suggested_position)>10000)) throw new Error("Suggested position must be between 1 and 10000.");if(form.difficulty_reason.length>2000)throw new Error("Difficulty reasoning must be 2000 characters or less.");const {error:rpcError}=await supabase.rpc(isIll?"ihps_submit_ill_world_record":"ihps_submit_record_with_opinion",{p_suggested_position:form.suggested_position?Number(form.suggested_position):null,p_difficulty_reason:form.difficulty_reason,p_level_id:selected.id,p_completion_url:form.completion_url,p_raw_footage_url:form.raw_footage_url,p_stream_url:form.stream_url,p_previous_session_url:form.previous_session_url,p_device:form.device,p_mod_menu:form.mod_menu,p_custom_level_id:form.custom_level_id,p_notes:form.notes,p_exception_reason:form.exception_reason,p_percent:enteredPercent,...(isIll?{p_run_start:illRun?.start??0}:{})});if(rpcError)throw rpcError;setSuccess("Record submitted! Staff can now review it.");setForm({completion_url:"",raw_footage_url:"",stream_url:"",previous_session_url:"",device:"",mod_menu:"",custom_level_id:"",notes:"",exception_reason:"",percent:"100",suggested_position:"",difficulty_reason:""});}catch(e){setError(e instanceof Error?e.message:"Submission failed")}finally{setBusy(false)}}
 return <main className="min-h-screen bg-[#101014] px-4 py-7 text-white"><div className="mx-auto max-w-7xl"><header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><Link href="/" className="text-3xl font-black text-ihps-500">ihPS</Link><h1 className="mt-2 text-3xl font-extrabold">RECORD SUBMISSION</h1><p className="text-sm text-gray-400">Your selected level determines the rules automatically.</p></div><div className="flex flex-wrap gap-2"><Link className="rounded-lg bg-ihps-500 px-4 py-3 text-sm font-bold" href="/submit/impossible">SUBMIT ILL LEVEL</Link><Link className="rounded-lg bg-[#29292f] px-4 py-3 text-sm font-bold" href="/">← VIEW LISTS</Link></div></header><div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]"><section className="rounded-xl border border-white/10 bg-[#19191e] p-5"><h2 className="mb-5 text-xl font-bold">Submit a record</h2>{!userId&&<div className="mb-4 rounded-lg border border-ihps-500/50 bg-ihps-500/10 p-3 text-sm">You must be signed in with your ihPS account to submit. <Link href="/login" className="font-bold text-ihps-400 underline">Sign in</Link></div>}<form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>List *</label><select className={input} value={listId} onChange={e=>{setListId(e.target.value);setLevelId("")}}><option value="">Select list</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div><label className={label}>Level *</label><select required className={input} value={levelId} onChange={e=>setLevelId(e.target.value)}><option value="">Select level</option>{filtered.map(l=><option key={l.id} value={l.id}>#{l.position} — {l.name}</option>)}</select></div></div>{selected&&(isChallenge||isDemon)&&<div className="rounded-lg border border-white/10 bg-[#111115] px-3 py-2 text-xs">
 <div className="mb-1.5 flex items-center justify-between"><span className="font-semibold text-ihps-400">POINTS PREVIEW</span><span className="text-gray-500">If accepted · #{selected.position}</span></div>
 {previewLoading?<span className="text-gray-400">Loading points...</span>:previewError?<span className="text-red-300">Unable to calculate preview: {previewError}</span>:accountPoints===null||levelPoints===null?<span className="text-gray-400">Points unavailable</span>:<>
 <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1"><span className="text-gray-400"> </span><span className="text-gray-500">Current</span><span className="text-gray-500">Projected</span>
 <span>Overall</span><span className="text-right">{formatPoints(currentOverall??0)}</span><span className="text-right font-semibold text-ihps-400">{projectedGain===null?"—":formatPoints((currentOverall??0)+projectedGain)}</span>
 <span>{isChallenge?"Challenge":"Demon"}</span><span className="text-right">{formatPoints(currentSelected??0)}</span><span className="text-right font-semibold text-ihps-400">{projectedGain===null?"—":formatPoints((currentSelected??0)+projectedGain)}</span></div>
 <div className="mt-1.5 text-right font-semibold text-green-400">{projectedGain===null?"Enter a valid completion %":`+${formatPoints(projectedGain)} pts`}</div>
 </>}
 </div>}{selected&&(isChallenge||isDemon)&&alreadyCompleted&&<div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">You already have an accepted 100% completion on this level. Another record cannot be submitted.</div>}{selected&&(isChallenge||isDemon)&&completionCheckError&&<div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{completionCheckError}</div>}{selected&&!isIll&&<div className={`rounded-lg border p-4 ${topFive?"border-ihps-500/60 bg-ihps-500/10":"border-emerald-500/40 bg-emerald-500/10"}`}><strong>{topFive?"TIER 1 — TOP 1–5":"TIER 2 — POSITION 6+"}</strong><p className="mt-1 text-sm text-gray-300">#{selected.position} {selected.name}. The server verifies this tier again when you submit.</p></div>}{isIll&&selected&&<div className="rounded-xl border border-ihps-500/50 bg-ihps-500/10 p-4">
 <p className="text-xs font-bold tracking-wider text-ihps-400">CURRENT WORLD RECORD — {selected.name}</p>
 {wrLoading?<p className="mt-2 text-sm text-gray-300">Checking accepted records...</p>:wrError?<p className="mt-2 text-sm text-red-300">Unable to load world record: {wrError}</p>:<div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><p className="text-3xl font-black text-ihps-400">{wrPercent===null?"N/A":`${wrPercent.toLocaleString(undefined,{maximumFractionDigits:6})}%`}</p><p className="text-sm text-gray-300">Holder: {wr?.display_name?.trim()||wr?.username||"N/A"}</p></div>{wr?.completion_url&&<a href={wr.completion_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-ihps-400 underline">WATCH WR VIDEO ↗</a>}</div>}
 <p className="mt-3 text-xs text-gray-400">Only accepted human records count. Your submission must beat this percentage, not tie it.</p>
 </div>}
 <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Completion video URL *</label><input required type="url" className={input} value={form.completion_url} onChange={e=>update("completion_url",e.target.value)} placeholder="https://..." /></div>{!isChallenge&&<div><label className={label}>{isIll?"Progress / Run *":"Completion % *"}</label><input required type={isIll?"text":"number"} {...(!isIll?{min:"0.001",max:"100",step:"any"}:{})} className={input} value={form.percent} onChange={e=>update("percent",e.target.value)} placeholder={isIll?"e.g. 14.25 or 35-72":undefined}/>{isIll&&<p className="mt-1 text-xs text-gray-400">Enter a percentage (14.25) or a run (35-72).</p>}</div>}{isIll&&selected&&<div className="sm:col-span-2 rounded-lg border border-white/10 bg-[#111115] p-3 text-sm">{illRun?<><span className="font-semibold text-ihps-400">{illRun.start===0?`0–${illRun.end}%`:`${illRun.start}–${illRun.end}%`}</span> · Run length: <strong>{illRun.length}%</strong> · Highest progress: <strong>{illRun.end}%</strong></>:<span className="text-gray-400">Enter a valid percentage or run to calculate progress.</span>}</div>}{isIll&&selected&&form.percent.trim()!==""&&<div className={`sm:col-span-2 rounded-lg border p-3 text-sm ${illEligible?"border-green-500/40 bg-green-500/10 text-green-300":"border-red-500/40 bg-red-500/10 text-red-300"}`}>{wrLoading?"Checking current WR...":wrError?"Could not verify current WR.":!illRun?"Enter a valid run (start-end) or percentage.":!form.raw_footage_url.trim()?"Raw footage is required.":illEligible?"✓ Eligible to submit — ending percentage exceeds the current accepted WR.":`✕ Ending percentage must exceed ${wrPercent===null?"0":wrPercent}% to qualify.`}</div>}<div><label className={label}>Device *</label><select required className={input} value={form.device} onChange={e=>update("device",e.target.value)}><option value="">Select device</option><option>PC</option><option>Mobile</option><option>Other</option></select></div><div><label className={label}>Mod menu *</label><select required className={input} value={form.mod_menu} onChange={e=>update("mod_menu",e.target.value)}><option value="">Select mod menu</option><option>Geode</option><option>MegaHack</option><option>Other</option><option>None — contact staff</option></select></div><div><label className={label}>Raw footage download {isIll||topFive?"*":"(optional)"}</label><input required={!!(isIll||topFive)} type="url" className={input} value={form.raw_footage_url} onChange={e=>update("raw_footage_url",e.target.value)} placeholder="https://..."/></div><div><label className={label}>Custom level ID (if used)</label><input className={input} value={form.custom_level_id} onChange={e=>update("custom_level_id",e.target.value)}/></div><div><label className={label}>Livestream VOD (if applicable)</label><input type="url" className={input} value={form.stream_url} onChange={e=>update("stream_url",e.target.value)} placeholder="https://..."/></div><div><label className={label}>Previous session footage (if fluke)</label><input type="url" className={input} value={form.previous_session_url} onChange={e=>update("previous_session_url",e.target.value)} placeholder="https://..."/></div></div><div><label className={label}>Additional notes</label><textarea className={input} rows={3} value={form.notes} onChange={e=>update("notes",e.target.value)} placeholder="Anything staff should know"/></div>{!isIll&&<div className="rounded-xl border border-ihps-500/30 bg-ihps-500/5 p-4"><h3 className="text-lg font-bold text-ihps-400">Difficulty Opinion <span className="text-sm font-normal text-gray-400">(optional)</span></h3><p className="mb-4 mt-1 text-sm text-gray-400">Where do you think this level should be placed on its list? Staff will see your suggestion and reasoning. This does not change the actual ranking.</p><div className="mb-3"><label className={label}>Suggested list position</label><input type="number" min="1" max="10000" step="1" className={input} value={form.suggested_position} onChange={e=>update("suggested_position",e.target.value)} placeholder="e.g. 8" /></div><div><label className={label}>Reasoning</label><textarea className={input} rows={4} maxLength={2000} value={form.difficulty_reason} onChange={e=>update("difficulty_reason",e.target.value)} placeholder="Explain your placement and compare it to other levels on the list..." /></div></div>}<div><label className={label}>Exception request (staff review)</label><textarea className={input} rows={2} value={form.exception_reason} onChange={e=>update("exception_reason",e.target.value)} placeholder="Explain any recording failure, hardware limitation, trusted-player exception, etc."/></div><p className="text-xs text-gray-400">{isIll?"By submitting, you confirm this is legitimate human progress achieved in one continuous run. ILL records have no tier system.":"By submitting, you confirm the footage follows the applicable tier rules. Exceptions require staff approval; submitting a request does not guarantee acceptance."}</p><button disabled={busy||!userId||!selected||!illEligible||alreadyCompleted||((isChallenge||isDemon)&&(completionCheckLoading||!!completionCheckError))} className="w-full rounded-lg bg-ihps-500 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy?"SUBMITTING...":"SUBMIT RECORD"}</button>{error&&<p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{success&&<p role="status" className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">{success}</p>}</form><h2 className="mb-3 mt-9 text-xl font-bold">Previous submissions</h2>{history.length===0?<p className="text-sm text-gray-400">No submissions found.</p>:<div className="space-y-2">{history.map(s=><div key={s.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 bg-[#111115] p-3 text-sm"><span>{levels.find(l=>l.id===s.level_id)?.name??"Level"} — {s.percent}% {lists.find(l=>l.id===levels.find(x=>x.id===s.level_id)?.list_id)?.slug==="impossible"?null:<span className="text-gray-400">(Tier {s.tier_at_submission})</span>}</span><span className={s.status==="accepted"?"text-green-400":s.status==="rejected"?"text-red-400":"text-ihps-400"}>{s.status.toUpperCase()}</span>{s.review_notes&&<p className="w-full text-gray-400">Staff: {s.review_notes}</p>}</div>)}</div>}</section><aside className="rounded-xl border border-white/10 bg-[#19191e] p-5"><h2 className="border-b border-white/20 pb-3 text-2xl font-extrabold">Submission Guidelines</h2>{isIll?<><p className="my-4 text-sm text-gray-300">Impossible List records are human world records. There are <strong>no tiers</strong>, regardless of level ranking.</p><h3 className="mt-5 text-xl font-bold text-ihps-400">ILL — WORLD RECORD RULES</h3><ul className="mt-3 space-y-4 text-sm">{illRules.map(([title,body])=><li key={title}><strong>{title}:</strong> <span className="text-gray-300">{body}</span></li>)}</ul></>:<><p className="my-4 text-sm text-gray-300">All lists use the same two-tier system. The tier is based on the level’s <strong>current position</strong>, not its predicted placement.</p><h3 className={`mt-5 text-xl font-bold ${topFive===true?"text-ihps-400":"text-white"}`}>TIER 1 — TOP 1–5 {topFive===true?"← APPLIES":""}</h3><ul className="mt-3 space-y-3 text-sm">{tierOne.map(([title,body])=><li key={title}><strong>{title}:</strong> <span className="text-gray-300">{body}</span></li>)}</ul><h3 className={`mt-7 text-xl font-bold ${topFive===false?"text-ihps-400":"text-white"}`}>TIER 2 — POSITION 6+ {topFive===false?"← APPLIES":""}</h3><ul className="mt-3 space-y-3 text-sm">{tierTwo.map(([title,body])=><li key={title}><strong>{title}:</strong> <span className="text-gray-300">{body}</span></li>)}</ul><h3 className="mt-7 text-xl font-bold">EXCEPTIONS — STAFF REVIEW ONLY</h3><ul className="mt-3 space-y-3 text-sm">{exceptions.map(([title,body])=><li key={title}><strong>{title}:</strong> <span className="text-gray-300">{body}</span></li>)}</ul><p className="mt-5 text-xs text-gray-400">An exception is never automatic. Staff must assess the evidence and legitimacy of each run.</p></>}</aside></div></div></main>
}
