"use client";

import { getStageIndex } from "@/lib/stages";
import type { StageProgressConfig } from "@/lib/stages";
import { cn } from "@/lib/utils";

export function StageProgress({
  currentListId,
  stageConfig,
  progress,
}: {
  currentListId: string;
  progress: number;
  stageConfig: StageProgressConfig;
}) {
  const config = {
    stages: stageConfig.stages,
    readyForShippingId: stageConfig.readyForShippingId,
    finalizedListIds: new Set(stageConfig.finalizedListIds),
  };

  const stages = stageConfig.stages.filter((s) => !s.id.startsWith("unmapped-"));
  const isReadyToShip =
    !!stageConfig.readyForShippingId &&
    currentListId === stageConfig.readyForShippingId;
  const isFinalized = stageConfig.finalizedListIds.includes(currentListId);

  const currentIndex = getStageIndex(currentListId, config);
  const activeIndex =
    currentIndex >= 0
      ? currentIndex
      : isReadyToShip
        ? Math.max(
            0,
            stages.findIndex((s) => s.name === "Order Shipment") - 1
          )
        : isFinalized
          ? stages.length - 1
          : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[0.8rem] text-[var(--text-muted)]">Overall progress</p>
          <p className="text-[0.867rem] tabular-nums font-semibold text-[var(--text-primary)]">
            {progress}%
          </p>
        </div>
        <div className="progress-track h-2.5">
          <div
            className="progress-fill h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        {isReadyToShip && (
          <p className="mt-2 text-[0.8rem] text-[var(--navy-light)]">
            Packed and ready — shipping handoff in progress
          </p>
        )}
      </div>

      <div className="grid grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-10">
        {stages.map((stage, i) => {
          const isActive = stage.id === currentListId;
          const isDone = i < activeIndex || (isFinalized && !isActive);
          const isCurrent =
            isActive || (isReadyToShip && stage.name === "Order Shipment");

          return (
            <div key={stage.id} className="flex flex-col items-center gap-1.5 px-0.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-[0.75rem] font-semibold transition-colors",
                  isDone && "border-[var(--navy)] bg-[var(--navy)] text-white",
                  isCurrent &&
                    !isDone &&
                    "border-[var(--navy)] bg-white text-[var(--navy)] shadow-[0_0_0_4px_rgba(12,35,64,0.08)]",
                  !isDone &&
                    !isCurrent &&
                    "border-[var(--border)] bg-white text-[var(--text-muted)]"
                )}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "w-full text-center text-[0.625rem] font-medium leading-tight sm:text-[0.6875rem]",
                  isCurrent || isDone
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {stage.shortName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
