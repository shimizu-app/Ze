import { redirect } from "next/navigation";

// Force dynamic so the redirect runs at request time, not at build time.
// Without this, Next.js was serving a 404 for the root route on Vercel.
export const dynamic = "force-dynamic";

export default function RootRedirect() {
  redirect("/login");
}
