export type PowerKind = 'attempt' | 'extraTime' | 'lessTime';
export type CasualPower = {
  held: Partial<Record<PowerKind, number>>[];
  queued: Partial<Record<PowerKind, boolean>>[];
  usedTurn?: string;
  earned?: {player: number; kind: PowerKind; wordCount: number};
  applied?: {player: number; effects: Partial<Record<PowerKind, boolean>>};
};
export const powerLabels = {
  attempt: 'Next opponent: −1 attempt',
  extraTime: 'Your next turn: +3 seconds',
  lessTime: 'Next opponent: −3 seconds',
};
