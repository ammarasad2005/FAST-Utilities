'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Library,
  MapPin,
  Users,
  FileText,
  Sliders,
  Clock,
  Plus
} from 'lucide-react';
import { useTheme } from '@/lib/theme';

const R = 250;
const VISIBLE_START = 185;
const VISIBLE_END = 260;
const SPACING = 25;
const rad = (d: number) => (d * Math.PI) / 180;

type MenuItem = {
  id: string;
  path: string;
  label: string;
  color: string;
  icon: JSX.Element;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'home',      path: '/home',              label: 'Home',      color: '#4f46e5',         icon: <Home size={22} /> },
  { id: 'schedule',  path: '/timetable/custom',   label: 'Schedule',  color: 'var(--accent-cs)', icon: <Library size={22} /> },
  { id: 'rooms',     path: '/rooms',             label: 'Rooms',     color: 'var(--accent-ds)', icon: <MapPin size={22} /> },
  { id: 'faculty',   path: '/faculty',           label: 'Faculty',   color: 'var(--accent-se)', icon: <Users size={22} /> },
  { id: 'optimizer', path: '/timetable/optimizer', label: 'Optimizer', color: 'var(--accent-cy)', icon: <Sliders size={22} /> },
  { id: 'exams',     path: '/home?feature=exams', label: 'Exams',     color: 'var(--accent-ee)', icon: <FileText size={22} /> },
  { id: 'semester',  path: '/semester',          label: 'Semester',  color: 'var(--accent-af)', icon: <Clock size={22} /> },
];

function computeVirtualItems(offsetAmount: number) {
  const list: Array<{ virtualIndex: number; itemIndex: number; item: MenuItem; angle: number }> = [];
  const visible = new Set<number>();
  for (let i = Math.floor(offsetAmount) - 2; i <= Math.ceil(offsetAmount) + 6; i++) {
    const angle = VISIBLE_START + (i - offsetAmount) * SPACING;
    if (angle >= VISIBLE_START - 0.1 && angle <= VISIBLE_END + 0.1) {
      const idx = ((i % MENU_ITEMS.length) + MENU_ITEMS.length) % MENU_ITEMS.length;
      visible.add(idx);
      list.push({ virtualIndex: i, itemIndex: idx, item: MENU_ITEMS[idx], angle });
    }
  }
  return { list, visible };
}

const ARC_MENU_CSS = `
.fm-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
}

.fm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  pointer-events: none;
  opacity: 0;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition: opacity 0.28s ease, background 0.28s ease, backdrop-filter 0.28s ease;
}

.fm-backdrop.open {
  pointer-events: auto;
  opacity: 1;
  background: rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.fm-toast {
  position: fixed;
  bottom: 108px;
  right: 24px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 8px 12px;
  border-radius: 8px;
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.4s, transform 0.4s;
  border: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
}

.fm-toast.hide {
  opacity: 0;
  transform: translateY(8px);
}

.fm-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-text-primary) 35%, transparent);
  color: var(--color-bg);
  border: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);

  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  position: relative;
  z-index: 61;
  overflow: hidden;
  transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.fm-fab:focus {
  outline: none;
}

.fm-fab.open {
  background: color-mix(in srgb, var(--color-bg-subtle) 60%, transparent);
  color: var(--color-text-primary);
  border-color: color-mix(in srgb, var(--color-border) 75%, transparent);
}

@keyframes fmRipple {
  from { transform: scale(0); opacity: 0.45; }
  to { transform: scale(2.9); opacity: 0; }
}

.fm-fab-ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.35);
  animation: fmRipple 0.55s cubic-bezier(0.4,0,0.2,1) forwards;
  pointer-events: none;
}

.fm-fab-icon {
  display: flex;
  position: relative;
  z-index: 1;
  transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1);
}

.fm-fab-icon.open {
  transform: rotate(135deg);
}

.fm-arc-container {
  position: absolute;
  width: 320px;
  height: 320px;
  right: 28px;
  bottom: 28px;
  z-index: 60;
  user-select: none;
  touch-action: none;
  pointer-events: none;
}

.fm-arc-container.open {
  pointer-events: auto;
  cursor: grab;
}

.fm-arc-container.dragging {
  cursor: grabbing;
}

.fm-wrap-svg {
  position: absolute;
  right: -40px;
  bottom: -40px;
  width: 80px;
  height: 80px;
  overflow: visible;
  pointer-events: none;
  opacity: 0;
  transform: rotate(-30deg);
  transition: opacity 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s;
}

.fm-arc-container.open .fm-wrap-svg {
  opacity: 1;
  transform: rotate(0deg);
}

.fm-arc-container.closing .fm-wrap-svg {
  opacity: 0;
  transform: rotate(-20deg);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fm-arc-anchor {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.fm-arc-anchor.smooth {
  transition: transform 300ms ease-out;
}

@keyframes fmArcRise {
  from {
    transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy))) scale(0.08);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes fmArcSink {
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  65% { opacity: 0.55; }
  to {
    transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy))) scale(0.06);
    opacity: 0;
  }
}

@keyframes fmArcRiseLocal {
  from { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.fm-arc-wrapper {
  position: absolute;
}

.fm-arc-wrapper.rising {
  animation: fmArcRise 0.52s cubic-bezier(0.34,1.56,0.64,1) both;
  animation-delay: var(--stagger, 0s);
}

.fm-arc-wrapper.rising-local {
  animation: fmArcRiseLocal 0.44s cubic-bezier(0.34,1.56,0.64,1) both;
}

.fm-arc-wrapper.sinking {
  animation: fmArcSink 0.4s cubic-bezier(0.55,0,1,0.45) both;
  animation-delay: var(--sink-delay, 0s);
}

.fm-arc-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  color: white;
  cursor: pointer;
  gap: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1);
  transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
}

.fm-arc-btn.active {
  outline: 2px solid color-mix(in srgb, white 70%, transparent);
  outline-offset: 2px;
}

.fm-arc-btn:hover {
  transform: scale(1.12);
  box-shadow: 0 14px 32px rgba(0,0,0,0.22);
}

.fm-arc-btn:active {
  transform: scale(0.94);
}

.fm-arc-btn:focus {
  outline: none;
}

.fm-btn-label {
  font-size: 9px;
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.92);
  line-height: 1;
}

.fm-dots-outer {
  position: absolute;
  display: flex;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  transform: translate(50%,50%) scale(0.4);
  transition: opacity 0.3s ease 0.25s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.25s;
}

.fm-arc-container.open .fm-dots-outer {
  opacity: 1;
  transform: translate(50%,50%) scale(1);
}

.fm-arc-container.closing .fm-dots-outer {
  opacity: 0;
  transform: translate(50%,50%) scale(0.5);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fm-dots-inner {
  display: flex;
  gap: 6px;
  align-items: center;
}

.fm-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1d5db;
  transition: background 0.3s, transform 0.3s;
}

.fm-dot.active {
  background: #475569;
  transform: scale(1.25);
}
`;

// ── Main Component ─────────────────────────────────────────────────────────
export function FloatingMenu() {
  const [menuIntent, setMenuIntent] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);

  const dragStartX = useRef(0);
  const dragStartOff = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpeningRef = useRef(false);

  const activeOffset = dragOffset !== null ? dragOffset : offset;
  const { list: visibleItems, visible: visibleSet } = computeVirtualItems(activeOffset);

  const wR = 44;
  const wrapD = `M ${wR * Math.cos(rad(160))} ${wR * Math.sin(rad(160))} A ${wR} ${wR} 0 0 1 ${wR * Math.cos(rad(290))} ${wR * Math.sin(rad(290))}`;
  const firstItemX = R * Math.cos(rad(VISIBLE_START));
  const dotsRight = -(firstItemX / 2);
  const dotsBottom = -28;

  const closeMenu = useCallback(() => {
    if (!menuIntent || isClosing) {
      return;
    }
    if (openTimer.current) {
      clearTimeout(openTimer.current);
    }
    isOpeningRef.current = false;
    setMenuIntent(false);
    setIsClosing(true);
    closeTimer.current = setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, 520);
  }, [isClosing, menuIntent]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (!menuIntent) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, menuIntent]);

  useEffect(() => {
    return () => {
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const toggleMenu = useCallback(() => {
    setRippleKey((k) => k + 1);

    if (!menuIntent) {
      isOpeningRef.current = true;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setMenuIntent(true);
      setIsClosing(false);
      setIsRendered(true);
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => {
        isOpeningRef.current = false;
      }, 1100);
      return;
    }

    closeMenu();
  }, [closeMenu, menuIntent]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isClosing) return;
    isOpeningRef.current = false;
    dragStartX.current = e.clientX;
    dragStartOff.current = offset;
    setDragOffset(offset);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isClosing, offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragOffset((prev) => (prev === null ? null : dragStartOff.current - (e.clientX - dragStartX.current) / 50));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragOffset((prev) => {
      if (prev !== null) {
        setOffset(Math.round(prev));
      }
      return null;
    });
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      return;
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isClosing) return;
    isOpeningRef.current = false;
    if (wheelTimer.current) return;
    setOffset((prev) => prev + Math.sign(e.deltaY));
    wheelTimer.current = setTimeout(() => {
      wheelTimer.current = null;
    }, 150);
  }, [isClosing]);

  const handleNavigate = useCallback((item: MenuItem) => {
    setSelectedLabel(item.label);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1800);

    closeMenu();
    router.push(item.path);
  }, [closeMenu, router]);

  const containerClass = [
    'fm-arc-container',
    menuIntent ? 'open' : '',
    isClosing ? 'closing' : '',
    isDragging ? 'dragging' : '',
  ].filter(Boolean).join(' ');

  const totalVisible = visibleItems.length;

  return (
    <div ref={containerRef} className="md:hidden fm-root" aria-label="Navigation menu">
      <style>{ARC_MENU_CSS}</style>

      <div
        aria-hidden="true"
        className={`fm-backdrop${(menuIntent || isClosing) ? ' open' : ''}`}
        onClick={closeMenu}
      />

      <div className={`fm-toast${!toastVisible ? ' hide' : ''}`}>
        {toastVisible ? `Open ${selectedLabel}` : ''}
      </div>

      {isRendered && (
        <div
          className={containerClass}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={handleWheel}
        >
          <svg width="80" height="80" viewBox="-40 -40 80 80" className="fm-wrap-svg" aria-hidden="true">
            <defs>
              <marker id="fm-arc-mk" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto-start-reverse">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--color-text-primary)" />
              </marker>
            </defs>
            <path
              d={wrapD}
              fill="none"
              stroke="var(--color-text-primary)"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
              markerStart="url(#fm-arc-mk)"
              markerEnd="url(#fm-arc-mk)"
            />
          </svg>

          {visibleItems.map(({ virtualIndex, item, angle }, idx) => {
            const x = R * Math.cos(rad(angle));
            const y = R * Math.sin(rad(angle));
            const fx = -x;
            const fy = -y;
            const isActive = pathname === item.path;

            let wrapperClass = 'fm-arc-wrapper rising-local';
            let stagger = '0s';
            if (isClosing) {
              wrapperClass = 'fm-arc-wrapper sinking';
              stagger = `${(totalVisible - 1 - idx) * 0.028}s`;
            } else if (isOpeningRef.current) {
              wrapperClass = 'fm-arc-wrapper rising';
              stagger = `${idx * 0.042}s`;
            }

            const isHomeItem = item.id === 'home';

            return (
              <div
                key={`${item.id}-${virtualIndex}`}
                className={`fm-arc-anchor${dragOffset === null ? ' smooth' : ''}`}
                style={{ transform: `translate(${x}px,${y}px)` }}
              >
                <div
                  className={wrapperClass}
                  style={{
                    ['--fx' as string]: `${fx}px`,
                    ['--fy' as string]: `${fy}px`,
                    ['--stagger' as string]: stagger,
                    ['--sink-delay' as string]: stagger,
                    animationDelay: stagger,
                    pointerEvents: 'auto',
                  }}
                >
                  <div className={isHomeItem ? (isDark ? "rounded-full p-[2px] bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "rounded-full p-[2px] bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.5)]") : ""}>
                    <button
                      className={`fm-arc-btn${isActive ? ' active' : ''}`}
                      style={{ backgroundColor: (isHomeItem && !isDark) ? '#2e1065' : item.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(item);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label={item.label}
                    >
                      <div style={{ transform: 'scale(1.1)', display: 'flex', pointerEvents: 'none' }}>
                        {item.icon}
                      </div>
                      <span className="fm-btn-label">{item.label}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="fm-dots-outer" style={{ right: dotsRight, bottom: dotsBottom }}>
            <div className="fm-dots-inner">
              {MENU_ITEMS.map((item, idx) => (
                <div key={item.id} className={`fm-dot${visibleSet.has(idx) ? ' active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        className={`fm-fab${menuIntent ? ' open' : ''}`}
        onClick={toggleMenu}
        aria-label={menuIntent ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuIntent}
      >
        <span key={rippleKey} className="fm-fab-ripple" />
        <div className={`fm-fab-icon${menuIntent ? ' open' : ''}`}>
          <Plus size={24} />
        </div>
      </button>
    </div>
  );
}
