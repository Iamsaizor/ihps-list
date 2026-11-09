"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Artwork = { banner_url: string | null; background_url: string | null };
type Kind = "banner" | "background";
const MAX_BYTES = 5 * 1024 * 1024;
function safeImage(value: string | null) { try { return value && new URL(value).protocol === "https:" ? value : null; } catch { return null; } }

export function ProfileArtworkEditor({ userId }: { userId: string }) {
  const [art, setArt] = useState<Artwork>({ banner_url: null, background_url: null });
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { let live = true; void supabase.from("ihps_profile_artwork").select("banner_url,background_url").eq("user_id",userId).maybeSingle().then(({data,error}) => { if (!live) return; if (data) setArt(data as Artwork); if (error) setMessage(error.message); }); return () => {live=false}; },[userId]);
  async function update(kind: Kind, url: string | null) {
    setBusy(kind); setMessage("");
    try {
      const {data: {user},error:authError} = await supabase.auth.getUser();
      if (authError || user?.id !== userId) throw new Error("Sign in again to edit your profile.");
      const {data,error} = await supabase.rpc("ihps_set_profile_artwork", {p_kind:kind,p_url:url});
      if (error) throw error;
      setArt(data as Artwork);
      setMessage(`${kind === "banner" ? "Banner" : "Background"} saved.`);
    } catch(e) {setMessage(e instanceof Error ? e.message : "Unable to save image.");}
    finally {setBusy(null);}
  }
  async function upload(kind: Kind, file?: File) {
    if (!file) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) {setMessage("Use PNG, JPG, or WebP.");return;}
    if (file.size > MAX_BYTES) {setMessage("Maximum image size is 5 MB.");return;}
    setBusy(kind);setMessage("");
    let path: string | null = null;
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError || user?.id!==userId) throw new Error("Sign in again to upload.");
      const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
      path=`${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from("player-artwork").upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError) throw uploadError;
      const url=supabase.storage.from("player-artwork").getPublicUrl(path).data.publicUrl;
      const {data,error}=await supabase.rpc("ihps_set_profile_artwork",{p_kind:kind,p_url:url});
      if(error) throw error;
      setArt(data as Artwork);setMessage(`${kind === "banner" ? "Banner" : "Background"} uploaded and saved.`);
    } catch(e) { if(path) await supabase.storage.from("player-artwork").remove([path]);setMessage(e instanceof Error?e.message:"Upload failed."); }
    finally {setBusy(null);}
  }
  return <section className="rounded-xl border border-white/10 bg-[#1b1b20] p-6">
    <h2 className="text-xl font-extrabold">PROFILE BANNER & BACKGROUND</h2>
    <p className="mt-1 text-sm text-gray-400">Customize the artwork on your public player page. PNG, JPG or WebP · 5 MB maximum.</p>
    {(["banner","background"] as const).map(kind => <div key={kind} className="mt-5 rounded-lg border border-white/10 bg-[#101014] p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="font-bold uppercase text-orange-400">{kind}</h3><button type="button" disabled={busy!==null} onClick={()=>void update(kind,null)} className="text-xs font-bold text-gray-300 underline disabled:opacity-40">Remove</button></div>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#24242b]" style={{aspectRatio:kind==="banner"?"3 / 1":"16 / 7"}}>{safeImage(art[`${kind}_url`])?<img src={art[`${kind}_url`]!} alt={`${kind} preview`} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-sm text-gray-400">No {kind} selected</div>}</div>
      <input aria-label={`Upload ${kind}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy!==null} className="mt-3 block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-bold file:text-white" onChange={e=>{const file=e.target.files?.[0];e.target.value="";void upload(kind,file);}}/>
      <ArtworkUrlInput key={`${kind}-${art[`${kind}_url`]??""}`} kind={kind} initial={art[`${kind}_url`]??""} disabled={busy!==null} onSave={url=>void update(kind,url)}/>
    </div>)}
    {busy&&<p className="mt-3 text-sm text-orange-400">Saving {busy}...</p>}{message&&<p role="status" className="mt-3 text-sm text-gray-200">{message}</p>}
  </section>;
}
function ArtworkUrlInput({kind,initial,disabled,onSave}:{kind:Kind;initial:string;disabled:boolean;onSave:(url:string)=>void}) {
  const [value,setValue]=useState(initial);
  return <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={`${kind} HTTPS image URL`} type="url" value={value} onChange={e=>setValue(e.target.value)} placeholder="https://... (direct image link)" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#202027] px-3 py-2 text-sm text-white"/><button type="button" disabled={disabled||!safeImage(value)} onClick={()=>onSave(value.trim())} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold disabled:opacity-40">Save URL</button></div>;
}
