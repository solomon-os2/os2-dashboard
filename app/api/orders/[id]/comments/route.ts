import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { postOrderComment } from "@/lib/trello";

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
    await postOrderComment(id, session.matchValue!, session.boardId!, body);
    return NextResponse.json({
      comment: {
        id: Date.now().toString(),
        text: body,
        date: new Date().toISOString(),
        author: "Customer",
        initials: "CU",
        source: "customer" as const,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
