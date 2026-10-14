# Alpine Freeride Multiplayer Server

Small room server for Alpine Freeride v0.18.0. It carries only player state/cosmetics; terrain stays local in each browser.

- Node 20+ (no runtime dependencies)
- `npm start`
- uses `PORT` when provided by a host, otherwise port 8787
- WebSocket endpoint is the service root (`wss://your-service.example`)
- `/health` returns a small JSON health response

Rooms are private six-character codes and are capped at four players. No account or persistent player data is stored on the server.
