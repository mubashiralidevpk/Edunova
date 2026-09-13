const { app, BrowserWindow, shell, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

// Edunova — Desktop Shell
// - Frameless with custom auto-hide titlebar (reveals on hover)
// - Opens straight into /auth/login (no landing page in desktop)
// - Injects a "desktop-only" enhancement layer (smoother transitions,
//   richer glass, motion cues) so it feels distinct from the web app

const WEB_BASE = (process.env.EDUNOVA_URL || 'https://aksmsb.lovable.app').replace(/\/$/, '');
const START_URL = `${WEB_BASE}/auth/login?desktop=1`;
const ICON = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));

app.setName('Edunova');
if (process.platform === 'win32') app.setAppUserModelId('com.aksmsb.nexus');

let splash = null;
let mainWin = null;

function createSplash() {
  splash = new BrowserWindow({
    width: 520, height: 340,
    frame: false, transparent: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#0C0E14', icon: ICON,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1440, height: 920,
    minWidth: 1024, minHeight: 700,
    show: false,
    backgroundColor: '#0C0E14',
    icon: ICON,
    title: 'Edunova',
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWin.loadURL(START_URL).catch(() => {
    mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: '/auth/login' });
  });

  mainWin.webContents.on('did-fail-load', (_e, code) => {
    if (code === -105 || code === -106 || code === -2) {
      mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: '/auth/login' });
    }
  });

  // Inject the custom titlebar + desktop-only effects into every page load
  mainWin.webContents.on('did-finish-load', () => {
    mainWin.webContents.executeJavaScript(DESKTOP_INJECT).catch(() => {});
  });

  mainWin.once('ready-to-show', () => {
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close();
      mainWin.show();
      mainWin.focus();
    }, 900);
  });

  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(WEB_BASE)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// ---- Window control IPC (from preload) ----
ipcMain.on('win:minimize', () => mainWin && mainWin.minimize());
ipcMain.on('win:toggle-maximize', () => {
  if (!mainWin) return;
  mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
});
ipcMain.on('win:close', () => mainWin && mainWin.close());

// ---- Desktop-only visual layer injected into the live web app ----
const DESKTOP_INJECT = `
(() => {
  if (window.__nexusDesktopInjected) return;
  window.__nexusDesktopInjected = true;
  document.documentElement.setAttribute('data-nexus-desktop', 'true');

  // 1) Pretty auto-hide titlebar
  const bar = document.createElement('div');
  bar.id = 'nexus-titlebar';
  bar.innerHTML = \`
    <div class="nx-tb-brand">
      <span class="nx-tb-dot"></span>
      <span class="nx-tb-name">EDU<b>NOVA</b></span>
      <span class="nx-tb-tag">v2.0 // DESKTOP</span>
    </div>
    <div class="nx-tb-drag"></div>
    <div class="nx-tb-ctrls">
      <button data-a="min" title="Minimize">&#8211;</button>
      <button data-a="max" title="Maximize">&#9744;</button>
      <button data-a="close" class="nx-close" title="Close">&#10005;</button>
    </div>
  \`;
  document.body.appendChild(bar);

  // Always-present hover trigger strip at the very top of the window
  const hotzone = document.createElement('div');
  hotzone.id = 'nexus-titlebar-hotzone';
  document.body.appendChild(hotzone);

  bar.querySelector('[data-a=min]').onclick = () => window.nexusDesktop && window.nexusDesktop.minimize();
  bar.querySelector('[data-a=max]').onclick = () => window.nexusDesktop && window.nexusDesktop.toggleMaximize();
  bar.querySelector('[data-a=close]').onclick = () => window.nexusDesktop && window.nexusDesktop.close();

  // Auto-hide behavior with a small grace delay so it doesn't flicker
  let hideT = null;
  const show = () => { if (hideT) { clearTimeout(hideT); hideT = null; } bar.classList.add('nx-show'); };
  const hideSoon = () => { if (hideT) clearTimeout(hideT); hideT = setTimeout(() => bar.classList.remove('nx-show'), 400); };
  hotzone.addEventListener('mouseenter', show);
  bar.addEventListener('mouseenter', show);
  bar.addEventListener('mouseleave', hideSoon);
  hotzone.addEventListener('mouseleave', hideSoon);

  // 2) Desktop-only style layer (auto-hide bar, smoother transitions, richer glass)
  const css = document.createElement('style');
  css.id = 'nexus-desktop-style';
  css.textContent = \`
    html[data-nexus-desktop=true], html[data-nexus-desktop=true] body { overflow-x: hidden; }

    #nexus-titlebar-hotzone {
      position: fixed; top: 0; left: 0; right: 0; height: 8px;
      z-index: 2147483001; background: transparent;
    }

    #nexus-titlebar {
      position: fixed; top: 0; left: 0; right: 0; height: 38px;
      z-index: 2147483000;
      display: flex; align-items: center;
      padding: 0 10px 0 16px;
      background: linear-gradient(180deg, rgba(12,14,20,0.95), rgba(12,14,20,0.78));
      backdrop-filter: blur(14px) saturate(140%);
      -webkit-backdrop-filter: blur(14px) saturate(140%);
      border-bottom: 1px solid rgba(0,255,255,0.18);
      box-shadow: 0 8px 32px rgba(0,255,255,0.08), inset 0 -1px 0 rgba(0,255,255,0.06);
      color: #d6faff;
      font-family: ui-monospace, "JetBrains Mono", Menlo, monospace;
      font-size: 12px; letter-spacing: 0.14em;
      transform: translateY(-100%);
      transition: transform .32s cubic-bezier(.2,.9,.25,1), opacity .25s;
      opacity: 0;
      -webkit-app-region: drag;
      app-region: drag;
      user-select: none;
    }
    #nexus-titlebar .nx-tb-hotzone { display: none; }
    #nexus-titlebar.nx-show { transform: translateY(0); opacity: 1; }
    #nexus-titlebar .nx-tb-drag { flex: 1; height: 100%; }
    #nexus-titlebar .nx-tb-brand { display: flex; align-items: center; gap: 10px; }
    #nexus-titlebar .nx-tb-ctrls { display: flex; align-items: center; gap: 6px; -webkit-app-region: no-drag; app-region: no-drag; }
    #nexus-titlebar .nx-tb-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #00ffc8; box-shadow: 0 0 10px #00ffc8, 0 0 22px #00ffc8;
      animation: nxPulse 1.6s ease-in-out infinite;
    }
    #nexus-titlebar .nx-tb-name { color: #b8faff; }
    #nexus-titlebar .nx-tb-name b { color: #00ffff; text-shadow: 0 0 8px rgba(0,255,255,0.7); }
    #nexus-titlebar .nx-tb-tag { color: rgba(0,255,255,0.55); font-size: 10px; padding-left: 10px; border-left: 1px solid rgba(0,255,255,0.2); margin-left: 6px; }
    #nexus-titlebar .nx-tb-ctrls button {
      width: 34px; height: 26px; border: 1px solid rgba(0,255,255,0.15);
      background: rgba(0,255,255,0.04); color: #b8faff;
      border-radius: 6px; cursor: pointer; font-size: 12px;
      transition: all .2s ease;
      -webkit-app-region: no-drag; app-region: no-drag;
    }
    #nexus-titlebar .nx-tb-ctrls button:hover { background: rgba(0,255,255,0.14); border-color: #00ffff; box-shadow: 0 0 12px rgba(0,255,255,0.4); }
    #nexus-titlebar .nx-tb-ctrls .nx-close:hover { background: rgba(255,60,90,0.2); border-color: #ff3c5a; box-shadow: 0 0 12px rgba(255,60,90,0.5); color:#fff; }
    @keyframes nxPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.7} }

    /* Reveal briefly on load so user knows it's there */
    #nexus-titlebar.nx-intro { transform: translateY(0); opacity: 1; }

    /* --- Desktop-only feel: smoother, richer than the web build --- */
    html[data-nexus-desktop=true] * {
      transition-timing-function: cubic-bezier(.22,.9,.28,1) !important;
    }
    html[data-nexus-desktop=true] body {
      background-image:
        radial-gradient(1200px 600px at 12% -10%, rgba(0,255,255,0.06), transparent 60%),
        radial-gradient(900px 500px at 92% 110%, rgba(140,0,255,0.07), transparent 60%);
      background-attachment: fixed;
    }
    html[data-nexus-desktop=true] .glass-card,
    html[data-nexus-desktop=true] .glass,
    html[data-nexus-desktop=true] .glass-sidebar {
      backdrop-filter: blur(22px) saturate(160%) !important;
      -webkit-backdrop-filter: blur(22px) saturate(160%) !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,255,0.08) inset !important;
    }
    html[data-nexus-desktop=true] button, html[data-nexus-desktop=true] a[role=button] {
      transition: transform .18s, box-shadow .25s, background-color .2s, color .2s !important;
    }
    html[data-nexus-desktop=true] button:hover { transform: translateY(-1px); }
    html[data-nexus-desktop=true] ::-webkit-scrollbar { width: 10px; height: 10px; }
    html[data-nexus-desktop=true] ::-webkit-scrollbar-track { background: rgba(0,0,0,0.35); }
    html[data-nexus-desktop=true] ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(0,255,255,0.4), rgba(140,0,255,0.4));
      border-radius: 8px; box-shadow: 0 0 8px rgba(0,255,255,0.35);
    }

    /* Give room for the titlebar hover zone without pushing layout */
    html[data-nexus-desktop=true] body { padding-top: 6px; }
  \`;
  document.head.appendChild(css);

  // Intro reveal (3s) then auto-hide unless hovered
  bar.classList.add('nx-intro');
  setTimeout(() => bar.classList.remove('nx-intro'), 2800);
})();
`;

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: 'App', submenu: [
    { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
    { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'minimize' }, { role: 'close' },
    { type: 'separator' }, { role: 'quit' },
  ]},
  { label: 'Edit', submenu: [
    { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
    { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
  ]},
]));

app.whenReady().then(() => {
  createSplash();
  setTimeout(createMainWindow, 300);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash();
      setTimeout(createMainWindow, 300);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
