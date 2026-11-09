"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 3 * 1024 * 1024;

export function AvatarUploader({ userId, onUploaded }: { userId: string; onUploaded: (url: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setMessage("");
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type))) { setMessage("Use PNG, JPG, or WebP."); return; }
    if (file.size > MAX_BYTES) { setMessage("Maximum image size is 3 MB."); return; }
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== userId) throw new Error("Please sign in again.");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("player-avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("player-avatars").getPublicUrl(path);
      try { await onUploaded(data.publicUrl); }
      catch (error) { await supabase.storage.from("player-avatars").remove([path]); throw error; }
      setMessage("Profile picture uploaded and saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  return <div className="rounded-lg border border-white/10 bg-[#101014] p-4">
    <label className="block text-sm font-bold text-white" htmlFor="ihps-avatar-upload">Upload profile picture</label>
    <p className="mt-1 text-xs text-gray-400">PNG, JPG, or WebP · 3 MB max · Saved automatically</p>
    <input id="ihps-avatar-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-3 block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:font-bold file:text-white" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void upload(file); }} />
    {busy && <p className="mt-2 text-sm text-orange-400">Uploading...</p>}
    {message && <p role="status" className="mt-2 text-sm text-gray-300">{message}</p>}
  </div>;
}
