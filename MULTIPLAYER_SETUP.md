# Alpine Freeride v0.18.0 — Multiplayer setup

Alpine Freeride stays a static game on GitHub Pages. The small server in `multiplayer-server/` only relays player movement/profile data; every browser renders the mountain locally.

## Publish the game on GitHub Pages

1. Put the **contents of this folder** in your GitHub repository and push/commit them to `main`.
2. Open the repository on GitHub → **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The included `.github/workflows/pages.yml` publishes the existing `dist/` folder, so you do not need Node or Vite on your own PC.
5. Wait for the `Deploy Alpine Freeride to GitHub Pages` workflow to finish.

## Put the multiplayer server online

### Render (easy option)
1. Sign in to Render and connect the same GitHub repository.
2. Create a **Web Service**. If you use the repository's `render.yaml` Blueprint, the important settings are already supplied. For a manual Web Service use:
   - Root directory: `multiplayer-server`
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/health`
3. Deploy it and copy its public HTTPS address, for example `https://your-service.onrender.com`.
4. For the game, use the WebSocket form of the same address: `wss://your-service.onrender.com`.

## Connect the game to the server

You have two choices:

**Quickest:** open **MULTIPLAYER** in Alpine Freeride and paste the `wss://...` address into **Multiplayer server**. The browser remembers it. Invite links also carry the server address, so your friend can follow the same link.

**Cleaner permanent setup:** edit `dist/multiplayer-config.js` and set:

```js
window.ALPINE_MULTIPLAYER_CONFIG = { serverUrl: 'wss://your-service.onrender.com' };
```

Commit that change. From then on everyone opening your GitHub Pages game gets the server automatically.

## Play with a friend

1. Open your GitHub Pages game.
2. Choose **MULTIPLAYER → CREATE ROOM**.
3. Enter a display name.
4. Press **Copy invite link** and send it to your friend.
5. Your friend opens the link, enters a name and presses **JOIN ROOM**.
6. Both press **START / RESUME RIDE**.
7. Open MULTIPLAYER again and press **MEET UP** beside your friend's name if you are on opposite sides of the resort.

## What is synchronized

- Position, direction and speed.
- Ground/air state, switch skiing, crashes and landings.
- Spins/flips, grabs, Daffy, spread eagle, nose butter, rail/grind poses and pole pushes.
- Skis on/off, current cosmetics and skier height.
- Lift/transport pose and world position.
- Names, room status and approximate ping.
- Friend markers on the normal/satellite resort map.

## Performance design

- Private rooms are capped at **4 players**.
- Player state is sent at about **12.5 updates/second**, not every render frame.
- Remote movement is buffered by about **105 ms** and interpolated between packets to reduce jitter.
- Remote skiers use low-detail character settings and are not rendered beyond roughly **3.6 km**, while their network position still exists for the map/meet-up system.
- Player-to-player collision physics are intentionally disabled; each player's own snow/terrain physics remain local.
- Terrain, trees, buildings, snow particles and lift geometry are never sent over the network.
- The room server has keepalive pings and the client attempts reconnects with backoff after a temporary connection loss.

## Local network test (optional)

The normal game launcher uses port **5208**. The multiplayer server uses **8787**. If Node is available, run `npm start` inside `multiplayer-server/`; the locally launched game automatically points at `ws://127.0.0.1:8787`.

## Current multiplayer limitation

The server keeps rooms in memory rather than a database. That is ideal for small private sessions, but if the server is restarted the room code disappears and everyone creates/joins a new room. Keep the backend to one server instance unless the room state is later moved to shared storage.
