import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createPortalMessage } from "@/lib/portal-messages";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const { id } = await params;
  const body = text.trim();

  try {
    const comment = await createPortalMessage({
      cardId: id,
      boardId: session.boardId!,
      customerName: session.matchValue!,
      displayName: session.displayName ?? session.matchValue!,
      body,
    });

    return NextResponse.json({ comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
