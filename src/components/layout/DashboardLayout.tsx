import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, Bell,
  Settings, LogOut, Menu, X, GraduationCap,
  FileText, Bot, Award, UserPlus, Calendar, Clock, Megaphone, StickyNote,
  ClipboardCheck, BarChart3, Sparkles, Wallet, Plus, Inbox,
  ClipboardList, TrendingUp, DollarSign, PanelLeftClose, PanelLeft, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import Logo from '@/components/brand/Logo';
import { PageFooter } from '@/components/layout/PageFooter';
import { cn } from '@/lib/utils';


interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const teacherNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
      { label: 'My Classes', href: '/teacher/classes', icon: BookOpen },
      { label: 'Students', href: '/teacher/students', icon: Users },
    ],
  },
  {
    title: 'Daily Operations',
    items: [
      { label: 'Check-in', href: '/teacher/checkin', icon: Clock },
      { label: 'Attendance', href: '/teacher/attendance', icon: ClipboardList },
      { label: 'Attendance Insights', href: '/teacher/attendance/analytics', icon: ClipboardList },
      { label: 'Admissions', href: '/teacher/admissions', icon: GraduationCap },
      { label: 'Form Builder', href: '/teacher/admission-form', icon: ClipboardList },
      { label: 'Programs', href: '/teacher/programs', icon: GraduationCap },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Homework', href: '/teacher/homework', icon: FileText },
      { label: 'Exam Management', href: '/teacher/exams', icon: ClipboardCheck },
      { label: 'Exam Checking Portal', href: '/teacher/exam-checking', icon: ClipboardCheck },
      { label: 'Results', href: '/teacher/results', icon: Award },
      { label: 'Notes', href: '/teacher/classes', icon: StickyNote },
      { label: 'Announcements', href: '/teacher/classes', icon: Megaphone },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
];

const studentNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
      { label: "Today's Classes", href: '/student/classes', icon: Calendar },
      { label: 'Learning', href: '/student/learning', icon: GraduationCap },
    ],
  },
  {
    title: 'My Work',
    items: [
      { label: 'Homework', href: '/student/homework', icon: ClipboardList },
      { label: 'Notes', href: '/student/notes', icon: StickyNote },
      { label: 'Results', href: '/student/results', icon: Award },
      { label: 'Attendance', href: '/student/attendance', icon: CalendarCheck },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Announcements', href: '/student/announcements', icon: Megaphone },
      { label: 'Study Buddy', href: '/student/ai', icon: Sparkles },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
];

const adminNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Students', href: '/admin/students', icon: Users },
      { label: 'Classes', href: '/admin/classes', icon: BookOpen },
    ],
  },
  {
    title: 'Staff',
    items: [
      { label: 'Teacher Management', href: '/admin/teacher-management', icon: UserPlus },
      { label: 'Teachers', href: '/admin/teachers', icon: GraduationCap },
      { label: 'Attendance / Check-in', href: '/admin/checkin', icon: CalendarCheck },
      { label: 'Schedule', href: '/admin/schedule', icon: Calendar },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Exam Management', href: '/admin/exam-terms', icon: ClipboardCheck },
      { label: 'Admissions', href: '/admin/admissions', icon: Inbox },
      { label: 'Form Builder', href: '/admin/admission-form', icon: ClipboardList },
      { label: 'Programs', href: '/admin/programs', icon: GraduationCap },
      { label: 'Reports', href: '/admin/students', icon: BarChart3 },
    ],
  },
  {
    title: 'Institution',
    items: [
      { label: 'Financials', href: '/admin/financials', icon: Wallet },
      { label: 'AI Operations', href: '/admin/ai', icon: Bot },
      { label: 'School Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function getNavGroups(role: AppRole | null): NavGroup[] {
  switch (role) {
    case 'teacher': return teacherNav;
    case 'student': return studentNav;
    case 'admin': return adminNav;
    default: return [];
  }
}

function getRoleLabel(role: AppRole | null): string {
  switch (role) {
    case 'teacher': return 'Teacher';
    case 'student': return 'Student';
    case 'admin': return 'Administrator';
    default: return '';
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SCROLL_KEY = 'edunova.sidebar.scroll';
const GROUPS_KEY = 'edunova.sidebar.groups';

function readCollapsedGroups(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(GROUPS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('edunova.sidebar.collapsed') === '1';
  });
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>(readCollapsedGroups);
  const navRef = useRef<HTMLElement | null>(null);
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const groups = getNavGroups(role);
  const activeLabel = groups
    .flatMap((g) => g.items)
    .find((i) => location.pathname === i.href || location.pathname.startsWith(i.href + '/'))?.label;

  useEffect(() => {
    window.localStorage.setItem('edunova.sidebar.collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    window.sessionStorage.setItem(GROUPS_KEY, JSON.stringify(closedGroups));
  }, [closedGroups]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Restore sidebar scroll position across page changes (layout remounts per page)
  const attachNav = (el: HTMLElement | null) => {
    navRef.current = el;
    if (el) {
      const saved = Number(window.sessionStorage.getItem(SCROLL_KEY) || '0');
      if (saved > 0) {
        el.scrollTop = saved;
        requestAnimationFrame(() => {
          if (navRef.current) navRef.current.scrollTop = saved;
        });
      }
    }
  };

  const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
    window.sessionStorage.setItem(SCROLL_KEY, String(e.currentTarget.scrollTop));
  };

  const toggleGroup = (title: string) =>
    setClosedGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const sidebarWidth = collapsed ? 'md:w-[84px]' : 'md:w-[276px]';


  const SidebarBody = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn('flex items-center h-16 border-b border-border/70 shrink-0', collapsed ? 'md:justify-center md:px-0 px-5' : 'px-5')}>
        <Link to="/" className="flex items-center gap-3 min-w-0">
          {collapsed ? <Logo size={34} priority /> : <Logo size={38} withWordmark tagline="School OS" priority />}
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden ml-auto text-muted-foreground hover:text-primary transition-colors"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Identity */}
      <div className={cn('border-b border-border/70 py-4 shrink-0', collapsed ? 'md:px-0 md:flex md:justify-center px-5' : 'px-5')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 shadow-[0_0_18px_-6px_hsl(var(--primary)/0.7)]">
            <span className="text-primary font-bold text-sm">
              {(profile?.full_name || 'U')[0].toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-primary/70 font-mono uppercase tracking-[0.18em]">{getRoleLabel(role)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav ref={attachNav} onScroll={handleNavScroll} className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {groups.map((group) => {
          const isClosed = !collapsed && !!closedGroups[group.title];
          return (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center gap-2 px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', isClosed && '-rotate-90')} />
                <span className="truncate">{group.title}</span>
              </button>
            )}
            {!isClosed && group.items.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                    collapsed ? 'md:justify-center md:px-0 px-3 py-2.5' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/25 shadow-[0_0_24px_-14px_hsl(var(--primary))]'
                      : 'text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground hover:translate-x-[2px]'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                  )}
                  <item.icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary))]')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>


      {/* Footer */}
      <div className="p-3 border-t border-border/70 space-y-1 shrink-0">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'hidden md:flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
        <Button
          variant="ghost"
          className={cn(
            'w-full text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10',
            collapsed ? 'md:justify-center md:px-0 justify-start' : 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className={cn('h-4 w-4', !collapsed && 'mr-3')} />
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background cyber-grid app-aurora">
      <div className="flex min-h-screen">
        {/* Desktop sidebar — part of the flow so content always sits beside it */}
        <aside
          className={cn(
            'hidden md:flex flex-col shrink-0 sticky top-0 h-screen glass-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            sidebarWidth
          )}
        >
          {SidebarBody}
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="fixed inset-y-0 left-0 z-50 w-[280px] glass-sidebar md:hidden"
              >
                {SidebarBody}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 lg:px-6 glass border-b border-border/70">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 md:hidden">
              <Logo size={24} />
              <span className="font-bold tracking-tight text-sm">Edu<span className="text-primary">nova</span></span>
            </div>

            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                {getRoleLabel(role)}
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm font-medium text-foreground truncate">{activeLabel || 'Workspace'}</span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[1400px]"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <PageFooter />
        </div>
      </div>
    </div>
  );
}
