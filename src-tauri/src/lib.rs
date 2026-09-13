use tauri::{Manager, WebviewWindow};

/// Desktop-only enhancement layer injected into the remote app:
/// smoother transitions, richer glass, custom scrollbars and a
/// `desktop` marker class so the web app can adapt.
const DESKTOP_LAYER: &str = r#"
(function () {
  if (window.__edunovaDesktop) return;
  window.__edunovaDesktop = true;
  document.documentElement.classList.add('is-desktop-app', 'dark');
  var css = document.createElement('style');
  css.textContent = [
    'html.is-desktop-app { --desktop: 1; }',
    'html.is-desktop-app * { transition-duration: .22s; transition-timing-function: cubic-bezier(.22,1,.36,1); }',
    'html.is-desktop-app ::-webkit-scrollbar { width: 10px; height: 10px; }',
    'html.is-desktop-app ::-webkit-scrollbar-track { background: transparent; }',
    'html.is-desktop-app ::-webkit-scrollbar-thumb { background: hsl(var(--primary) / .35); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }',
    'html.is-desktop-app ::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / .6); background-clip: content-box; }',
    'html.is-desktop-app body { overscroll-behavior: none; }',
    'html.is-desktop-app img, html.is-desktop-app button { -webkit-user-drag: none; }',
    'html.is-desktop-app body::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 9999; background: radial-gradient(1200px 600px at 50% -10%, hsl(var(--primary) / .07), transparent 70%); }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);
  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    var editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (!editable) e.preventDefault();
  });
})();
"#;

/// Records startup failures and, if the app never mounts, replaces the
/// endless "Loading Edunova…" spinner with a readable recovery screen.
const BOOT_WATCHDOG: &str = r#"
(function () {
  if (window.__edunovaWatchdog) return;
  window.__edunovaWatchdog = true;
  var problems = [];
  function note(msg) { if (msg && problems.indexOf(msg) === -1) problems.push(String(msg).slice(0, 400)); }
  window.addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && e.target.tagName) {
      note('Failed to load ' + e.target.tagName.toLowerCase() + ': ' + (e.target.src || e.target.href || ''));
    } else {
      note((e && e.message) || 'Script error');
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    note('Unhandled: ' + ((e && e.reason && (e.reason.message || e.reason)) || 'unknown'));
  });

  function mounted() {
    var root = document.getElementById('root');
    if (!root) return false;
    if (document.getElementById('boot-fallback')) return false;
    return root.children.length > 0;
  }

  function show() {
    if (mounted() || document.getElementById('edunova-recovery')) return;
    var detail = problems.length ? problems.join('<br>') : 'The app scripts did not finish loading.';
    var wrap = document.createElement('div');
    wrap.id = 'edunova-recovery';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:#07080d;color:#e6f1ff;font-family:system-ui,sans-serif;padding:28px;text-align:center';
    wrap.innerHTML =
      '<div style="max-width:520px">' +
      '<h1 style="font-size:20px;margin:0 0 10px">Edunova could not finish loading</h1>' +
      '<p style="opacity:.7;font-size:13px;margin:0 0 14px">Check your internet connection, then try again.</p>' +
      '<div style="text-align:left;font:12px/1.5 ui-monospace,monospace;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:12px;max-height:180px;overflow:auto;opacity:.8">' + detail + '</div>' +
      '<div style="margin-top:16px;display:flex;gap:10px;justify-content:center">' +
      '<button id="edunova-retry" style="padding:10px 18px;border-radius:10px;border:0;background:#00d4aa;color:#02120e;font-weight:600;cursor:pointer">Try again</button>' +
      '<button id="edunova-reset" style="padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#e6f1ff;font-weight:600;cursor:pointer">Clear data &amp; reload</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    document.getElementById('edunova-retry').onclick = function () { location.reload(); };
    document.getElementById('edunova-reset').onclick = function () {
      try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
      location.replace('https://edunovamis.lovable.app/auth/login?desktop=1&t=' + Date.now());
    };
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (mounted()) { clearInterval(timer); return; }
    // Allow slow school networks and first-run webview caches enough time to
    // download and parse the web application before showing recovery controls.
    if (tries >= 60) { clearInterval(timer); show(); }
  }, 1000);
})();
"#;

#[tauri::command]
fn app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

fn reveal(main: &WebviewWindow, splash: Option<WebviewWindow>) {
    let _ = main.show();
    let _ = main.set_focus();
    if let Some(s) = splash {
        let _ = s.close();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![app_version])
        .on_page_load(|window, _payload| {
            let _ = window.eval(BOOT_WATCHDOG);
            let _ = window.eval(DESKTOP_LAYER);
        })
        .setup(|app| {
            let main = app.get_webview_window("main").expect("main window missing");
            let splash = app.get_webview_window("splash");

            let _ = main.eval(BOOT_WATCHDOG);
            let _ = main.eval(DESKTOP_LAYER);

            // Keep the splash visible until the remote app is usable, so
            // startup never shows a blank window.
            let main_for_thread = main.clone();
            let splash_for_thread = splash.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1800));
                reveal(&main_for_thread, splash_for_thread);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Edunova desktop");
}
