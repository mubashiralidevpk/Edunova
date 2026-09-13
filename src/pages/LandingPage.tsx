import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Download, Monitor, Smartphone, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/brand/Logo';
import PageMeta from '@/components/seo/PageMeta';


// ============================================================================
// Edunova — Landing page
// Visual language: deep electric aura, oversized gradient display type,
// mono kickers, pill controls, numbered capability cards, marquee ticker.
// ============================================================================

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const spring = { type: 'spring' as const, stiffness: 90, damping: 18 };

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

function CountFlow({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          setV(Math.round(easeOutCubic(p) * to));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{v.toLocaleString()}</span>;
}

function SpecCard({ n, kicker, title, body, delay }: { n: string; kicker: string; title: string; body: string; delay: number }) {
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  }
  return (
    <Reveal delay={delay}>
      <div className="spec-card p-7 h-full" onMouseMove={onMove}>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="font-mono text-2xl text-primary/70">{n}</span>
          <span className="kicker">{kicker}</span>
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </Reveal>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, schools: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    (async () => {
      const sc = await supabase.from('schools').select('*', { count: 'exact', head: true });
      setStats((prev) => ({ ...prev, schools: sc.count || 0 }));
    })();
  }, []);


  const ticker = ['ATTENDANCE', 'RESULTS', 'ADMISSIONS', 'FEES', 'TIMETABLE', 'PARENT PORTAL', 'AI ASSISTANTS', 'REPORT CARDS', 'ANNOUNCEMENTS'];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <PageMeta
        title="Edunova — School Management System for Pakistan"
        description="Attendance, fees, results, admissions and parent communication for Pakistani schools — one secure, multi-school platform."
        path="/"
      />

      {/* NAV */}
      <nav className="fixed top-4 inset-x-0 z-50 px-4">
        <div className="max-w-6xl mx-auto nav-glass rounded-3xl md:rounded-full px-4 sm:px-5 py-2 md:py-0 md:h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={30} priority />
            <span className="font-semibold tracking-tight text-base text-foreground">Edu<span className="text-primary">nova</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#modules" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-primary transition-colors">Core Intelligence</a>
            <a href="#trust" className="hover:text-primary transition-colors">Security</a>
            <a href="#download" className="hover:text-primary transition-colors">Get the App</a>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth/login" className="btn-orb-glass !py-2 !px-4 !text-sm">Sign in</Link>
            <Link to="/admissions" className="btn-orb !py-2 !px-4 !text-sm">Get Started</Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="md:hidden p-2 rounded-xl border border-primary/20 text-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden max-w-6xl mx-auto mt-2 nav-glass rounded-3xl p-4 space-y-1"
            >
              {[
                { href: '#modules', label: 'How It Works' },
                { href: '#roles', label: 'Core Intelligence' },
                { href: '#trust', label: 'Security' },
                { href: '#download', label: 'Get the App' },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link to="/auth/login" onClick={() => setMenuOpen(false)} className="btn-orb-glass !py-2.5 !text-sm">Sign in</Link>
                <Link to="/admissions" onClick={() => setMenuOpen(false)} className="btn-orb !py-2.5 !text-sm">Get Started</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative pt-40 pb-24 px-6 cosmic-hero overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroFade }} className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <span className="pill-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Management Intelligence System
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="hero-headline mt-8 text-[11vw] sm:text-6xl lg:text-7xl"
          >
            Your school, run intelligently — effortlessly.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-7 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Edunova handles attendance, fees, results, admissions and parent communication in one
            secure platform — with strict per-school data isolation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.38 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/admissions" className="btn-orb group">
              Enroll your school
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link to="/download" className="btn-orb-glass">
              <Download className="w-4 h-4 text-primary" /> Download desktop app
            </Link>

            <Link to="/results" className="btn-orb-glass">
              <span className="text-primary">▶</span> Check a result
            </Link>
          </motion.div>
        </motion.div>

        {/* PRODUCT PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="relative z-10 max-w-5xl mx-auto mt-20 orb-panel p-4"
        >
          <div className="grid lg:grid-cols-[200px_1fr_220px] gap-4">
            <div className="rounded-xl border border-primary/12 bg-background/50 p-4 space-y-3">
              <div className="kicker">edunova hub</div>
              {['Dashboard', 'Attendance', 'Admissions', 'Exams & Results', 'Fees'].map((t, i) => (
                <div key={t} className={`text-sm rounded-lg px-3 py-2 ${i === 0 ? 'bg-primary/12 text-primary border border-primary/25' : 'text-muted-foreground'}`}>{t}</div>
              ))}
            </div>
            <div className="rounded-xl border border-primary/12 bg-background/50 p-5 flex flex-col justify-between gap-5">
              <div>
                <div className="text-lg font-semibold text-foreground">Good to see you, Principal</div>
                <p className="text-sm text-muted-foreground mt-1">3 admission applications and 2 result sheets need your review today.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'Present today', v: '94%' },
                  { l: 'Fees collected', v: '87%' },
                  { l: 'Papers checked', v: '128' },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-primary/12 bg-card/40 p-3">
                    <div className="font-mono text-xl text-foreground">{s.v}</div>
                    <div className="kicker mt-1 !text-[10px]">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary/12 bg-background/50 p-4 space-y-3">
              <div className="kicker">insights</div>
              <div className="text-sm text-muted-foreground">Daily focus score</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[89%] bg-gradient-to-r from-primary to-accent" />
              </div>
              <div className="font-mono text-2xl text-foreground">89<span className="text-sm text-muted-foreground">/100</span></div>
              <div className="space-y-2 pt-2">
                {['Attendance stable', 'Fee reminders sent', 'Results published'].map((t) => (
                  <div key={t} className="text-xs text-muted-foreground flex gap-2"><span className="text-accent">◆</span>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* STAT STRIP */}
        <div className="relative z-10 mt-20 -mx-6">
          <div className="stat-strip grid grid-cols-1 max-w-7xl mx-auto">
            {[
              { label: 'SCHOOLS', v: stats.schools },
            ].map((s) => (
              <div key={s.label} className="py-8 text-center">
                <div className="font-mono text-3xl font-semibold text-foreground"><CountFlow to={s.v} /></div>
                <div className="kicker mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="py-6 border-b border-border overflow-hidden bg-background/60">
        <div className="marquee-track">
          {[...ticker, ...ticker].map((t, i) => (
            <span key={`${t}-${i}`} className="kicker !text-xs whitespace-nowrap flex items-center gap-3">
              <span className="text-primary">◆</span>{t}
            </span>
          ))}
        </div>
      </div>


      {/* MODULES */}
      <section id="modules" className="py-28 px-6 relative">
        <div className="absolute inset-0 aurora-soft pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <Reveal>
            <div className="kicker mb-4">// platform.capabilities</div>
            <h2 className="display-xl text-5xl md:text-7xl max-w-4xl">
              Everything a school runs on, in one place.
            </h2>
            <p className="mt-6 text-muted-foreground max-w-xl">
              Six modules engineered for daily campus reality — not paperwork digitised badly.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
            {[
              { n: '01', k: 'attendance', t: 'Attendance', b: 'Roll-call in under 30 seconds, absent-SMS to parents, teacher check-in register and automatic substitution routing.' },
              { n: '02', k: 'results', t: 'Exams & Results', b: 'Weighted grading categories, bulk marks entry, publishing controls and a public result portal per school.' },
              { n: '03', k: 'admissions', t: 'Admissions', b: 'Public apply page, school-scoped document upload, and one-click conversion from applicant to enrolled student.' },
              { n: '04', k: 'finance', t: 'Fees & Payroll', b: 'Category fee structures, an immutable void-only ledger with audit trail, and monthly payroll runs — admin only.' },
              { n: '05', k: 'comms', t: 'Communication', b: 'Class group chats, teacher-to-parent direct messages, pinned announcements and a dedicated parent portal.' },
              { n: '06', k: 'ai', t: 'AI Assistants', b: 'A lesson and report helper for teachers, a study tutor for students, and an operations copilot for admins.' },
            ].map((m, i) => (
              <SpecCard key={m.n} n={m.n} kicker={m.k} title={m.t} body={m.b} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="py-28 px-6 border-t border-border relative">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="kicker mb-4">// access.model</div>
            <h2 className="display-xl text-5xl md:text-7xl max-w-3xl">One platform. Four dashboards.</h2>
          </Reveal>
          <div className="grid md:grid-cols-4 gap-5 mt-14">
            {[
              { k: 'Admin', d: 'School-wide analytics, staff control, fees, admissions and settings.' },
              { k: 'Teacher', d: 'Classes, attendance, marks, notes, announcements and daily check-in.' },
              { k: 'Student', d: 'Timetable, results, learning material, announcements and AI tutor.' },
              { k: 'Parent', d: 'Attendance, results, report cards and messaging with teachers.' },
            ].map((r, i) => (
              <Reveal key={r.k} delay={i * 0.07}>
                <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-6 h-full hover:border-primary/40 transition-colors">
                  <div className="kicker mb-3 text-primary">role · {r.k}</div>
                  <div className="text-xl font-semibold text-foreground mb-2">{r.k}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="py-28 px-6 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 aurora-soft pointer-events-none" />
        <div className="max-w-7xl mx-auto relative grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="kicker mb-4">// security</div>
            <h2 className="display-xl text-4xl md:text-6xl">Your school's data stays your school's data.</h2>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-lg">
              Access is enforced in the database, not just the interface. Every record carries a school
              identifier, and every query is filtered against the signed-in user's role and school.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <ul className="space-y-3">
              {[
                'Row-level security scoped to school on every table',
                'Roles stored separately — no privilege escalation',
                'Server-side identity derived from the auth token',
                'Document storage partitioned per school',
                'Breached-password checks and sign-in rate limiting',
              ].map((t) => (
                <li key={t} className="flex gap-3 items-start rounded-xl border border-border bg-card/40 backdrop-blur-xl p-4">
                  <span className="text-primary font-mono text-xs mt-1">◆</span>
                  <span className="text-sm text-foreground/85">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* DOWNLOAD APPS */}
      <section id="download" className="py-28 px-6 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 aurora-soft pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <Reveal>
            <div className="kicker mb-4">// get.edunova</div>
            <h2 className="display-xl text-4xl md:text-6xl max-w-3xl">Use Edunova on every screen.</h2>
            <p className="mt-5 text-muted-foreground max-w-xl">
              The same secure platform — on your desk, in your pocket, or in the lab. Desktop and mobile apps stay in sync with the live web app.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 mt-14">
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-8 h-full hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-foreground">Desktop</div>
                    <div className="kicker !text-[10px]">Windows · macOS · Linux</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  A fast, frameless Tauri shell around the live platform. Opens straight to login, auto-hides its title bar, and stays updated with every website change.
                </p>
                <Link to="/download" className="btn-orb !py-2.5 !px-5 !text-sm inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download desktop app
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-8 h-full hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-foreground">Mobile</div>
                    <div className="kicker !text-[10px]">Android · iOS</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Android APK is available now. iOS requires a Mac with Xcode and an Apple Developer account for App Store distribution.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://github.com/mubashiralidevpk/edunovamis/releases/download/mobile/Edunova_1.0.0.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-orb !py-2.5 !px-5 !text-sm inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Android APK
                  </a>
                  <span className="px-3 py-2 rounded-full border border-border text-xs text-muted-foreground">iOS coming soon</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 relative overflow-hidden aurora-hero border-t border-border">
        <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Reveal>
            <div className="kicker mb-6">// ready</div>
            <h2 className="display-xl text-5xl md:text-7xl">Bring your school online this week.</h2>
            <p className="mt-6 text-muted-foreground text-lg max-w-xl mx-auto">
              Full data import, staff onboarding and training included. Start with one class, scale to the whole campus.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/admissions" className="btn-pill btn-pill-light">Enroll your school</Link>
              <Link to="/auth/login" className="btn-pill btn-pill-ghost">Sign in</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-6">
        <div className="beam mb-8 max-w-7xl mx-auto" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 kicker text-center md:text-left">
          <span>Created by Mubashir Ali, IMCB H-9, N-11, 26HS043</span>
          <span>© {new Date().getFullYear()} Edunova — Management Intelligence System</span>
          <div className="flex gap-6 justify-center">
            <Link to="/results" className="hover:text-primary transition-colors">Result portal</Link>
            <Link to="/admissions" className="hover:text-primary transition-colors">Admissions</Link>
            <Link to="/auth/login" className="hover:text-primary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
