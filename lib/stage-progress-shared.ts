export type StageProgressConfig = {
  stages: { id: string; name: string; shortName: string; order: number }[];
  readyForShippingId: string | null;
  finalizedListIds: string[];
};

type StageIndexConfig = {
  stages: { id: string }[];
  readyForShippingId: string | null;
  finalizedListIds: Set<string>;
};

export function getStageIndex(listId: string, config: StageIndexConfig): number {
  const idx = config.stages.findIndex((s) => s.id === listId);
  if (idx >= 0) return idx;
  if (config.readyForShippingId && listId === config.readyForShippingId) return 6;
  if (config.finalizedListIds.has(listId)) return config.stages.length;
  return -1;
}
