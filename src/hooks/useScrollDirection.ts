/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useScrollDirection.ts
 * Drop into: src/hooks/useScrollDirection.ts
 *
 * Returns the current scroll direction and whether the page is at the top.
 * Uses a passive scroll listener + rAF for zero-jank performance.
 * Suppresses micro-jitter with a configurable pixel threshold.
 */

import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down';

export interface UseScrollDirectionReturn {
  /** Current scroll direction — always "up" when isAtTop is true. */
  scrollDir: ScrollDirection;
  /** True when window.scrollY is at or below 0 (top of page). */
  isAtTop: boolean;
}

/** Minimum pixel delta required to register a direction change.
 *  Keeps the header from flickering on momentum-scroll deceleration. */
const JITTER_THRESHOLD_PX = 8;

export function useScrollDirection(): UseScrollDirectionReturn {
  const [scrollDir, setScrollDir] = useState<ScrollDirection>('up');
  const [isAtTop, setIsAtTop] = useState<boolean>(true);

  // Refs avoid including stale closures in the event listener
  const prevScrollY = useRef<number>(
    typeof window !== 'undefined' ? window.scrollY : 0
  );
  const rafPending = useRef<boolean>(false);

  useEffect(() => {
    // Sync to true current position on mount (avoids a wrong initial state
    // if the page is restored mid-scroll by the browser)
    prevScrollY.current = window.scrollY;
    setIsAtTop(window.scrollY <= 0);

    const handleScroll = (): void => {
      // Guard: skip if an rAF is already queued (coalesces rapid events)
      if (rafPending.current) return;
      rafPending.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - prevScrollY.current;

        // isAtTop updates on every frame — always accurate
        setIsAtTop(currentY <= 0);

        // Direction only updates when movement exceeds the jitter threshold
        if (Math.abs(delta) >= JITTER_THRESHOLD_PX) {
          setScrollDir(delta > 0 ? 'down' : 'up');
          prevScrollY.current = currentY;
        }

        rafPending.current = false;
      });
    };

    // { passive: true } tells the browser we will never call preventDefault(),
    // which allows it to optimise scroll handling on the main thread.
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // no deps — effect is mount/unmount only

  return { scrollDir, isAtTop };
}