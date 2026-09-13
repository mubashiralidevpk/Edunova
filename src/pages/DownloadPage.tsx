import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Monitor, Apple, Terminal, ShieldCheck, Zap, Feather, RefreshCw, Clock, Smartphone, PlayCircle, Download } from 'lucide-react';
import PageMeta from '@/components/seo/PageMeta';
import { PageFooter } from '@/components/layout/PageFooter';
import { Logo } from '@/components/brand/Logo';

// Desktop release: https://github.com/mubashiralidevpk/edunovamis/releases/tag/main
const DESKTOP_RELEASE_PAGE = 'https://github.com/mubashiralidevpk/edunovamis/releases/tag/main';
const WINDOWS_EXE = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/main/Edunova_1.0.0_x64-setup.exe';
const WINDOWS_MSI = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/main/Edunova_1.0.0_x64_en-US.msi';
const MACOS_DMG = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/main/Edunova_1.0.0_universal.dmg';
const LINUX_APPIMAGE = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/main/Edunova_1.0.0_amd64.AppImage';
const LINUX_DEB = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/main/Edunova_1.0.0_amd64.deb';

// Mobile release: https://github.com/mubashiralidevpk/edunovamis/releases/tag/mobile
const MOBILE_RELEASE_PAGE = 'https://github.com/mubashiralidevpk/edunovamis/releases/tag/mobile';
const ANDROID_APK = 'https://github.com/mubashiralidevpk/edunovamis/releases/download/mobile/Edunova_1.0.0.apk';

const desktopBuilds = [
  {
    os: 'Windows 10 / 11',
    icon: Monitor,
    file: 'Edunova_1.0.0_x64-setup.exe',
    url: WINDOWS_EXE,
    altUrl: WINDOWS_MSI,
    altLabel: 'Download .msi',
    note: '64-bit installer (NSIS). An .msi build is published alongside it.',
    primary: true,
  },
  { os: 'macOS 12+', icon: Apple, file: 'Edunova_1.0.0_universal.dmg', url: MACOS_DMG, note: 'Universal build for Apple Silicon and Intel.' },
  {
    os: 'Linux',
    icon: Terminal,
    file: 'Edunova_1.0.0_amd64.AppImage',
    url: LINUX_APPIMAGE,
    altUrl: LINUX_DEB,
    altLabel: 'Download .deb',
    note: 'AppImage for most distributions, plus a .deb package for Debian/Ubuntu.',
  },
];

const mobileBuilds = [
  {
    os: 'Android 9+',
    icon: PlayCircle,
    file: 'Edunova_1.0.0.apk',
    url: ANDROID_APK,
    note: 'Direct APK download from the mobile release. Google Play listing will follow.',
    primary: true,
  },
  { os: 'iOS 15+', icon: Smartphone, file: 'App Store', note: 'iPhone and iPad build, distributed through the App Store.', url: undefined },
];

const traits = [
  { icon: Zap, t: 'Fast', d: 'Native window, instant startup with an animated splash while the app loads.' },
  { icon: Feather, t: 'Lightweight', d: 'Built with Tauri — a few megabytes instead of hundreds.' },
  { icon: ShieldCheck, t: 'Secure', d: 'Same login, same permissions and the same per-school data isolation as the web app.' },
  { icon: RefreshCw, t: 'Always current', d: 'Every platform update appears in the desktop app automatically — nothing to reinstall.' },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Download Edunova — Desktop & Mobile Apps"
        description="Download Edunova for Windows, macOS, Linux and Android. Fast, lightweight, secure school management."
        path="/download"
      />

      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold tracking-tight">Edu<span className="text-primary">nova</span></span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </nav>

      <section className="relative px-6 pt-20 pb-14 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(700px 340px at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-3xl mx-auto">
          <span className="pill-badge"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Edunova Apps</span>
          <h1 className="hero-headline mt-7 text-4xl sm:text-5xl">Edunova, everywhere you work.</h1>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Dedicated apps for school offices, teachers, students and parents —
            built for schools and institutions, not a website in a window. Fast, lightweight,
            secure and professional.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a href={desktopBuilds[0].url} className="btn-orb">
              <Download className="w-4 h-4" /> Download for Windows
            </a>
            <a href={MOBILE_RELEASE_PAGE} className="btn-orb-glass">
              <Smartphone className="w-4 h-4" /> Mobile release
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground font-mono">
            Version 1.0.0 · Windows 64-bit · macOS · Linux · Android APK
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
            <a href={DESKTOP_RELEASE_PAGE} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Desktop release on GitHub
            </a>
            <a href={MOBILE_RELEASE_PAGE} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Mobile release on GitHub
            </a>
          </div>
        </motion.div>
      </section>

      <section className="px-6 pb-6">
        <h2 className="text-center text-xl font-semibold mb-8">Desktop</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {desktopBuilds.map((b) => (
            <div key={b.os} className={`orb-panel p-6 ${b.primary ? 'ring-1 ring-primary/30' : ''}`}>
              <b.icon className="w-6 h-6 text-primary" />
              <h3 className="mt-4 font-semibold">{b.os}</h3>
              <p className="mt-1 text-xs font-mono text-muted-foreground break-all">{b.file}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.note}</p>
              {b.url ? (
                <a href={b.url} className="btn-orb-glass mt-5 inline-flex">
                  <Download className="w-4 h-4 text-primary" /> Download
                </a>
              ) : (
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" /> Coming soon
                </span>
              )}
              {b.altUrl && (
                <a href={b.altUrl} className="mt-3 text-xs text-primary hover:underline block">
                  {b.altLabel}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-6 pt-10">
        <h2 className="text-center text-xl font-semibold mb-8">Mobile</h2>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
          {mobileBuilds.map((b) => (
            <div key={b.os} className={`orb-panel p-6 ${b.primary ? 'ring-1 ring-primary/30' : ''}`}>
              <b.icon className="w-6 h-6 text-primary" />
              <h3 className="mt-4 font-semibold">{b.os}</h3>
              <p className="mt-1 text-xs font-mono text-muted-foreground break-all">{b.file}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.note}</p>
              {b.url ? (
                <a href={b.url} className="btn-orb-glass mt-5 inline-flex">
                  <Download className="w-4 h-4 text-primary" /> Download APK
                </a>
              ) : (
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" /> Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Why the apps</h2>
        <div className="mt-8 max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {traits.map((t) => (
            <div key={t.t} className="orb-panel p-6">
              <t.icon className="w-5 h-5 text-accent" />
              <h3 className="mt-4 font-semibold">{t.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto orb-panel p-7 text-center">
          <h2 className="font-semibold">Installing Edunova</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            <strong>Windows:</strong> Run the downloaded setup file. Because the installer is not yet signed, Windows may show a
            blue "Windows protected your PC" notice — choose <strong>More info</strong> then
            <strong> Run anyway</strong>.<br /><br />
            <strong>Android:</strong> Open the APK on your phone and allow installation from this source when prompted.
            Sign in exactly as you do on the website; the same account works across web, desktop and mobile.
          </p>
          <Link to="/auth/login" className="btn-orb mt-6 inline-flex">Open Edunova in browser</Link>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
