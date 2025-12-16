'use client';

import { useLanguage } from '@/lib/language-context';
import EnsoCircle from '@/components/EnsoCircle';

export default function WitnessProgressSection() {
  const { t } = useLanguage();

  const milestones = [
    { days: 3, key: 'milestone-3-days' as const },
    { days: 7, key: 'milestone-7-days' as const },
    { days: 30, key: 'milestone-30-days' as const },
    { days: 365, key: 'milestone-365-days' as const },
  ];

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-end snap-start pb-[33vh]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center mb-16">
          <h2 className="font-serif text-5xl font-bold leading-tight tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-6xl md:text-7xl">
            {t('section-4-title')}
          </h2>
          <p className="max-w-2xl text-lg text-text-light-secondary dark:text-text-dark-secondary sm:text-xl">
            {t('section-4-text')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12 md:gap-16">
          {milestones.map((milestone, index) => (
            <div key={milestone.days} className="flex flex-col items-center text-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {/* Enso Circle Background */}
                <div className="absolute inset-0">
                  <EnsoCircle
                    size={128}
                    isUnlocked={index === 2}
                    strokeWidth={2}
                    className={
                      index === 2
                        ? 'text-text-light-primary dark:text-text-dark-primary'
                        : 'text-gray-300 dark:text-gray-700'
                    }
                  />
                </div>

                {/* Content */}
                <div
                  className={`flex flex-col items-center justify-center w-full h-full rounded-full transition-colors duration-500 ${
                    index === 2
                      ? 'bg-text-light-primary dark:bg-text-dark-primary'
                      : 'bg-white dark:bg-gray-900/50'
                  }`}
                  style={{ width: '116px', height: '116px' }}
                >
                  <span
                    className={`font-serif font-bold ${
                      index === 2
                        ? milestone.days === 365
                          ? 'text-4xl text-background-light dark:text-background-dark'
                          : 'text-5xl text-background-light dark:text-background-dark'
                        : milestone.days === 365
                        ? 'text-4xl text-text-light-primary dark:text-text-dark-primary'
                        : 'text-5xl text-text-light-primary dark:text-text-dark-primary'
                    }`}
                  >
                    {milestone.days}
                  </span>
                  <span
                    className={`text-sm font-medium uppercase tracking-widest ${
                      index === 2
                        ? 'text-background-light/70 dark:text-background-dark/70'
                        : 'text-text-light-secondary dark:text-text-dark-secondary'
                    }`}
                  >
                    {t('days-label')}
                  </span>
                </div>
              </div>
              <h3 className="mt-6 text-xl font-medium text-text-light-primary dark:text-text-dark-primary">
                {t(milestone.key)}
              </h3>
              <p className="mt-1 text-base text-text-light-secondary dark:text-text-dark-secondary">
                {t('milestone-label')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
