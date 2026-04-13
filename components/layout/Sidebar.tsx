"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "ホーム", code: "HOME" },
  { href: "/meetings", label: "会議管理", code: "MEET" },
  { href: "/assets", label: "商材 & アバター", code: "ASET" },
  { href: "/embed", label: "埋め込み・API", code: "EMBD" },
  { href: "/analytics", label: "アナリティクス", code: "ANLX" },
  { href: "/logs", label: "商談ログ", code: "LOGS" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-s1 border-r border-white/5 flex flex-col">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="text-xl font-bold text-ac">Sales AI Lab</div>
        <div className="text-[10px] mono text-white/40 mt-1">AVATAR SALES v0.1</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition",
                active
                  ? "bg-ac/15 text-ac border border-ac/30"
                  : "text-white/70 hover:bg-s2 hover:text-white border border-transparent"
              )}
            >
              <span>{item.label}</span>
              <span className="mono text-[10px] text-white/30">{item.code}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-s2 hover:text-white transition"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}
