import { getSession } from "lib/auth/server";
import { redirect } from "next/navigation";
import { EvalDetailPageClient } from "@/components/eval/detail/eval-detail-page";

// Force dynamic rendering to avoid static generation issues with session
export const dynamic = "force-dynamic";

export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <EvalDetailPageClient evaluationId={id} />;
}
