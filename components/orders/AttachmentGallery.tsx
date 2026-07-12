"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/GlassButton";
import { formatDate } from "@/lib/utils";

type Attachment = {
  id: string;
  name: string;
  url: string;
  date: string;
  mimeType?: string | null;
  previews?: { url: string; width: number; height: number }[];
};

function attachmentProxyUrl(orderId: string, attachmentId: string) {
  return `/api/orders/${orderId}/attachments/${attachmentId}`;
}

function fileKind(name: string, mimeType?: string | null) {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel") || /\.xlsx?$/i.test(name)) {
    return "spreadsheet";
  }
  if (mime.startsWith("video/")) return "video";
  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(name)) return "image";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.xlsx?$/i.test(name)) return "spreadsheet";
  return "file";
}

function kindLabel(kind: ReturnType<typeof fileKind>) {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "spreadsheet":
      return "Excel";
    case "video":
      return "Video";
    default:
      return "File";
  }
}

function FileTile({
  name,
  kind,
  date,
  selected,
  onClick,
}: {
  name: string;
  kind: ReturnType<typeof fileKind>;
  date: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 text-left transition-all hover:shadow-[var(--shadow-sm)] ${
        selected
          ? "border-[var(--navy)] bg-[var(--surface-muted)] ring-2 ring-[var(--navy)]/10"
          : "border-[var(--border)] bg-white hover:border-[var(--navy-light)]"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-muted)] text-[0.625rem] font-semibold text-[var(--navy)]">
        {kindLabel(kind)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.75rem] font-medium text-[var(--text-primary)]">
          {name}
        </span>
        <span className="block text-[0.625rem] text-[var(--text-muted)]">
          {formatDate(date)}
        </span>
      </span>
    </button>
  );
}

function UploadButton({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.xlsx,.xls"
        onChange={onUpload}
      />
      <GlassButton
        variant="ghost"
        loading={uploading}
        type="button"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        Upload file
      </GlassButton>
    </>
  );
}

export function AttachmentGallery({
  orderId,
  attachments,
}: {
  orderId: string;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    attachments[0]?.id ?? null
  );
  const [previewError, setPreviewError] = useState(false);

  const selected = attachments.find((a) => a.id === selectedId) ?? null;
  const selectedUrl = selected
    ? attachmentProxyUrl(orderId, selected.id)
    : null;
  const selectedKind = selected
    ? fileKind(selected.name, selected.mimeType)
    : null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/orders/${orderId}/attachments`, {
      method: "POST",
      body: form,
    });

    if (res.ok) router.refresh();
    setUploading(false);
    e.target.value = "";
  }

  function selectAttachment(id: string) {
    setSelectedId(id);
    setPreviewError(false);
  }

  if (attachments.length === 0) {
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex min-h-[320px] items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-10 text-center">
            <div>
              <p className="text-[0.867rem] font-medium text-[var(--text-secondary)]">
                No files yet
              </p>
              <p className="mt-1 text-[0.8rem] text-[var(--text-muted)]">
                Artwork and documents from OS2 will appear here
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <UploadButton uploading={uploading} onUpload={handleUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      <div className="min-h-[320px] lg:col-span-2">
        {selected && selectedUrl && selectedKind ? (
          <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-white">
            <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-[0.867rem] font-medium text-[var(--text-primary)]">
                {selected.name}
              </p>
              <p className="text-[0.75rem] text-[var(--text-muted)]">
                {formatDate(selected.date)}
              </p>
            </div>

            <div className="min-h-0 flex-1 bg-[var(--surface-muted)]">
              {selectedKind === "image" && !previewError ? (
                <div className="flex h-full min-h-[260px] items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedUrl}
                    alt={selected.name}
                    className="max-h-[480px] w-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                </div>
              ) : selectedKind === "pdf" ? (
                <iframe
                  src={selectedUrl}
                  title={selected.name}
                  className="h-full min-h-[360px] w-full"
                />
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-white text-[0.8rem] font-semibold text-[var(--navy)]">
                    {kindLabel(selectedKind)}
                  </span>
                  <p className="text-[0.8rem] text-[var(--text-muted)]">
                    Preview not available for this file type
                  </p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
              {(selectedKind === "image" && previewError) ||
              selectedKind === "spreadsheet" ||
              selectedKind === "file" ||
              selectedKind === "video" ? (
                <a
                  href={selectedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <GlassButton variant="ghost" type="button">
                    Open file
                  </GlassButton>
                </a>
              ) : null}
              <a href={`${selectedUrl}?download=1`} className="inline-flex">
                <GlassButton variant="ghost" type="button">
                  Download
                </GlassButton>
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-[320px] flex-col lg:col-span-1">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {attachments.map((att) => (
            <FileTile
              key={att.id}
              name={att.name}
              kind={fileKind(att.name, att.mimeType)}
              date={att.date}
              selected={att.id === selectedId}
              onClick={() => selectAttachment(att.id)}
            />
          ))}
        </div>
        <div className="mt-3 shrink-0">
          <UploadButton uploading={uploading} onUpload={handleUpload} />
        </div>
      </div>
    </div>
  );
}
