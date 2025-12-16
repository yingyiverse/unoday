import { HistoryItem, Achievement, BadgeType } from './types';

/**
 * Generate mock data for the past 50 days
 */
export function generateMockData(): HistoryItem[] {
  const mockHistory: HistoryItem[] = [];
  const today = new Date();

  // Generate for past 50 days
  for (let i = 0; i < 50; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toDateString();

    // Random number of tasks (0 to 8)
    const taskCount = Math.floor(Math.random() * 9);

    // Skip some days completely (20% chance)
    if (Math.random() < 0.2) continue;

    for (let j = 0; j < taskCount; j++) {
      mockHistory.push({
        id: date.getTime() + j,
        task: `Mock Task ${j}`,
        status: Math.random() > 0.2 ? 'complete' : 'giveup',
        duration: 1500000,
        endTime: date.getTime() + j + 1500000,
        date: dateStr,
      });
    }
  }
  return mockHistory;
}

/**
 * Calculate current streak from history data
 */
export function calculateCurrentStreak(history: HistoryItem[]): number {
  if (history.length === 0) return 0;

  // Get unique dates with at least one completed task
  const completedDates = new Set(history.filter((h) => h.status === 'complete').map((h) => h.date));

  if (completedDates.size === 0) return 0;

  let streak = 0;
  const today = new Date();
  let currentCheck = new Date(today);

  while (true) {
    const dateStr = currentCheck.toDateString();
    if (completedDates.has(dateStr)) {
      streak++;
      currentCheck.setDate(currentCheck.getDate() - 1);
    } else {
      // If it's today and we haven't done it, continue checking yesterday
      if (dateStr === today.toDateString()) {
        currentCheck.setDate(currentCheck.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}

/**
 * Check and grant achievements based on current streak
 * Only grants achievements that haven't been earned yet
 * Returns newly unlocked achievements
 */
export function checkAndGrantAchievements(currentStreak: number): Achievement[] {
  const BADGE_MILESTONES: { days: number; badge: BadgeType }[] = [
    { days: 3, badge: 'uno-3' },
    { days: 7, badge: 'uno-7' },
    { days: 30, badge: 'uno-30' },
    { days: 365, badge: 'uno-365' },
  ];

  // Get existing achievements from localStorage
  const existingAchievements: Achievement[] = JSON.parse(
    localStorage.getItem('unoday_achievements') || '[]'
  );

  const existingBadges = new Set(existingAchievements.map((a) => a.badge));
  const newAchievements: Achievement[] = [];
  const today = new Date().toDateString();

  // Check each milestone
  for (const milestone of BADGE_MILESTONES) {
    // Only grant if streak meets requirement AND badge not already earned
    if (currentStreak >= milestone.days && !existingBadges.has(milestone.badge)) {
      const newAchievement: Achievement = {
        badge: milestone.badge,
        unlockedAt: today,
        streak: currentStreak,
      };
      newAchievements.push(newAchievement);
      existingAchievements.push(newAchievement);
    }
  }

  // Save updated achievements to localStorage
  if (newAchievements.length > 0) {
    localStorage.setItem('unoday_achievements', JSON.stringify(existingAchievements));
  }

  return newAchievements;
}

/**
 * Get all unlocked achievements
 */
export function getUnlockedAchievements(): Achievement[] {
  return JSON.parse(localStorage.getItem('unoday_achievements') || '[]');
}
