import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountId = (user.user_metadata?.account_id as string | undefined) ?? null;
  let accountName: string | null = null;
  if (accountId) {
    const { data } = await supabase.from("accounts").select("name").eq("id", accountId).single();
    accountName = (data as { name: string } | null)?.name ?? null;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto" data-account-name={accountName ?? ""}>
          {children}
        </div>
      </main>
    </div>
  );
}
