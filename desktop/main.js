// Bubble Studio desktop shell: serves the static web build from a private app:// origin
// and keeps itself up to date from GitHub Releases.
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, session, shell } = require("electron");
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

// Developers and tests can run a copy with its own data folder, separate from the installed app.
if (process.env.BUBBLE_STUDIO_USER_DATA) app.setPath("userData", process.env.BUBBLE_STUDIO_USER_DATA);

const IS_MAC = process.platform === "darwin";
const RELEASES_URL = "https://github.com/harindujayakody/bubble-studio/releases/latest";

/* ----------------------------------------------------------------- settings */

// Desktop-only preferences, kept as a small JSON file in the user data folder.
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function readSettings() {
  try {
    return { downloadDir: null, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) };
  } catch {
    return { downloadDir: null };
  }
}

function writeSettings(next) {
  const merged = { ...readSettings(), ...next };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(merged, null, 2));
  return merged;
}

/** A path in `dir` that doesn't overwrite an existing file: name.ext, name (2).ext, ... */
function uniquePath(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = path.join(dir, filename);
  for (let n = 2; fs.existsSync(candidate); n++) candidate = path.join(dir, `${base} (${n})${ext}`);
  return candidate;
}

/** Files this session saved, so "Show in folder" only ever reveals our own exports. */
const savedFiles = new Set();

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

  win.loadURL(`${ORIGIN}/`);
}

/* ------------------------------------------------------------------ updates */

function setupUpdates() {
  autoUpdater.logger = { info: (m) => log("[updater]", m), warn: (m) => log("[updater] warn", m), error: (m) => log("[updater] error", m), debug: () => {} };
  // macOS only lets Developer ID-signed apps replace themselves, so the Mac build points the
  // user at the download instead of installing; Windows downloads and installs on its own.
  autoUpdater.autoDownload = !IS_MAC;
  autoUpdater.autoInstallOnAppQuit = !IS_MAC;

  autoUpdater.on("checking-for-update", () => send("update:status", { state: "checking" }));
  autoUpdater.on("update-available", (info) =>
    send("update:status", { state: IS_MAC ? "manual" : "available", version: info.version }),
  );
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
  ipcMain.handle("update:openDownload", () => shell.openExternal(RELEASES_URL));

  // Check shortly after launch, then every four hours while the app stays open.
  setTimeout(check, 5000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

/* ---------------------------------------------------- downloads and storage */

function setupDownloads() {
  // Exports arrive as normal downloads. With a default folder they save there straight away
  // (never overwriting); otherwise Electron shows the native Save As dialog.
  session.defaultSession.on("will-download", (_event, item) => {
    const dir = readSettings().downloadDir;
    if (dir && fs.existsSync(dir)) item.setSavePath(uniquePath(dir, item.getFilename()));
    item.once("done", (_e, state) => {
      if (state !== "completed") return;
      const saved = item.getSavePath();
      savedFiles.add(saved);
      log("saved", saved);
      send("download:done", { path: saved, name: path.basename(saved), folder: path.dirname(saved) });
    });
  });

  ipcMain.handle("settings:get", () => ({ ...readSettings(), platform: process.platform }));
  ipcMain.handle("settings:chooseDownloadDir", async () => {
    const current = readSettings().downloadDir;
    const result = await dialog.showOpenDialog(win, {
      title: "Choose where exports are saved",
      defaultPath: current ?? app.getPath("downloads"),
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return readSettings();
    return writeSettings({ downloadDir: result.filePaths[0] });
  });
  ipcMain.handle("settings:clearDownloadDir", () => writeSettings({ downloadDir: null }));
  ipcMain.handle("shell:showItem", (_e, file) => {
    if (typeof file === "string" && savedFiles.has(file)) shell.showItemInFolder(file);
  });
  ipcMain.handle("shell:openFolder", () => {
    const dir = readSettings().downloadDir;
    if (dir && fs.existsSync(dir)) void shell.openPath(dir);
  });

  // Cache: the browser cache plus any update installers already downloaded.
  ipcMain.handle("storage:clearCache", async () => {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({});
    let updates = 0;
    const dirs = [path.join(app.getPath("userData"), "..", "..", "Local", "bubble-studio-updater")];
    if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, "bubble-studio-updater"));
    if (IS_MAC) dirs.push(path.join(app.getPath("home"), "Library", "Caches", "bubble-studio-updater"));
    for (const dir of new Set(dirs)) {
      const pending = path.join(dir, "pending");
      if (fs.existsSync(pending)) {
        for (const f of fs.readdirSync(pending)) updates += fs.statSync(path.join(pending, f)).size;
        fs.rmSync(pending, { recursive: true, force: true });
      }
    }
    log("cache cleared");
    return { updates };
  });

  // Reset: wipe everything the app stored (saved post, phrases, preferences) and reload.
  ipcMain.handle("storage:resetAll", async () => {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
    writeSettings({ downloadDir: null });
    log("all data reset");
    win?.webContents.reload();
  });
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
    // Windows: no menu bar. macOS: the standard app, edit and window menus, which also give
    // the usual shortcuts (copy, paste, undo in text fields, hide, quit).
    Menu.setApplicationMenu(
      IS_MAC
        ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "windowMenu" }])
        : null,
    );
    protocol.handle("app", serve);
    setupDownloads();
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
