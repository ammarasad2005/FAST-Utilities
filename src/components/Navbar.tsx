'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Sliders, Users, Library, MapPin, Search } from 'lucide-react';
import { useTheme } from '@/lib/theme';

type Tab = {
  id: string;
  path: string;
  label: string;
  icon: any;
};

const TABS: Tab[] = [
  { id: 'rooms', path: '/rooms', label: 'ROOMS', icon: MapPin },
  { id: 'lost-found', path: '/lost-found', label: 'LOST & FOUND', icon: Search },
  { id: 'home', path: '/home', label: 'HOME', icon: Home },
  { id: 'faculty', path: '/faculty', label: 'FACULTY', icon: Users },
  { id: 'courses', path: '/timetable/custom', label: 'COURSES', icon: Library },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';

  const barBg = isDark
    ? 'bg-gradient-to-b from-neutral-800 to-neutral-900'
    : 'bg-gradient-to-b from-white to-neutral-100 border border-black/5';

  const barShadow = isDark
    ? 'shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]'
    : 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]';

  const inactiveText = isDark ? 'text-neutral-500' : 'text-neutral-500';
  const activeText = isDark ? 'text-white' : 'text-neutral-900';

  // Determine active tab based on current pathname
  const activeTabId = TABS.find(tab => {
    if (tab.id === 'courses') {
      return pathname === '/timetable/custom';
    }
    return pathname === tab.path;
  })?.id || 'home';

  return (
    <nav className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-1 rounded-full items-center">
      {/* Gradient Border Wrapper */}
      <div className={`rounded-full p-[2px] ${
        isDark 
          ? "bg-gradient-to-r from-amber-500/40 via-yellow-200/70 to-amber-500/40" 
          : "bg-gradient-to-r from-purple-600/40 via-orange-500/60 to-purple-600/40"
      }`}>
        <div className={`relative inline-flex rounded-full px-3 py-1.5 ${barBg} ${barShadow}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  router.push(tab.path);
                }}
                className="relative flex flex-col items-center justify-end gap-1.5 px-6 pt-5 pb-1.5 outline-none group min-w-[100px]"
              >
                {/* Stage light fixture (cone) + beam */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="stage-light"
                      className="pointer-events-none absolute inset-x-0 -top-5 flex flex-col items-center"
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    >
                      <div className="relative">
                        <div
                          className={
                            isDark
                              ? "w-8 h-4 bg-gradient-to-b from-neutral-700 to-neutral-900 rounded-t-full border-t border-white/10"
                              : "w-8 h-4 bg-gradient-to-b from-neutral-200 to-neutral-400 rounded-t-full border-t border-white/80"
                          }
                          style={{ clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }}
                        />
                        <div className="absolute inset-x-0 bottom-0 flex justify-center">
                          <div className={`w-5 h-1.5 rounded-full blur-[2px] ${
                            isDark ? "bg-amber-100" : "bg-amber-200"
                          }`} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Beam of light */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="stage-beam"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="pointer-events-none absolute inset-0 flex justify-center h-full"
                    >
                      <div 
                        className="w-[140%] h-full"
                        style={{
                          background: isDark
                            ? "radial-gradient(ellipse 70% 90% at 50% 0%, rgba(255,240,200,0.22), rgba(255,220,150,0.06) 40%, transparent 70%)"
                            : "radial-gradient(ellipse 70% 90% at 50% 0%, rgba(0,0,0,0.07), rgba(0,0,0,0.03) 40%, transparent 70%)",
                          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Underline glow */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="stage-underline"
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="pointer-events-none absolute bottom-0 inset-x-0 flex justify-center"
                    >
                      <div 
                        className="h-[1.5px] w-[70%] rounded-full"
                        style={{
                          background: isDark
                            ? "linear-gradient(90deg, transparent, rgba(255,230,170,0.9), transparent)"
                            : "linear-gradient(90deg, transparent, rgba(0,0,0,0.85), transparent)",
                          boxShadow: isDark ? "0 0 10px rgba(255,220,150,0.7)" : "none",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Icon
                  className={`relative z-10 w-4 h-4 transition-colors ${
                    isActive ? activeText : inactiveText
                  }`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span
                  className={`relative z-10 tracking-[0.1em] transition-colors ${
                    isActive ? activeText : inactiveText
                  }`}
                  style={{ fontSize: "10px", fontWeight: isActive ? 600 : 500 }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
