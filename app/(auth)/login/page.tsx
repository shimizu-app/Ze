"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemo() {
    setDemoLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg || "デモ環境の作成に失敗しました");
      }
      const {
        email: demoEmail,
        password: demoPassword,
        room_id: roomId,
      } = (await res.json()) as { email: string; password: string; room_id: string | null };

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      if (signInError) throw signInError;

      // If the demo seeded a self-demo room, drop the visitor straight
      // into a live conversation with the Sales AI Lab guide. Otherwise
      // fall back to the empty workspace home.
      if (roomId) {
        router.push(`/meet/${roomId}`);
      } else {
        router.push("/home");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "デモ起動に失敗しました");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/home");
        router.refresh();
      } else {
        // Sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("ユーザー作成に失敗しました");

        // Bootstrap account + user_metadata via service_role (bypasses RLS
        // and works even when email confirmation is enabled).
        const bootstrapRes = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: signUpData.user.id,
            company_name: companyName,
          }),
        });
        if (!bootstrapRes.ok) {
          const { error: msg } = await bootstrapRes.json().catch(() => ({}));
          throw new Error(msg || "アカウント作成に失敗しました");
        }

        if (signUpData.session) {
          // Email confirmation is off → user is already signed in.
          // Refresh the session so the new user_metadata.account_id is in the JWT.
          await supabase.auth.refreshSession();
          router.push("/home");
          router.refresh();
        } else {
          // Email confirmation is on → tell the user to check their inbox.
          setError(
            "登録確認メールを送信しました。メール内のリンクをクリックしてから、再度ログインしてください。"
          );
          setMode("login");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-ac">Sales AI Lab</span>
          </h1>
          <p className="mt-2 text-sm text-white/50 mono">AI AVATAR SALES PLATFORM</p>
        </div>

        {/* Demo button — provisions a throwaway account in one click */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={demoLoading || loading}
          className="w-full mb-4 px-5 py-3 rounded-2xl border border-ac/40 bg-ac/10 hover:bg-ac/20 text-ac font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>🚀</span>
          <span>{demoLoading ? "デモ環境を準備中..." : "デモを今すぐ試す"}</span>
        </button>
        <div className="text-center text-[10px] text-white/40 mono mb-4">
          OR USE EMAIL
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-ac/20 bg-s1 p-8 glow-ac space-y-4"
        >
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === "login" ? "bg-ac text-black" : "bg-s2 text-white/70"
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === "signup" ? "bg-ac text-black" : "bg-s2 text-white/70"
              }`}
            >
              新規登録
            </button>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs text-white/60 mb-1 mono">COMPANY</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="株式会社サンプル"
                className="w-full bg-s2 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-ac"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-white/60 mb-1 mono">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-s2 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-ac"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1 mono">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-s2 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-ac"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red/10 border border-red/30 px-3 py-2 text-xs text-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ac hover:bg-neon text-black font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "アカウント作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
