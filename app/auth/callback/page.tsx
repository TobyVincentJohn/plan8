"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleMagicLink = async () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        // Set the session with the tokens
        await supabase.auth.setSession({ access_token, refresh_token });
        // Immediately sign out to force login
        await supabase.auth.signOut();
        router.replace("/auth?verified=1");
      } else {
        // If no tokens, just go to login
        router.replace("/auth");
      }
    };
    handleMagicLink();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Confirming your email...</div>
    </div>
  );
} 