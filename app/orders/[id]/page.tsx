import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { fetchOrderDetail, resolveBoardStageConfig, toStageProgressConfig } from "@/lib/trello";
import { GlassCard } from "@/components/ui/GlassCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageShell } from "@/components/layout/PageShell";
import { StageProgress } from "@/components/orders/StageProgress";
import { CommentSection } from "@/components/orders/CommentSection";
import { AttachmentGallery } from "@/components/orders/AttachmentGallery";
import { formatDate } from "@/lib/utils";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const order = await fetchOrderDetail(id, session.matchValue!, session.boardId!);
  if (!order) notFound();

  const stageConfig = toStageProgressConfig(
    await resolveBoardStageConfig(session.boardId!)
  );

  return (
    <div className="min-h-screen">
      <AppHeader
        eyebrow={`PO# ${order.poNumber}`}
        title={order.customerText}
        subtitle={`${order.stageName} · Due ${formatDate(order.due)}`}
        actions={
          <>
            <Link
              href="/dashboard"
              className="text-[0.8rem] text-white/55 transition-colors hover:text-white"
            >
              ← All orders
            </Link>
            <LogoutButton />
          </>
        }
      />

      <PageShell className="space-y-5">
        <GlassCard className="card-padded">
          <h2 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Production progress
          </h2>
          <dl className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <dt className="text-[0.75rem] text-[var(--text-muted)]">Stage</dt>
              <dd className="mt-1 text-[0.867rem] font-semibold leading-snug text-[var(--text-primary)]">
                {order.stageName}
              </dd>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <dt className="text-[0.75rem] text-[var(--text-muted)]">Due</dt>
              <dd className="mt-1 text-[0.867rem] font-semibold text-[var(--text-primary)]">
                {formatDate(order.due)}
              </dd>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <dt className="text-[0.75rem] text-[var(--text-muted)]">Updated</dt>
              <dd className="mt-1 text-[0.867rem] font-semibold text-[var(--text-primary)]">
                {formatDate(order.lastActivity)}
              </dd>
            </div>
          </dl>
          <StageProgress
            currentListId={order.stageId}
            stageConfig={stageConfig}
            progress={order.progress}
          />
        </GlassCard>

        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          <GlassCard className="card-padded lg:col-span-2">
            <h2 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Attachments
            </h2>
            <AttachmentGallery orderId={order.id} attachments={order.attachments} />
          </GlassCard>

          <GlassCard className="card-padded flex flex-col lg:col-span-1">
            <h2 className="mb-4 shrink-0 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Messages
            </h2>
            <CommentSection orderId={order.id} initialComments={order.comments} />
          </GlassCard>
        </div>
      </PageShell>
    </div>
  );
}
