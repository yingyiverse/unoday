'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FocusMode from '@/components/FocusMode';
import Footer from '@/components/Footer';
import EnsoCircle from '@/components/EnsoCircle';
import { useLanguage } from '@/lib/language-context';
import { DAILY_UNO_LIMIT, USE_MOCK_DATA } from '@/lib/constants';
import { HistoryItem, Achievement, BadgeType } from '@/lib/types';
import { generateMockData, calculateCurrentStreak, getUnlockedAchievements } from '@/lib/utils';

export default function WitnessPage() {
  const { t } = useLanguage();
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<BadgeType>>(new Set());

  useEffect(() => {
    // Load history data
    const historyData = USE_MOCK_DATA ? generateMockData() : JSON.parse(localStorage.getItem('unoday_history') || '[]');
    setHistory(historyData);

    // Calculate today's count
    const today = new Date().toDateString();
    const todayCount = historyData.filter((item: HistoryItem) => item.date === today && item.status === 'complete').length;
    setTodayCompleted(todayCount);

    // Calculate streak
    const currentStreak = calculateCurrentStreak(historyData);
    setStreak(currentStreak);

    // Load unlocked achievements
    const achievements = getUnlockedAchievements();
    const badgeSet = new Set(achievements.map((a) => a.badge));
    setUnlockedBadges(badgeSet);

    // Ensure page starts at top
    window.scrollTo(0, 0);
  }, []);

  const getActivityDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d);
    }
    return dates;
  };

  const renderActivityGrid = () => {
    const dates = getActivityDates();

    const dataMap: Record<string, HistoryItem[]> = {};
    history.forEach((item) => {
      if (!dataMap[item.date]) {
        dataMap[item.date] = [];
      }
      dataMap[item.date].push(item);
    });

    return dates.map((date, colIndex) => {
      const dateStr = date.toDateString();
      const dayData = dataMap[dateStr] || [];

      return (
        <div key={colIndex} className="flex flex-col-reverse gap-1">
          {Array.from({ length: DAILY_UNO_LIMIT }).map((_, slotIndex) => {
            const task = dayData[slotIndex];
            let className = 'w-3 h-3 border border-text-light-primary/20 dark:border-text-dark-primary/20';

            if (task) {
              if (task.status === 'complete') {
                className = 'w-3 h-3 bg-text-light-primary dark:bg-text-dark-primary border-transparent';
              } else if (task.status === 'giveup') {
                className = 'w-3 h-3 bg-gray-400 dark:bg-gray-600 border-transparent';
              }
            }

            return <div key={slotIndex} className={className}></div>;
          })}
        </div>
      );
    });
  };

  const renderDateAxis = () => {
    const dates = getActivityDates();
    const dateIndices = [0, 12, 24, 36, 48, 59];

    return (
      <div className="flex gap-1.5 px-4 min-w-max relative">
        {dates.map((date, colIndex) => {
          const shouldShowDate = dateIndices.includes(colIndex);

          return (
            <div key={colIndex} className="w-3 flex justify-center">
              {shouldShowDate && (
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary whitespace-nowrap">
                  {(date.getMonth() + 1)}/{date.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const badges = [
    { days: 3, key: 'badge-uno-3' as const, badgeType: 'uno-3' as BadgeType },
    { days: 7, key: 'badge-uno-7' as const, badgeType: 'uno-7' as BadgeType },
    { days: 30, key: 'badge-uno-30' as const, badgeType: 'uno-30' as BadgeType },
    { days: 365, key: 'badge-uno-365' as const, badgeType: 'uno-365' as BadgeType },
  ];

  const getSubtitle = () => {
    if (todayCompleted === 0) {
      return t('witness-subtitle-empty');
    }
    const unitKey = todayCompleted === 1 ? 'witness-unit-thing' : 'witness-unit-things';
    const unit = t(unitKey);
    const prefix = t('witness-subtitle-prefix');
    const suffix = t('witness-subtitle-suffix');
    return `${prefix}${todayCompleted} ${unit}${suffix}`;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col snap-none">
      <div className="flex h-full flex-1 grow flex-col">
        <Header />
        <main className="flex flex-1 flex-col w-full overflow-x-hidden snap-none">
          {/* Top Section: Daily Witness & Grid */}
          <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 w-full pt-32 pb-16 md:pt-16">
            {/* Title & Subtitle */}
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl md:text-5xl text-text-light-primary dark:text-text-dark-primary mb-4">
                {t('witness-title')}
              </h1>
              <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary font-light">{getSubtitle()}</p>
            </div>

            {/* Grid Container */}
            <div className="w-full max-w-6xl overflow-x-auto custom-scrollbar">
              <div className="flex flex-col items-center">
                <div className="flex gap-1.5 px-4 min-w-max mb-2">{renderActivityGrid()}</div>
                <div className="mt-2">{renderDateAxis()}</div>
              </div>
            </div>
          </section>

          {/* Bottom Section: Badges */}
          <section className="flex flex-col items-center justify-center px-4 w-full bg-gray-50/50 dark:bg-white/5 py-20 pb-32">
            <div className="text-center mb-16">
              <h3 className="font-serif text-4xl md:text-5xl text-text-light-primary dark:text-text-dark-primary mb-4">
                {t('witness-achievements')}
              </h3>
              <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary font-light">
                {t('witness-achievements-subtitle').replace('{streak}', streak.toString())}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-20 md:gap-32 text-text-light-primary dark:text-text-dark-primary">
              {badges.map((badge) => {
                // Badge is unlocked if: already earned OR current streak meets requirement
                const isUnlocked = unlockedBadges.has(badge.badgeType) || streak >= badge.days;
                const opacityClass = isUnlocked ? 'opacity-100' : 'opacity-30 grayscale';

                return (
                  <div key={badge.days} className={`flex flex-col items-center gap-6 transition-all duration-500 ${opacityClass}`}>
                    <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                      {/* Enso Circle Background */}
                      <div className="absolute inset-0">
                        <EnsoCircle
                          size={200}
                          isUnlocked={isUnlocked}
                          strokeWidth={3}
                          className="text-current"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col items-center justify-center w-[184px] h-[184px] rounded-full">
                        <span className="font-serif text-7xl">
                          {badge.days}
                        </span>
                      </div>
                    </div>
                    <span className="text-base uppercase tracking-widest font-medium">{t(badge.key)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
        <Footer />
      </div>
      <FocusMode />
    </div>
  );
}
