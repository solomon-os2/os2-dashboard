import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fetchAttachmentDownload } from "@/lib/trello";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const forceDownload = new URL(request.url).searchParams.has("download");

  try {
    const { body, name, mimeType } = await fetchAttachmentDownload(
      id,
      attachmentId,
      session.matchValue!
    );

    const inline =
      !forceDownload &&
      (mimeType.startsWith("image/") || mimeType === "application/pdf");

    return new NextResponse(body, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}
