// Bubble Studio desktop shell: serves the static web build from a private app:// origin
// and keeps itself up to date from GitHub Releases.
const { app, BrowserWindow, Menu, ipcMain, protocol, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const { autoUpdater } = require("electron-updater");

const WEB_ROOT = path.join(__dirname, "web");

/** Small log in the user data folder (Help: %APPDATA%/Bubble Studio/logs/main.log) for update troubleshooting. */
function log(...parts) {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "main.log"), `${new Date().toISOString()} ${parts.join(" ")}
`);
  } catch {
    // Logging must never break the app.
  }
}
const ORIGIN = "app://bubble";

// A standard, secure scheme gives the page a stable origin, so localStorage and IndexedDB
// (phrases, auto-save) persist between launches, and fetch/streaming work like on the web.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Map an app:// URL to a file inside the web build, refusing anything outside it. */
function resolveFile(url) {
  let rel = decodeURIComponent(new URL(url).pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(WEB_ROOT, rel));
  if (!file.startsWith(WEB_ROOT)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  if (!path.extname(file) && fs.existsSync(`${file}.html`)) return `${file}.html`;
  return null;
}

/** Serve a file, honouring Range requests so audio and video can seek. */
function serve(request) {
  const file = resolveFile(request.url);
  if (!file) {
    const notFound = path.join(WEB_ROOT, "404.html");
    return new Response(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found", {
      status: 404,
      headers: { "content-type": TYPES[".html"] },
    });
  }
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
      status: 206,
      headers: {
        "content-type": type,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
      },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), {
    status: 200,
    headers: { "content-type": type, "content-length": String(size), "accept-ranges": "bytes" },
  });
}

let win = null;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    title: "Bubble Studio",
    backgroundColor: "#ebecf0",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win.show());

  // Keep the window on the app; any outside link opens in the user's browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:/.test(url)) void shell.openExternal(url);
    }
  });

  // Exports use the normal download path, which Electron turns into a native Save As dialog.
  win.loadURL(`${ORIGIN}/`);
}

/* ------------------------------------------------------------------ updates */

function setupUpdates() {
  autoUpdater.logger = { info: (m) => log("[updater]", m), warn: (m) => log("[updater] warn", m), error: (m) => log("[updater] error", m), debug: () => {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => send("update:status", { state: "checking" }));
  autoUpdater.on("update-available", (info) => send("update:status", { state: "available", version: info.version }));
  autoUpdater.on("update-not-available", (info) => send("update:status", { state: "none", version: info.version }));
  autoUpdater.on("download-progress", (p) => send("update:status", { state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => send("update:status", { state: "ready", version: info.version }));
  autoUpdater.on("error", (err) => send("update:status", { state: "error", message: String(err?.message ?? err) }));

  const check = () => {
    if (!app.isPackaged) {
      send("update:status", { state: "dev" });
      return;
    }
    autoUpdater.checkForUpdates().catch(() => {});
  };

  ipcMain.handle("update:check", () => check());
  ipcMain.handle("update:install", (event) => {
    log("install requested by", event.senderFrame?.url ?? "unknown");
    // Silent install, then reopen the app: an update shouldn't walk the user through the setup wizard again.
    autoUpdater.quitAndInstall(true, true);
  });
  ipcMain.handle("app:version", () => app.getVersion());

  // Check shortly after launch, then every four hours while the app stays open.
  setTimeout(check, 5000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

/* --------------------------------------------------------------- lifecycle */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle("app", serve);
    createWindow();
    setupUpdates();
  });

  app.on("window-all-closed", () => {
    log("all windows closed, quitting");
    app.quit();
  });
  app.on("before-quit", () => log("before-quit"));
  app.on("render-process-gone", (_e, _w, d) => log("renderer gone", d.reason));
}
