"use client";

import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

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
      setComments((prev) => [...prev, data.comment]);
      setText("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-[300px] flex-1 flex-col">
      {comments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center">
          <p className="text-[0.8rem] text-[var(--text-muted)]">
            No messages yet. Send a note to the OS2 team below.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="h-[300px] shrink-0 space-y-3 overflow-y-auto pr-1"
        >
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex ${comment.source === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-[var(--radius-xl)] border px-4 py-3.5 ${
                  comment.source === "customer"
                    ? "border-[var(--navy)]/15 bg-[var(--navy)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-muted)]"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p
                    className={`text-[0.75rem] font-semibold ${
                      comment.source === "customer"
                        ? "text-white/90"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {comment.author}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium ${
                      comment.source === "customer"
                        ? "bg-white/15 text-white/80"
                        : "bg-white text-[var(--text-muted)]"
                    }`}
                  >
                    {portalCommentLabel(comment.source)}
                  </span>
                </div>
                <p
                  className={`whitespace-pre-wrap text-[0.867rem] leading-relaxed ${
                    comment.source === "customer"
                      ? "text-white/95"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {comment.text}
                </p>
                <p
                  className={`mt-2 text-[0.6875rem] ${
                    comment.source === "customer"
                      ? "text-white/55"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {formatDate(comment.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-4 shrink-0 space-y-2.5 border-t border-[var(--border)] pt-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message to the OS2 team..."
          rows={2}
          className="input resize-none"
        />
        <GlassButton type="submit" loading={loading} disabled={!text.trim()}>
          Send message
        </GlassButton>
      </form>
    </div>
  );
}
