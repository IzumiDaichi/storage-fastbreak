# Storage Fastbreak

Storage Fastbreak is a Windows desktop ledger app built with Electron and Next.js.

## Development

Install dependencies and start the web app:

```powershell
npm install
npm run dev
```

In another terminal, run the Electron shell:

```powershell
npm run electron
```

## Build a portable Windows executable

Build the x64 portable executable with:

```powershell
npm run dist:win:portable
```

The executable is written to `release/Storage Fastbreak-<version>-portable.exe`.
It bundles Electron and the production Next.js app. It starts its own local
production server, so a separate Node.js install or web server is not needed to
run the executable.

The portable app stores its data and authentication file in a
`storage-fastbreak-data` folder beside the executable. Keep this folder with the
executable to preserve the app's data.

### Google Drive configuration

Google OAuth settings are deliberately not bundled. To enable Google sign-in,
copy `.env.example` to `.env` beside the portable executable and fill in the
Google OAuth client ID and client secret configured for the app. Restart the
app after changing the file. The empty example values are placeholders; leaving
them empty causes Google sign-in to be rejected. Do not publish the configured
`.env` file.

## Application layout

- `src/app`: Next.js routes, root layout, and global styles.
- `src/features`: dashboard, transaction, and workspace features.
- `src/components`: shared UI and application-shell components.
- `src/context`: shared React state and providers.
- `src/lib`: shared calculation utilities.
- `src/types`: shared TypeScript and Electron API types.
- `main`: Electron main process, preload bridge, Google OAuth, and Drive sync.
