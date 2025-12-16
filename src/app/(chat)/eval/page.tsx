import { EvalPageClient } from "@/components/eval/eval-page-client";
import { getSession } from "lib/auth/server";
import { redirect } from "next/navigation";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function EvalPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return <EvalPageClient />;
}
