# Ghost n Post — Chrome extension

Manifest V3 companion for Phase 3.

## Install (local)

1. Sign in to the web app → **Extension** → create an API token.
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked**.
3. Select this `extension/` folder.
4. Open extension **Options**, set:
   - API base URL (e.g. `http://localhost:3010` — must match the running app)
   - API token (`gnp_…`)

For production, set API base URL to your deployed origin
(e.g. `https://your-app.vercel.app`).

## Usage

- On a YouTube watch page, click the toolbar popup → **Generate now** or **Open in app**.
- Or use the on-page **Ghost n Post** button near the video actions.

Generate uses `POST /api/generate` with the bearer token. Without a token, the extension deep-links into the web app with `?url=`.
