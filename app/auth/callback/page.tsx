"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function AuthCallbackPage(){const router=useRouter();const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{try{const url=new URL(window.location.href);const next=url.searchParams.get("next");const destination=next?.startsWith("/")&&!next.startsWith("//")?next:"/submit";const code=url.searchParams.get("code"),tokenHash=url.searchParams.get("token_hash"),type=url.searchParams.get("type");
 if(code){const {error:e}=await supabase.auth.exchangeCodeForSession(code);if(e)throw e;}
 else if(tokenHash && type==="signup"){const {error:e}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:"signup"});if(e)throw e;}
 else {const hash=new URLSearchParams(url.hash.replace(/^#/,""));if(hash.get("error_description"))throw new Error(hash.get("error_description")!);if(hash.get("access_token")&&hash.get("refresh_token")){const {error:e}=await supabase.auth.setSession({access_token:hash.get("access_token")!,refresh_token:hash.get("refresh_token")!});if(e)throw e;}}
 const {data,error:e}=await supabase.auth.getUser();if(e)throw e;if(!data.user?.email_confirmed_at)throw new Error("Your email is not confirmed yet.");if(active)router.replace(destination);
 }catch(e){if(active)setError(e instanceof Error?e.message:"Verification failed.");}})();return()=>{active=false};},[router]);
 return <main className="flex min-h-screen items-center justify-center bg-[#101014] px-4 text-white"><div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1b1b20] p-7"><Link href="/" className="text-3xl font-black text-orange-500">ihPS</Link><h1 className="mt-5 text-2xl font-bold">{error?"Verification problem":"Verifying your email..."}</h1><p className="mt-3 text-sm text-gray-300">{error||"Please wait while we confirm your account."}</p>{error&&<Link className="mt-4 inline-block text-orange-400 underline" href="/login">Return to login</Link>}</div></main>;
}
