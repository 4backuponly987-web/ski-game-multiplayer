# Changelog

## v0.18.0 — Private Multiplayer
- Added optional private online multiplayer for up to four skiers.
- Added create/join room UI, six-character room codes, invite links, display names, ping display and reconnect handling.
- Added synchronized skier movement, orientation, speed, terrain state, switches, crashes, grabs, flips/spins, Daffy, spread eagle, nose butter, grinds, pole pushes, skis-on/off, transport pose, cosmetics and skier height.
- Added ~105 ms interpolation buffer for smooth remote motion while sending only ~12.5 state updates per second.
- Added low-detail remote characters, 3.6 km remote render culling and intentionally disabled player-to-player collisions to minimise lag.
- Added MEET UP teleport and multiplayer player markers on the resort map/satellite map.
- Added a dependency-free Node WebSocket room server with a four-player cap, validation, rate limiting, ping/pong keepalive and temporary in-memory rooms.
- Added GitHub Pages Actions deployment and Render server configuration/setup instructions.
- Retains v0.17.37 render-distance settings and moderately increased wipeout thresholds.
