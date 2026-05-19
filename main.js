// ─────────────────────────────────────────────────────────────
// main.js — Electron main process
// ─────────────────────────────────────────────────────────────

const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs   = require('fs')

// ── Read .env.local manually ──────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.warn('.env.local not found — Supabase will not connect.')
    return {}
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  const env   = {}
  lines.forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  })
  return env
}

const env = loadEnv()

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Storage FastBreak',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Pass env vars to renderer via global window object
      additionalArguments: [
        `--SUPABASE_URL=${env.SUPABASE_URL || ''}`,
        `--SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY || ''}`
      ]
    }
  })

  win.loadFile('renderer/index.html')
  win.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})