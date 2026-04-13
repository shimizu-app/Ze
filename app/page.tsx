"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-ac text-2xl font-bold mb-2">Sales AI Lab</div>
        <div className="text-white/50 text-sm">
          ログインページに移動しています...
        </div>
        <a
          href="/login"
          className="inline-block mt-6 px-5 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg transition"
        >
          手動で移動する
        </a>
      </div>
    </div>
  );
}
