'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/language-context';
import { DAILY_UNO_LIMIT, LONG_PRESS_DURATION } from '@/lib/constants';
import { Distraction, HistoryItem, DailyLimit, Achievement } from '@/lib/types';
import { calculateCurrentStreak, checkAndGrantAchievements } from '@/lib/utils';
import DistractionDrawer from './FocusMode/DistractionDrawer';
import { Oswald } from 'next/font/google';

const oswald = Oswald({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

type FocusStage = 'input' | 'active' | 'result';
type AmbientSound = 'countryside' | 'beach' | 'ocean' | 'snow' | 'himalaya' | 'lightrain' | 'downpour' | 'lake' | null;

const AMBIENT_SOUNDS = [
  {
    id: 'countryside' as const,
    labelKey: 'sound-countryside' as const,
    file: '/audio/Countryside Night.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="10" cy="10" r="6" fill="currentColor" opacity="0.3"/>
        <path d="M20 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor"/>
        <path d="M26 14l0.5 1 1 0.5-1 0.5-0.5 1-0.5-1-1-0.5 1-0.5z" fill="currentColor"/>
      </svg>
    )
  },
  {
    id: 'beach' as const,
    labelKey: 'sound-beach' as const,
    file: '/audio/Beach Waves at Night.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M2 16c4-3 8-3 12 0s8 3 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M2 22c4-3 8-3 12 0s8 3 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </svg>
    )
  },
  {
    id: 'ocean' as const,
    labelKey: 'sound-ocean' as const,
    file: '/audio/Ocean.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      </svg>
    )
  },
  {
    id: 'snow' as const,
    labelKey: 'sound-snow' as const,
    file: '/audio/Snow.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 6v20M6 16h20M10 10l12 12M10 22l12-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="16" cy="6" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="26" r="1.5" fill="currentColor"/>
        <circle cx="6" cy="16" r="1.5" fill="currentColor"/>
        <circle cx="26" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    )
  },
  {
    id: 'himalaya' as const,
    labelKey: 'sound-himalaya' as const,
    file: '/audio/Snow Falling_Under_Rock_Himalaya.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M2 26L16 6l14 20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 26L16 14l8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    )
  },
  {
    id: 'lightrain' as const,
    labelKey: 'sound-lightrain' as const,
    file: '/audio/Light_Rain_Forest_Brazil_Increasing_Intensity.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M8 12v8M16 10v10M24 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </svg>
    )
  },
  {
    id: 'downpour' as const,
    labelKey: 'sound-downpour' as const,
    file: '/audio/Downpour01.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 10v12M12 8v14M18 10v12M24 8v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'lake' as const,
    labelKey: 'sound-lake' as const,
    file: '/audio/Gentle Lake.wav',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="16" rx="12" ry="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
        <ellipse cx="16" cy="16" rx="8" ry="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      </svg>
    )
  },
];

export default function FocusMode() {
  const { t } = useLanguage();

  // All initial state must be identical on server and client to prevent hydration mismatch
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<FocusStage>('input');
  const [unoTask, setUnoTask] = useState('');
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'uno' | 'timer'>('uno');
  const [resultType, setResultType] = useState<'complete' | 'giveup'>('complete');
  const [showStartButton, setShowStartButton] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [isPlatformMac, setIsPlatformMac] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [countdownMode, setCountdownMode] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [showTimerText, setShowTimerText] = useState(true);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedSound, setSelectedSound] = useState<AmbientSound>(null);
  const [showBellAnimation, setShowBellAnimation] = useState(false);
  const [countdownTextVisible, setCountdownTextVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAudioResumePrompt, setShowAudioResumePrompt] = useState(false);
  const [pendingAudioSound, setPendingAudioSound] = useState<AmbientSound>(null);
  const [showDistractions, setShowDistractions] = useState(false);
  const [isExitingCountdown, setIsExitingCountdown] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const hideHeaderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewFadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentDownpourIndexRef = useRef<number>(1);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenHintTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Platform detection
  useEffect(() => {
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
    setIsPlatformMac(isMac);
    if (isMac) {
      document.body.classList.add('is-mac');
    }
  }, []);

  // Restore state from localStorage after hydration
  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);
    document.documentElement.classList.add('focus-hydrated');

    // Restore focus mode state from localStorage
    const focusMode = localStorage.getItem('unoday_focus_mode');
    if (focusMode === 'true') {
      const savedStage = localStorage.getItem('unoday_focus_stage');
      const savedTask = localStorage.getItem('unoday_current_task');
      const savedStartTime = localStorage.getItem('unoday_start_time');
      const savedActiveTab = localStorage.getItem('unoday_active_tab');
      const savedCountdownMode = localStorage.getItem('unoday_countdown_mode');
      const savedCountdownStartTime = localStorage.getItem('unoday_countdown_start_time');
      const savedCountdownDuration = localStorage.getItem('unoday_countdown_duration');
      const savedSelectedTime = localStorage.getItem('unoday_selected_time');
      const savedSelectedSound = localStorage.getItem('unoday_selected_sound');

      // Restore basic state
      setIsVisible(true);
      setStage((savedStage as FocusStage) || 'input');
      setUnoTask(savedTask || '');
      setStartTime(savedStartTime ? parseInt(savedStartTime) : 0);
      setActiveTab((savedActiveTab as 'uno' | 'timer') || 'uno');

      // Restore countdown state if exists
      if (savedCountdownMode === 'true' && savedCountdownStartTime && savedCountdownDuration) {
        const duration = parseInt(savedCountdownDuration);
        const elapsed = Math.floor((Date.now() - parseInt(savedCountdownStartTime)) / 1000);
        const remaining = Math.max(0, duration - elapsed);

        if (remaining > 0) {
          setCountdownMode(true);
          setCountdownDuration(duration);
          setCountdownRemaining(remaining);
          setSelectedTime(savedSelectedTime ? parseInt(savedSelectedTime) : null);
          setSelectedSound((savedSelectedSound as AmbientSound) || null);
          setCountdownTextVisible(true);

          // Try to restart ambient sound if countdown was active
          // Browser may block autoplay, but worth trying
          if (savedSelectedSound) {
            setTimeout(() => {
              const sound = savedSelectedSound as AmbientSound;
              playAmbientSound(sound).catch(() => {
                // Autoplay was blocked, show prompt to user
                setShowAudioResumePrompt(true);
                setPendingAudioSound(sound);
              });
            }, 100);
          }
        }
      } else if (savedSelectedTime) {
        setSelectedTime(parseInt(savedSelectedTime));
        if (savedSelectedSound) {
          setSelectedSound(savedSelectedSound as AmbientSound);
        }
      }

      // Apply persisted styling
      document.documentElement.classList.add('focus-mode-active');
      if (bgRef.current) {
        bgRef.current.classList.add('focus-persisted');
      }
    }

    // Restore distractions
    const savedDistractions = localStorage.getItem('unoday_distractions');
    if (savedDistractions) {
      setDistractions(JSON.parse(savedDistractions));
    }

    updateDailyCount();

    // Listen for enterFocusMode event from HeroSection
    const handleEnterFocusMode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { x, y, top, left, right, bottom } = customEvent.detail || {};
      enterFocusMode(x, y, top, left, right, bottom);
    };

    window.addEventListener('enterFocusMode', handleEnterFocusMode as EventListener);

    return () => {
      window.removeEventListener('enterFocusMode', handleEnterFocusMode as EventListener);
    };
  }, []);

  // Listen for click to resume audio if autoplay was blocked
  useEffect(() => {
    if (!showAudioResumePrompt || !pendingAudioSound) return;

    const handleClick = () => {
      playAmbientSound(pendingAudioSound).then(() => {
        setShowAudioResumePrompt(false);
        setPendingAudioSound(null);
      }).catch(err => {
        console.error('Failed to resume audio:', err);
      });
    };

    window.addEventListener('click', handleClick, { once: true });

    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [showAudioResumePrompt, pendingAudioSound]);

  // Update daily count display
  const updateDailyCount = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('unoday_daily_limit');
    if (stored) {
      const data: DailyLimit = JSON.parse(stored);
      if (data.date === today) {
        setDailyCount(data.count);
      } else {
        setDailyCount(0);
      }
    } else {
      setDailyCount(0);
    }
  };

  // Timer effect - removed as timer display is no longer needed

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVisible && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
      }

      // Fullscreen shortcut: F or Cmd/Ctrl + Shift + F
      if (isVisible && (stage === 'input' || stage === 'active')) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable);

        const isCombo = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f';
        const isSingleF = !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'f' && !isTyping;

        if (isCombo || isSingleF) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, stage]);

  // Show fullscreen hint in input stage
  useEffect(() => {
    if (stage === 'input' && isVisible) {
      // Clear any existing timer
      if (fullscreenHintTimerRef.current) {
        clearTimeout(fullscreenHintTimerRef.current);
      }

      // Show hint after 3 seconds
      fullscreenHintTimerRef.current = setTimeout(() => {
        setShowFullscreenHint(true);

        // Hide hint after 8 seconds
        setTimeout(() => {
          setShowFullscreenHint(false);
        }, 8000);
      }, 3000);

      return () => {
        if (fullscreenHintTimerRef.current) {
          clearTimeout(fullscreenHintTimerRef.current);
        }
      };
    } else {
      // Hide hint when not in input stage
      setShowFullscreenHint(false);
      if (fullscreenHintTimerRef.current) {
        clearTimeout(fullscreenHintTimerRef.current);
      }
    }
  }, [stage, isVisible]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!drawerOpen) return;

      const target = e.target as Node;
      const isClickInsideDrawer = drawerRef.current?.contains(target);
      const isClickOnToggle = toggleRef.current?.contains(target);

      if (!isClickInsideDrawer && !isClickOnToggle) {
        setDrawerOpen(false);
      }
    };

    if (isVisible && drawerOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isVisible, drawerOpen]);

  // Check input
  useEffect(() => {
    setShowStartButton(unoTask.trim().length > 0);
  }, [unoTask]);

  // Auto-hide header in active stage after 5 seconds of inactivity
  useEffect(() => {
    if (stage !== 'active') {
      // Reset to show header when not in active stage
      setShowHeader(true);
      setShowTimerText(true);
      if (hideHeaderTimerRef.current) {
        clearTimeout(hideHeaderTimerRef.current);
      }
      return;
    }

    // Don't start hide timer during Bell animation or before countdown text is visible
    if (showBellAnimation || (countdownMode && !countdownTextVisible)) {
      setShowHeader(true);
      setShowTimerText(true);
      if (hideHeaderTimerRef.current) {
        clearTimeout(hideHeaderTimerRef.current);
      }
      return;
    }

    // Show header initially when entering active stage
    setShowHeader(true);
    setShowTimerText(true);

    const resetHideTimer = () => {
      // Show header and timer text on user interaction
      setShowHeader(true);
      setShowTimerText(true);

      // Clear existing timer
      if (hideHeaderTimerRef.current) {
        clearTimeout(hideHeaderTimerRef.current);
      }

      // Set new timer to hide after 5 seconds
      hideHeaderTimerRef.current = setTimeout(() => {
        setShowHeader(false);
        setShowTimerText(false);
      }, 5000);
    };

    // Start initial timer
    resetHideTimer();

    // Listen for user interactions
    const handleUserActivity = () => {
      resetHideTimer();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('touchmove', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('touchmove', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);

      if (hideHeaderTimerRef.current) {
        clearTimeout(hideHeaderTimerRef.current);
      }
    };
  }, [stage, showBellAnimation, countdownMode, countdownTextVisible]);

  // Countdown timer effect
  useEffect(() => {
    if (countdownMode && countdownRemaining > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownRemaining((prev) => {
          // Start exit bell at 2 seconds remaining
          if (prev === 2) {
            setIsExitingCountdown(true);
            fadeOutAmbientSound();
            playExitBell();
          }

          if (prev <= 1) {
            // Countdown finished - wait for exit bell to finish
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [countdownMode, countdownRemaining]);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (stage === 'active') {
      localStorage.setItem('unoday_active_tab', activeTab);
    }
  }, [activeTab, stage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  const enterFocusMode = (
    x?: number,
    y?: number,
    top?: number,
    left?: number,
    right?: number,
    bottom?: number
  ) => {
    setIsVisible(true);
    setStage('input');
    setUnoTask('');
    localStorage.setItem('unoday_focus_mode', 'true');

    // Use setTimeout to ensure state has updated before manipulating DOM
    setTimeout(() => {
      if (bgRef.current) {
        // If we have position data, do the animation
        if (
          x !== undefined &&
          y !== undefined &&
          top !== undefined &&
          left !== undefined &&
          right !== undefined &&
          bottom !== undefined
        ) {
          // Set CSS variables for clip-path animation
          bgRef.current.style.setProperty('--btn-top', `${top}px`);
          bgRef.current.style.setProperty('--btn-right', `${right}px`);
          bgRef.current.style.setProperty('--btn-bottom', `${bottom}px`);
          bgRef.current.style.setProperty('--btn-left', `${left}px`);
          bgRef.current.style.setProperty('--click-x', `${x}px`);
          bgRef.current.style.setProperty('--click-y', `${y}px`);

          // Start animation
          bgRef.current.classList.add('focus-enter-start');

          // Force reflow
          bgRef.current.getBoundingClientRect();

          // Trigger expansion
          bgRef.current.classList.add('focus-enter-active');
        } else {
          // No animation, just show (for persisted state)
          bgRef.current.classList.add('focus-persisted');
        }
      }
    }, 0);
  };

  const exitFocusMode = () => {
    setIsVisible(false);

    setTimeout(() => {
      if (bgRef.current) {
        bgRef.current.classList.remove('focus-enter-start', 'focus-enter-active', 'focus-persisted');
      }
      document.documentElement.classList.remove('focus-mode-active');
    }, 500);

    localStorage.removeItem('unoday_focus_mode');
    localStorage.removeItem('unoday_focus_stage');
    localStorage.removeItem('unoday_current_task');
    localStorage.removeItem('unoday_start_time');
    localStorage.removeItem('unoday_active_tab');
    localStorage.removeItem('unoday_countdown_mode');
    localStorage.removeItem('unoday_countdown_start_time');
    localStorage.removeItem('unoday_countdown_duration');
    localStorage.removeItem('unoday_selected_time');
    localStorage.removeItem('unoday_selected_sound');

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    stopAllAudio();

    // Reset to input stage
    setStage('input');
    setUnoTask('');
    setCountdownMode(false);
    setCountdownDuration(0);
    setCountdownRemaining(0);
    setSelectedTime(null);
    setSelectedSound(null);
    setShowBellAnimation(false);
  };

  const startActiveFocus = () => {
    setStage('active');
    const now = Date.now();
    setStartTime(now);
    localStorage.setItem('unoday_focus_stage', 'active');
    localStorage.setItem('unoday_current_task', unoTask);
    localStorage.setItem('unoday_start_time', now.toString());
  };

  const finishSession = (type: 'complete' | 'giveup') => {
    setResultType(type);
    setStage('result');

    // Remove task from distractions
    const newDistractions = distractions.filter((d) => d.text !== unoTask);
    setDistractions(newDistractions);
    localStorage.setItem('unoday_distractions', JSON.stringify(newDistractions));

    // Increment daily count
    const today = new Date().toDateString();
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    localStorage.setItem('unoday_daily_limit', JSON.stringify({ date: today, count: newCount }));

    // Save to history
    const endTime = Date.now();
    const duration = endTime - startTime;
    const historyItem: HistoryItem = {
      id: startTime,
      task: unoTask,
      status: type,
      duration,
      endTime,
      date: today,
    };

    const history: HistoryItem[] = JSON.parse(localStorage.getItem('unoday_history') || '[]');
    history.push(historyItem);
    localStorage.setItem('unoday_history', JSON.stringify(history));

    // Check and grant achievements only when task is completed (not given up)
    if (type === 'complete') {
      const currentStreak = calculateCurrentStreak(history);
      const newAchievements = checkAndGrantAchievements(currentStreak);

      // Log newly unlocked achievements (optional - can add UI notification later)
      if (newAchievements.length > 0) {
        console.log('🎉 New achievements unlocked:', newAchievements);
      }
    }
  };

  const resetSession = () => {
    setStage('input');
    setUnoTask('');
    setCountdownMode(false);
    setCountdownDuration(0);
    setCountdownRemaining(0);
    setSelectedTime(null);
    setSelectedSound(null);
    setCountdownTextVisible(false);
    setShowBellAnimation(false);
    setIsExitingCountdown(false);
    stopAllAudio();
    localStorage.removeItem('unoday_focus_stage');
    localStorage.removeItem('unoday_current_task');
    localStorage.removeItem('unoday_start_time');
    localStorage.removeItem('unoday_active_tab');
    localStorage.removeItem('unoday_countdown_mode');
    localStorage.removeItem('unoday_countdown_start_time');
    localStorage.removeItem('unoday_countdown_duration');
    localStorage.removeItem('unoday_selected_time');
    localStorage.removeItem('unoday_selected_sound');
  };

  const selectTime = (minutes: number) => {
    setSelectedTime(minutes);
    localStorage.setItem('unoday_selected_time', minutes.toString());
  };

  const selectSound = (soundId: AmbientSound) => {
    const newSound = selectedSound === soundId ? null : soundId;
    setSelectedSound(newSound);
    if (newSound) {
      localStorage.setItem('unoday_selected_sound', newSound);

      // Stop any previous preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current = null;
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      if (previewFadeIntervalRef.current) {
        clearInterval(previewFadeIntervalRef.current);
        previewFadeIntervalRef.current = null;
      }

      // Play preview for 5 seconds with 1s fade-out at the end
      const sound = AMBIENT_SOUNDS.find(s => s.id === newSound);
      if (sound) {
        const audio = new Audio(sound.file);
        audio.volume = 0.7;
        previewAudioRef.current = audio;

        audio.play().catch(err => {
          console.error('Preview audio failed:', err);
        });

        const PREVIEW_DURATION_MS = 5000;
        const FADE_OUT_MS = 1000;
        const FADE_STEPS = 10;
        const STEP_MS = FADE_OUT_MS / FADE_STEPS;
        const initialVolume = audio.volume;

        // Schedule fade-out starting at t = 4s
        previewTimeoutRef.current = setTimeout(() => {
          let step = 0;
          previewFadeIntervalRef.current = setInterval(() => {
            step += 1;
            const factor = Math.max(0, 1 - step / FADE_STEPS);
            if (previewAudioRef.current) {
              previewAudioRef.current.volume = Math.max(0, Math.min(1, initialVolume * factor));
            }
            if (step >= FADE_STEPS) {
              if (previewFadeIntervalRef.current) {
                clearInterval(previewFadeIntervalRef.current);
                previewFadeIntervalRef.current = null;
              }
              if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.currentTime = 0;
                previewAudioRef.current = null;
              }
            }
          }, STEP_MS);
        }, PREVIEW_DURATION_MS - FADE_OUT_MS);
      }
    } else {
      localStorage.removeItem('unoday_selected_sound');

      // Stop preview if deselecting
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current = null;
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      if (previewFadeIntervalRef.current) {
        clearInterval(previewFadeIntervalRef.current);
        previewFadeIntervalRef.current = null;
      }
    }
  };

  const startCountdownWithBell = () => {
    // Stop any preview audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    // Show bell animation
    setShowBellAnimation(true);
    setCountdownTextVisible(false);

    // Play entrance bell
    playEntranceBell(() => {
      // After bell finishes, hide animation and start countdown
      setShowBellAnimation(false);
      const seconds = selectedTime! * 60;
      setCountdownDuration(seconds);
      setCountdownRemaining(seconds);
      setCountdownMode(true);

      // Save countdown state to localStorage
      const startTime = Date.now();
      localStorage.setItem('unoday_countdown_mode', 'true');
      localStorage.setItem('unoday_countdown_start_time', startTime.toString());
      localStorage.setItem('unoday_countdown_duration', seconds.toString());
      if (selectedSound) {
        localStorage.setItem('unoday_selected_sound', selectedSound);
      }

      // Start fade-in animation for countdown text
      // Wait a brief moment, then trigger fade-in
      setTimeout(() => {
        setCountdownTextVisible(true);
      }, 100);

      // Start ambient sound if selected
      if (selectedSound) {
        playAmbientSound(selectedSound);
      }
    });
  };

  const exitCountdown = () => {
    setCountdownMode(false);
    setCountdownDuration(0);
    setCountdownRemaining(0);
    setSelectedTime(null);
    setSelectedSound(null);
    setCountdownTextVisible(false);
    setIsExitingCountdown(false);
    stopAllAudio();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Clear countdown state from localStorage
    localStorage.removeItem('unoday_countdown_mode');
    localStorage.removeItem('unoday_countdown_start_time');
    localStorage.removeItem('unoday_countdown_duration');
    localStorage.removeItem('unoday_selected_time');
    localStorage.removeItem('unoday_selected_sound');
  };

  const stopAllAudio = () => {
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current = null;
    }
    if (bellAudioRef.current) {
      bellAudioRef.current.pause();
      bellAudioRef.current = null;
    }
  };

  const fadeOutAmbientSound = () => {
    // Clear any existing fade out
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }

    const fadeSteps = 20; // 20 steps
    const fadeInterval = 100; // 100ms per step = 2 seconds total
    let currentStep = 0;

    // Store initial volumes
    const initialAmbientVolume = ambientAudioRef.current?.volume || 0;
    const initialNextVolume = nextAudioRef.current?.volume || 0;

    fadeOutIntervalRef.current = setInterval(() => {
      currentStep++;
      const volumeMultiplier = Math.max(0, 1 - (currentStep / fadeSteps));

      if (ambientAudioRef.current) {
        ambientAudioRef.current.volume = Math.max(0, Math.min(1, initialAmbientVolume * volumeMultiplier));
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.volume = Math.max(0, Math.min(1, initialNextVolume * volumeMultiplier));
      }

      if (currentStep >= fadeSteps) {
        // Fade complete, stop audio
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        if (ambientAudioRef.current) {
          ambientAudioRef.current.pause();
          ambientAudioRef.current = null;
        }
        if (nextAudioRef.current) {
          nextAudioRef.current.pause();
          nextAudioRef.current = null;
        }
      }
    }, fadeInterval);
  };

  const playEntranceBell = (onEnded: () => void) => {
    const audio = new Audio('/audio/Entrance Bell1.wav');
    bellAudioRef.current = audio;
    audio.volume = 0.7;
    audio.onended = onEnded;
    audio.play().catch(err => console.error('Error playing entrance bell:', err));
  };

  const playExitBell = () => {
    const audio = new Audio('/audio/Entrance Bell2.wav');
    bellAudioRef.current = audio;
    audio.volume = 0.7;
    audio.onended = () => {
      // After exit bell finishes, return to selection
      setShowBellAnimation(false);
      setIsExitingCountdown(false);
      setCountdownMode(false);
      setSelectedTime(null);
      setSelectedSound(null);

      // Clear countdown state from localStorage
      localStorage.removeItem('unoday_countdown_mode');
      localStorage.removeItem('unoday_countdown_start_time');
      localStorage.removeItem('unoday_countdown_duration');
      localStorage.removeItem('unoday_selected_time');
      localStorage.removeItem('unoday_selected_sound');
    };
    audio.play().catch(err => console.error('Error playing exit bell:', err));
  };

  const playAmbientSound = (soundId: AmbientSound): Promise<void> => {
    if (!soundId) return Promise.resolve();

    if (soundId === 'downpour') {
      currentDownpourIndexRef.current = 1;
      return playDownpourSequence(1);
    } else {
      const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
      if (!sound) return Promise.resolve();

      const audio = new Audio(sound.file);
      ambientAudioRef.current = audio;
      audio.volume = 0.5;
      audio.preload = 'auto';


      const setupAudioHandlers = (currentAudio: HTMLAudioElement) => {
        let lastLoggedProgress = -1;
        let crossfadeStarted = false;
        let nextAudioPrepared = false;
        const targetVolume = 0.5;
        const crossfadeDuration = 2; // 2 seconds crossfade

        currentAudio.ontimeupdate = () => {
          if (!currentAudio.duration) return;

          // track progress milestones internally
          const progress = Math.floor((currentAudio.currentTime / currentAudio.duration) * 100);
          const progressMilestone = Math.floor(progress / 10) * 10;
          if (progressMilestone !== lastLoggedProgress && progressMilestone % 10 === 0 && progressMilestone <= 100) {
            lastLoggedProgress = progressMilestone;
          }

          const timeRemaining = currentAudio.duration - currentAudio.currentTime;

          // Prepare next audio when halfway through current track
          if (!nextAudioPrepared && currentAudio.currentTime > currentAudio.duration / 2) {
            const nextAudio = new Audio(sound.file);
            nextAudio.volume = 0; // Start at 0 for fade-in
            nextAudio.preload = 'auto';
            nextAudio.load();
            nextAudioRef.current = nextAudio;
            nextAudioPrepared = true;
          }

          // Start crossfade 2 seconds before end
          if (timeRemaining <= crossfadeDuration && nextAudioRef.current && !crossfadeStarted) {
            nextAudioRef.current.play()
              .then(() => {
                // Setup handlers for the next audio
                setupAudioHandlers(nextAudioRef.current!);
              })
              .catch(err => console.error('[Crossfade Error]', err));

            crossfadeStarted = true;
          }

          // Apply crossfade volume curve during last 2 seconds
          if (crossfadeStarted && timeRemaining <= crossfadeDuration) {
            const fadeProgress = 1 - (timeRemaining / crossfadeDuration); // 0 to 1

            // Equal power crossfade using sine/cosine curves
            const fadeOutVolume = Math.cos(fadeProgress * Math.PI / 2); // 1 -> 0
            const fadeInVolume = Math.sin(fadeProgress * Math.PI / 2);  // 0 -> 1

            // Fade out current audio
            currentAudio.volume = targetVolume * fadeOutVolume;

            // Fade in next audio
            if (nextAudioRef.current) {
              nextAudioRef.current.volume = targetVolume * fadeInVolume;
            }
          }
        };

        currentAudio.onended = () => {
          // Swap to the next audio
          if (nextAudioRef.current) {
            nextAudioRef.current.volume = targetVolume;
            ambientAudioRef.current = nextAudioRef.current;
            nextAudioRef.current = null;
          }
        };
      };

      setupAudioHandlers(audio);

      return audio.play().then(() => {});
    }
  };

  const playDownpourSequence = (index: number): Promise<void> => {
    if (index > 8) index = 1; // Loop back to 1

    const audio = new Audio(`/audio/Downpour0${index}.wav`);
    ambientAudioRef.current = audio;
    audio.volume = 0.5;
    audio.preload = 'auto';

    console.log(`[Play] Starting Downpour0${index}`);

    const setupAudioHandlers = (currentAudio: HTMLAudioElement, currentIndex: number) => {
      let lastLoggedProgress = -1;
      let crossfadeStarted = false;
      let nextAudioPrepared = false;
      const targetVolume = 0.5;
      const crossfadeDuration = 2; // 2 seconds crossfade

      currentAudio.ontimeupdate = () => {
        if (!currentAudio.duration) return;

        // Log progress at 10% intervals
        const progress = Math.floor((currentAudio.currentTime / currentAudio.duration) * 100);
        const progressMilestone = Math.floor(progress / 10) * 10;
        if (progressMilestone !== lastLoggedProgress && progressMilestone % 10 === 0 && progressMilestone <= 100) {
          console.log(`Downpour0${currentIndex}: ${progressMilestone}%`);
          lastLoggedProgress = progressMilestone;
        }

        const timeRemaining = currentAudio.duration - currentAudio.currentTime;

        // Prepare next audio when halfway through current track
        if (!nextAudioPrepared && currentAudio.currentTime > currentAudio.duration / 2) {
          const nextIndex = currentIndex >= 8 ? 1 : currentIndex + 1;
          console.log(`[Prepare] Preloading Downpour0${nextIndex}`);

          const nextAudio = new Audio(`/audio/Downpour0${nextIndex}.wav`);
          nextAudio.volume = 0; // Start at 0 for fade-in
          nextAudio.preload = 'auto';
          nextAudio.load();
          nextAudioRef.current = nextAudio;
          nextAudioPrepared = true;

          currentDownpourIndexRef.current = nextIndex;
        }

        // Start crossfade 2 seconds before end
        if (timeRemaining <= crossfadeDuration && nextAudioRef.current && !crossfadeStarted) {
          console.log(`[Crossfade] Downpour0${currentIndex} -> Downpour0${currentDownpourIndexRef.current}`);

          nextAudioRef.current.play()
            .then(() => {
              // Setup handlers for the next audio
              setupAudioHandlers(nextAudioRef.current!, currentDownpourIndexRef.current);
            })
            .catch(err => console.error('[Crossfade Error]', err));

          crossfadeStarted = true;
        }

        // Apply crossfade volume curve during last 2 seconds
        if (crossfadeStarted && timeRemaining <= crossfadeDuration) {
          const fadeProgress = 1 - (timeRemaining / crossfadeDuration); // 0 to 1

          // Equal power crossfade using sine/cosine curves
          // This maintains constant perceived loudness during crossfade
          const fadeOutVolume = Math.cos(fadeProgress * Math.PI / 2); // 1 -> 0
          const fadeInVolume = Math.sin(fadeProgress * Math.PI / 2);  // 0 -> 1

          // Fade out current audio
          currentAudio.volume = targetVolume * fadeOutVolume;

          // Fade in next audio
          if (nextAudioRef.current) {
            nextAudioRef.current.volume = targetVolume * fadeInVolume;
          }
        }
      };

      currentAudio.onended = () => {
        console.log(`[Ended] Downpour0${currentIndex}`);

        // Swap to the next audio
        if (nextAudioRef.current) {
          nextAudioRef.current.volume = targetVolume;
          ambientAudioRef.current = nextAudioRef.current;
          nextAudioRef.current = null;
        }
      };
    };

    setupAudioHandlers(audio, index);

    return audio.play()
      .then(() => console.log(`Downpour0${index} playing`));
  };

  const formatCountdown = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addDistraction = (text: string) => {
    const newDistraction: Distraction = {
      id: Date.now(),
      text,
    };
    const newDistractions = [...distractions, newDistraction];
    setDistractions(newDistractions);
    localStorage.setItem('unoday_distractions', JSON.stringify(newDistractions));
    setDrawerOpen(false);
  };

  const deleteDistraction = (id: number) => {
    const newDistractions = distractions.filter((d) => d.id !== id);
    setDistractions(newDistractions);
    localStorage.setItem('unoday_distractions', JSON.stringify(newDistractions));
  };

  const reorderDistractions = (newDistractions: Distraction[]) => {
    setDistractions(newDistractions);
    localStorage.setItem('unoday_distractions', JSON.stringify(newDistractions));
  };

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, action: () => void) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const borderPath = btn.querySelector('path') as SVGPathElement;

    if (borderPath) {
      const rect = btn.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const r = h / 2;

      const d = `M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${r} Z`;
      borderPath.setAttribute('d', d);

      borderPath.classList.remove('opacity-0');
      void borderPath.getBBox();

      borderPath.classList.add('transition-all', 'duration-[5000ms]', 'ease-linear');
      borderPath.style.strokeDashoffset = '0';
    }

    pressTimerRef.current = setTimeout(() => {
      action();
      resetButtonAnimation(btn);
    }, LONG_PRESS_DURATION);
  };

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
    resetButtonAnimation(e.currentTarget as HTMLButtonElement);
  };

  const resetButtonAnimation = (btn: HTMLButtonElement) => {
    const borderPath = btn.querySelector('path') as SVGPathElement;
    if (borderPath) {
      borderPath.classList.remove('transition-all', 'duration-[5000ms]', 'ease-linear');
      void borderPath.getBBox();
      borderPath.style.strokeDashoffset = '1';
      borderPath.classList.add('opacity-0');
    }
  };

  // Don't render until hydrated to prevent flash
  if (!isHydrated) {
    return null;
  }

  return (
    <div
      id="focus-overlay"
      ref={overlayRef}
      className={`fixed inset-0 z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div id="focus-bg" ref={bgRef} className="absolute inset-0 bg-black"></div>

      <div
        id="focus-content"
        className={`relative z-10 flex h-full w-full flex-col items-center transition-opacity duration-1000 delay-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Stage 1: Input */}
        {stage === 'input' && (
          <>
            <button
              onClick={exitFocusMode}
              className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="flex flex-col items-center w-full max-w-4xl px-4 pt-[30vh]">
              {dailyCount >= DAILY_UNO_LIMIT ? (
                /* Daily limit reached - show completion message */
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="font-serif text-3xl md:text-4xl font-light text-white text-center">{t('focus-limit-reached')}</h2>
                </div>
              ) : (
                /* Normal input flow */
                <>
                  <h2 className="font-serif text-3xl md:text-4xl font-light text-white mb-12 text-center">{t('focus-prompt')}</h2>

                  <input
                    type="text"
                    value={unoTask}
                    onChange={(e) => setUnoTask(e.target.value)}
                    maxLength={20}
                    className="w-full bg-transparent border-0 border-b border-white/20 text-center text-5xl md:text-6xl text-white placeholder-white/10 focus:outline-none focus:ring-0 focus:border-white/50 pb-4 mb-4 transition-colors"
                    placeholder="..."
                    autoComplete="off"
                  />

                  <p className="text-white/30 text-sm mb-8">
                    {dailyCount}/{DAILY_UNO_LIMIT} Unos completed today
                    {unoTask.length > 0 && (
                      <span className={`ml-4 transition-opacity ${unoTask.length >= 18 ? 'opacity-100' : 'opacity-0'}`}>
                        {unoTask.length}/20
                      </span>
                    )}
                  </p>

                  {/* Toggle Distractions Button */}
                  {distractions.length > 0 && (
                    <button
                      onClick={() => setShowDistractions(!showDistractions)}
                      className="mb-4 text-white/40 hover:text-white/60 transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${showDistractions ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      <span>
                        {showDistractions ? t('distraction-collapse') : t('distraction-expand')} ({distractions.length})
                      </span>
                    </button>
                  )}

                  {/* Distraction Pills */}
                  {showDistractions && (
                    <div className="flex flex-wrap justify-center gap-3 mb-12 min-h-[40px] animate-fade-in">
                      {distractions.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setUnoTask(d.text)}
                          className={`px-6 py-3 rounded-full text-2xl transition-all ${
                            unoTask === d.text ? 'bg-white/20 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {d.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Start Button */}
                  {showStartButton && (
                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 group">
                      <button
                        onMouseDown={(e) => handleLongPressStart(e, startActiveFocus)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={(e) => handleLongPressStart(e, startActiveFocus)}
                        onTouchEnd={handleLongPressEnd}
                        className="relative px-8 py-3 text-white"
                      >
                        <span className="relative z-10 uppercase tracking-widest text-sm font-bold">{t('focus-start')}</span>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                          <path className="fill-none stroke-white stroke-[2] opacity-0" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} pathLength={1} />
                        </svg>
                      </button>
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {t('focus-long-press')}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Fullscreen Hint */}
              <div className={`fixed bottom-8 left-8 text-white/40 text-xs transition-all duration-500 ${
                showFullscreenHint ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                {t('fullscreen-hint')}
              </div>
            </div>
          </>
        )}

        {/* Stage 2: Active Focus */}
        {stage === 'active' && (
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            {/* Tabs - Absolute positioned at top - Hidden during Bell animation */}
            <div className={`absolute top-20 left-1/2 -translate-x-1/2 flex gap-8 transition-opacity duration-500 ${
              showBellAnimation ? 'opacity-0 pointer-events-none' : (showHeader ? 'opacity-100' : 'opacity-0')
            }`}>
              <button
                onClick={() => setActiveTab('uno')}
                className={`text-lg font-medium pb-1 transition-colors ${
                  activeTab === 'uno' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {t('focus-tab-uno')}
              </button>
              <button
                onClick={() => setActiveTab('timer')}
                className={`text-lg font-medium pb-1 transition-colors ${
                  activeTab === 'timer' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {t('focus-tab-timer')}
              </button>
            </div>

            {/* Tab Content - Centered in viewport */}
            <div className="flex flex-col items-center justify-center w-full px-4">
              {activeTab === 'uno' ? (
                <div className="flex flex-col items-center">
                  <div className={`${oswald.className} ${showTimerText ? 'text-white' : 'text-white/30'} transition-opacity transition-colors duration-500 text-center`}
                    style={{ fontSize: '160px', letterSpacing: '0.05em' }}
                  >
                    {unoTask}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {showBellAnimation ? (
                    // Bell Animation
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-pulse">
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M60 20C50 20 45 30 45 40V55C45 60 40 65 35 70C32 73 30 76 30 80C30 85 33 90 40 90H80C87 90 90 85 90 80C90 76 88 73 85 70C80 65 75 60 75 55V40C75 30 70 20 60 20Z" fill="white" fillOpacity="0.8"/>
                          <path d="M52 95C52 100 56 105 60 105C64 105 68 100 68 95" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                          <circle cx="60" cy="15" r="3" fill="white"/>
                        </svg>
                      </div>
                    </div>
                  ) : !countdownMode && !selectedTime ? (
                    // Time selection mode
                    <div className="flex flex-col items-center gap-8">
                      <p className="text-white/50 text-lg font-light">{t('timer-countdown-hint')}</p>
                      <div className="flex flex-wrap justify-center gap-6">
                        {[3, 15, 30, 60].map((minutes) => (
                          <button
                            key={minutes}
                            onClick={() => selectTime(minutes)}
                            className="px-12 py-6 rounded-full text-3xl text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/20 hover:border-white/50"
                          >
                            {minutes}m
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : !countdownMode && selectedTime ? (
                    // Sound selection and start button
                    <div className="flex flex-col items-center gap-10">
                      <div className="text-white/30 text-lg">{t('timer-selected')} {selectedTime} {t('timer-minutes')}</div>

                      {/* Ambient Sound Selection */}
                      <div className="flex flex-col items-center gap-6">
                        <p className="text-white/50 text-base font-light">{t('timer-sound-hint')}</p>
                        <div className="grid grid-cols-4 gap-6">
                          {AMBIENT_SOUNDS.map((sound) => (
                            <button
                              key={sound.id}
                              onClick={() => selectSound(sound.id)}
                              className={`px-12 py-6 rounded-full transition-all border flex flex-col items-center justify-center gap-3 ${
                                selectedSound === sound.id
                                  ? 'bg-white/20 text-white border-white/50'
                                  : 'text-white/50 border-white/20 hover:text-white hover:border-white/50 hover:bg-white/10'
                              }`}
                            >
                              <div className="opacity-80">
                                {sound.icon}
                              </div>
                              <span className="text-sm">{t(sound.labelKey)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Start and Back buttons */}
                      <div className="flex gap-6">
                        <button
                          onClick={() => setSelectedTime(null)}
                          className="px-8 py-3 rounded-full border border-white/20 text-white/50 hover:text-white hover:border-white/50 transition-all text-sm uppercase tracking-widest"
                        >
                          {t('timer-back')}
                        </button>
                        <button
                          onClick={startCountdownWithBell}
                          className="px-10 py-3 rounded-full bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all text-sm uppercase tracking-widest font-bold"
                        >
                          {t('timer-start')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Countdown mode
                    <div className="flex flex-col items-center gap-12">
                      {countdownRemaining === 0 ? (
                        // Bell Animation when countdown ends
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-pulse">
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M60 20C50 20 45 30 45 40V55C45 60 40 65 35 70C32 73 30 76 30 80C30 85 33 90 40 90H80C87 90 90 85 90 80C90 76 88 73 85 70C80 65 75 60 75 55V40C75 30 70 20 60 20Z" fill="white" fillOpacity="0.8"/>
                              <path d="M52 95C52 100 56 105 60 105C64 105 68 100 68 95" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                              <circle cx="60" cy="15" r="3" fill="white"/>
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className={`${oswald.className} transition-opacity transition-colors duration-1000 ${
                          countdownTextVisible ? 'opacity-100' : 'opacity-0'
                        } ${(isExitingCountdown || countdownRemaining <= 3 || showTimerText) ? 'text-white' : 'text-white/30'}`}
                          style={{ fontSize: '196px', letterSpacing: '0.05em' }}
                        >
                          {formatCountdown(countdownRemaining)}
                        </div>
                      )}

                      {/* Audio resume prompt */}
                      {showAudioResumePrompt && (
                        <button
                          className="px-8 py-4 rounded-full bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all text-sm uppercase tracking-widest animate-pulse"
                        >
                          {t('timer-resume-audio')}
                        </button>
                      )}

                      <button
                        onClick={exitCountdown}
                        className={`px-8 py-3 rounded-full border border-white/20 hover:border-white/50 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-500 text-sm uppercase tracking-widest ${showHeader ? 'opacity-100' : 'opacity-0'}`}
                      >
                        {t('timer-exit')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions - Only show in Uno tab */}
            {activeTab === 'uno' && (
              <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[20vh] flex items-end justify-center pb-12 transition-opacity duration-500 z-50 ${showHeader ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex gap-12">
                  <button
                    onMouseDown={(e) => handleLongPressStart(e, () => finishSession('giveup'))}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => handleLongPressStart(e, () => finishSession('giveup'))}
                    onTouchEnd={handleLongPressEnd}
                    className="relative px-6 py-2 text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest group"
                  >
                    <span className="relative z-10">{t('focus-give-up')}</span>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                      <path className="fill-none stroke-white stroke-[2] opacity-0" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} pathLength={1} />
                    </svg>
                  </button>
                  <button
                    onMouseDown={(e) => handleLongPressStart(e, () => finishSession('complete'))}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => handleLongPressStart(e, () => finishSession('complete'))}
                    onTouchEnd={handleLongPressEnd}
                    className="relative px-6 py-2 text-white hover:text-white transition-colors text-sm uppercase tracking-widest font-bold group"
                  >
                    <span className="relative z-10">{t('focus-complete')}</span>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                      <path className="fill-none stroke-white stroke-[2] opacity-0" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} pathLength={1} />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 3: Result */}
        {stage === 'result' && (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {resultType === 'complete' ? (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <div className="text-white text-4xl font-serif z-10 animate-fade-in-up">{t('result-complete')}</div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center animate-fade-in mt-[-10vh]">
                <div className="text-white/50 text-6xl mb-8">...</div>
                <h3 className="text-white text-2xl font-serif mb-4">{t('result-giveup-title')}</h3>
                <p className="text-white/50 mb-12">{t('result-giveup-text')}</p>
              </div>
            )}

            <div className="absolute bottom-20 flex gap-8 z-20 opacity-0 animate-fade-in" style={{ animationDelay: '2s', animationFillMode: 'forwards' }}>
              {/* Only show Next/Retry button if daily limit not reached */}
              {dailyCount < DAILY_UNO_LIMIT && (
                <button
                  onClick={resetSession}
                  className="text-white border border-white/30 rounded-full px-8 py-3 hover:bg-white/10 transition-colors"
                >
                  {resultType === 'complete' ? t('result-next') : t('result-retry')}
                </button>
              )}
              <button onClick={exitFocusMode} className="text-white/50 hover:text-white transition-colors">
                {t('result-exit')}
              </button>
            </div>
          </div>
        )}

        {/* Distraction Toggle */}
        <div
          ref={toggleRef}
          className={`absolute top-0 right-0 p-8 z-50 transition-opacity duration-300 ${
            stage === 'active' ? 'opacity-0 hover:opacity-100' : ''
          }`}
        >
          <button onClick={() => setDrawerOpen(!drawerOpen)} className="text-white/50 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Distraction Drawer */}
      <DistractionDrawer
        ref={drawerRef}
        open={drawerOpen}
        distractions={distractions}
        onClose={() => setDrawerOpen(false)}
        onAdd={addDistraction}
        onDelete={deleteDistraction}
        onReorder={reorderDistractions}
        isPlatformMac={isPlatformMac}
      />
    </div>
  );
}
