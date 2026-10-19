'use client';

import { useEffect, useRef } from 'react';

interface SwipeOptions {
  onClose: () => void;
  defaultHeightStr: string; // e.g. '85dvh' or '60dvh'
}

export function useMobileSwipe({ onClose, defaultHeightStr }: SwipeOptions) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    const handle = handleRef.current;
    if (!drawer || !handle) return;

    let startY = 0;
    let currentY = 0;
    let lastY = 0;
    let lastTimestamp = 0;
    let velocityY = 0;
    let isDragging = false;
    let state: 'default' | 'full' = 'default';

    // ── Fix #1: Set initial height synchronously before first paint ──
    // We apply the default height immediately (no setTimeout) so the drawer
    // never flashes at full screen. The CSS entry animation still runs because
    // Tailwind's animate-in class handles the visual intro; we're just ensuring
    // the height is correct from frame 0.
    const initHeight = () => {
      if (window.innerWidth >= 768) return;
      drawer.style.height = defaultHeightStr;
      drawer.style.maxHeight = 'none';
      drawer.style.transform = 'translateY(0px)';
    };
    initHeight();

    // ── Easing helpers ──
    // A smooth spring-like easing that feels physical yet snappy.
    const EASE_IN_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';

    const setTransition = (enabled: boolean, durationMs = 320) => {
      drawer.style.transition = enabled
        ? `transform ${durationMs}ms ${EASE_IN_OUT}, height ${durationMs}ms ${EASE_IN_OUT}`
        : 'none';
    };

    const updateHeight = (animate = false) => {
      if (window.innerWidth >= 768) {
        drawer.style.height = '';
        drawer.style.transform = '';
        drawer.style.maxHeight = '';
        drawer.style.transition = '';
        return;
      }

      drawer.style.maxHeight = 'none';

      if (animate) setTransition(true);

      if (state === 'default') {
        drawer.style.height = defaultHeightStr;
        drawer.style.transform = 'translateY(0px)';
      } else {
        drawer.style.height = '100dvh';
        drawer.style.transform = 'translateY(0px)';
      }
    };

    // ── Fix #4: Smooth close animation ──
    // Instead of immediately calling onClose (which causes the component to
    // unmount abruptly), we animate the drawer sliding off-screen and *then*
    // call onClose after the animation completes.
    const animateClose = () => {
      if (window.innerWidth >= 768) {
        onClose();
        return;
      }
      drawer.style.animation = 'none';
      void drawer.offsetHeight; // force reflow

      // Slide fully off screen
      setTransition(true, 280);
      drawer.style.transform = `translateY(100%)`;
      
      if (backdropRef.current) {
        backdropRef.current.style.animation = 'none';
        void backdropRef.current.offsetHeight;
        backdropRef.current.style.transition = 'opacity 280ms ease-out';
        backdropRef.current.style.opacity = '0';
      }

      // Call parent close after animation
      const t = setTimeout(() => {
        onClose();
      }, 290);
      return t;
    };

    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const onTouchStart = (e: TouchEvent | MouseEvent) => {
      if (window.innerWidth >= 768) return;
      // Cancel any in-progress close animation so re-opens don't glitch
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      lastY = startY;
      lastTimestamp = performance.now();
      velocityY = 0;
      currentY = 0;
      // Disable transition while finger is down for direct 1:1 tracking
      setTransition(false);
    };

    const onTouchMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const now = performance.now();
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      currentY = y - startY;

      // ── Fix #2 & #3: Track velocity and apply 1:1 tracking ──
      const dt = now - lastTimestamp;
      if (dt > 0) {
        // Exponential moving average for smooth velocity
        velocityY = velocityY * 0.6 + ((y - lastY) / dt) * 0.4;
      }
      lastY = y;
      lastTimestamp = now;

      if (state === 'default') {
        if (currentY < 0) {
          // Swiping up → expand: rubber-band resistance above natural height
          const expand = -currentY;
          drawer.style.height = `calc(${defaultHeightStr} + ${expand}px)`;
          drawer.style.transform = 'translateY(0px)';
        } else {
          // ── Fix #3: Downward swipe follows finger exactly ──
          drawer.style.transform = `translateY(${currentY}px)`;
          // Keep height at default so it doesn't shrink while sliding
          drawer.style.height = defaultHeightStr;
        }
      } else if (state === 'full') {
        if (currentY > 0) {
          // Swiping down from full → shrink
          drawer.style.height = `calc(100dvh - ${currentY}px)`;
          drawer.style.transform = 'translateY(0px)';
        } else {
          // Swiping up from full → gentle rubber-band
          drawer.style.transform = `translateY(${currentY * 0.15}px)`;
        }
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      // ── Fix #2: Lower threshold + velocity-based detection ──
      // Use a smaller distance threshold (40px) and also check velocity.
      // A fast flick (> 0.4 px/ms) triggers the gesture even with short travel.
      const DISTANCE_THRESHOLD = 40; // px  (was 60)
      const VELOCITY_THRESHOLD = 0.4; // px/ms

      const isFastSwipeDown = velocityY > VELOCITY_THRESHOLD;
      const isFastSwipeUp = velocityY < -VELOCITY_THRESHOLD;

      if (state === 'default') {
        if (currentY < -DISTANCE_THRESHOLD || isFastSwipeUp) {
          // Expand to full
          state = 'full';
          updateHeight(true);
        } else if (currentY > DISTANCE_THRESHOLD || isFastSwipeDown) {
          // ── Fix #3 & #4: Smooth close via animation ──
          closeTimer = animateClose() ?? null;
          return;
        } else {
          // Snap back to default position with a smooth spring
          updateHeight(true);
        }
      } else if (state === 'full') {
        if (currentY > DISTANCE_THRESHOLD || isFastSwipeDown) {
          state = 'default';
          updateHeight(true);
        } else {
          updateHeight(true);
        }
      }
    };

    const options = { passive: false };

    handle.addEventListener('touchstart', onTouchStart, options);
    handle.addEventListener('touchmove', onTouchMove, options);
    handle.addEventListener('touchend', onTouchEnd);
    handle.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);
    window.addEventListener('resize', () => updateHeight(false));

    return () => {
      if (closeTimer) clearTimeout(closeTimer);
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove', onTouchMove);
      handle.removeEventListener('touchend', onTouchEnd);
      handle.removeEventListener('mousedown', onTouchStart);
      window.removeEventListener('mousemove', onTouchMove);
      window.removeEventListener('mouseup', onTouchEnd);
      window.removeEventListener('resize', () => updateHeight(false));

      // Cleanup styles
      drawer.style.transition = '';
      drawer.style.height = '';
      drawer.style.transform = '';
      drawer.style.maxHeight = '';
    };
  }, [onClose, defaultHeightStr]);

  // Expose the close animation so components can use it for close buttons/backdrop clicks
  const closeDrawer = () => {
    if (window.innerWidth >= 768) {
      onClose();
      return;
    }
    const drawer = drawerRef.current;
    if (!drawer) {
      onClose();
      return;
    }
    
    drawer.style.animation = 'none';
    void drawer.offsetHeight;

    drawer.style.transition = `transform 280ms cubic-bezier(0.32, 0.72, 0, 1), height 280ms cubic-bezier(0.32, 0.72, 0, 1)`;
    drawer.style.transform = `translateY(100%)`;
    
    if (backdropRef.current) {
      backdropRef.current.style.animation = 'none';
      void backdropRef.current.offsetHeight;
      backdropRef.current.style.transition = 'opacity 280ms ease-out';
      backdropRef.current.style.opacity = '0';
    }

    setTimeout(() => {
      onClose();
    }, 290);
  };

  return { drawerRef, handleRef, backdropRef, closeDrawer };
}
