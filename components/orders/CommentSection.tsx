"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/GlassButton";
import { formatDate } from "@/lib/utils";
import { portalCommentLabel, type PortalCommentSource } from "@/lib/comments";

type Comment = {
  id: string;
  text: string;
  date: string;
  author: string;
  initials: string;
  source: PortalCommentSource;
};

export function CommentSection({
  orderId,
  initialComments,
}: {
  orderId: string;
  initialComments: Comment[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/orders/${orderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setText("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message to the OS2 team..."
          rows={3}
          className="input resize-none"
        />
        <GlassButton type="submit" loading={loading} disabled={!text.trim()}>
          Send message
        </GlassButton>
      </form>

      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-[0.75rem] text-[var(--text-muted)]">No messages yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.733rem] font-semibold text-white ${
                    comment.source === "customer"
                      ? "bg-[var(--navy)]"
                      : "bg-[var(--text-secondary)]"
                  }`}
                >
                  {comment.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.75rem] font-medium text-[var(--text-primary)]">
                      {comment.author}
                    </p>
                    <span
                      className={`badge ${
                        comment.source === "customer" ? "badge-navy" : "badge-muted"
                      }`}
                    >
                      {portalCommentLabel(comment.source)}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">
                    {formatDate(comment.date)}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-[0.75rem] leading-relaxed text-[var(--text-secondary)]">
                {comment.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
