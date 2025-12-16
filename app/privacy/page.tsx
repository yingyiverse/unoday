'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/lib/language-context';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-screen w-full flex-col snap-none">
      <div className="flex h-full flex-1 grow flex-col">
        <Header />
        <main className="flex flex-1 flex-col w-full overflow-x-hidden">
          <section className="flex flex-col items-center px-4 w-full py-32 max-w-4xl mx-auto">
            <h1 className="font-serif text-4xl md:text-5xl text-text-light-primary dark:text-text-dark-primary mb-8 text-center">
              {t('privacy-title')}
            </h1>

            <div className="prose prose-lg dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary">
              <p className="text-lg mb-6">{t('privacy-intro')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-data-collection-title')}
              </h2>
              <p>{t('privacy-data-collection-text')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-local-storage-title')}
              </h2>
              <p>{t('privacy-local-storage-text')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-no-tracking-title')}
              </h2>
              <p>{t('privacy-no-tracking-text')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-open-source-title')}
              </h2>
              <p>{t('privacy-open-source-text')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-data-control-title')}
              </h2>
              <p>{t('privacy-data-control-text')}</p>

              <h2 className="font-serif text-2xl text-text-light-primary dark:text-text-dark-primary mt-12 mb-4">
                {t('privacy-contact-title')}
              </h2>
              <p>{t('privacy-contact-text')}</p>

              <p className="text-sm mt-12 text-text-light-secondary dark:text-text-dark-secondary">
                {t('privacy-last-updated')}
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
