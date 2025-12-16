'use client';

import { useState, forwardRef } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Distraction } from '@/lib/types';

interface DistractionDrawerProps {
  open: boolean;
  distractions: Distraction[];
  onClose: () => void;
  onAdd: (text: string) => void;
  onDelete: (id: number) => void;
  onReorder: (distractions: Distraction[]) => void;
  isPlatformMac?: boolean;
}

const DistractionDrawer = forwardRef<HTMLDivElement, DistractionDrawerProps>(
  ({ open, distractions, onClose, onAdd, onDelete, onReorder, isPlatformMac = false }, ref) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
      setShowHint(false);
    }
  };

  const handleInputFocus = () => {
    const hintSeen = localStorage.getItem('unoday_distraction_hint_seen');
    if (!hintSeen) {
      setShowHint(true);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      localStorage.setItem('unoday_distraction_hint_seen', 'true');
      setShowHint(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newDistractions = [...distractions];
    const [draggedItem] = newDistractions.splice(draggedIndex, 1);
    newDistractions.splice(dropIndex, 0, draggedItem);

    onReorder(newDistractions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      ref={ref}
      className={`fixed top-0 right-0 h-full w-80 bg-[#111] border-l border-white/10 transform transition-transform duration-500 z-50 flex flex-col p-6 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-white text-xl font-serif">{t('distraction-title')}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="relative mb-8">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full bg-white/5 border border-white/10 rounded p-4 text-white placeholder-white/30 focus:outline-none focus:border-black hover:border-black focus:ring-0 transition-colors"
          placeholder={t('distraction-placeholder')}
          autoComplete="off"
        />
        {showHint && (
          <div className="absolute -bottom-6 right-0 text-xs text-white/30">{t('distraction-enter-hint')}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {distractions.map((d, index) => (
            <div
              key={d.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center justify-between bg-white/5 p-3 rounded text-sm text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-white/50' : ''
              }`}
            >
              <span>{d.text}</span>
              <button
                onClick={() => onDelete(d.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="mt-6 text-right">
        <div className="text-white/30 text-xs font-mono">
          <span className={isPlatformMac ? '' : 'hidden'}>⌘+D</span>
          <span className={isPlatformMac ? 'hidden' : ''}>Ctrl+D</span>
        </div>
      </div>
    </div>
  );
});

DistractionDrawer.displayName = 'DistractionDrawer';

export default DistractionDrawer;
