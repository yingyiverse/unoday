'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';

export default function DynamicTitle() {
  const { t } = useLanguage();

  useEffect(() => {
    // Update document title when language changes
    document.title = t('page-title');
  }, [t]);

  return null; // This component doesn't render anything
}
