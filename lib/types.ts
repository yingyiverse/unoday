export interface HistoryItem {
  id: number;
  task: string;
  status: 'complete' | 'giveup';
  duration: number;
  endTime: number;
  date: string;
}

export interface Distraction {
  id: number;
  text: string;
}

export interface DailyLimit {
  date: string;
  count: number;
}

export type BadgeType = 'uno-3' | 'uno-7' | 'uno-30' | 'uno-365';

export interface Achievement {
  badge: BadgeType;
  unlockedAt: string; // Date string when badge was unlocked
  streak: number; // The streak value when badge was unlocked
}
