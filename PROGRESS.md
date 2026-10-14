# Alpine Freeride v0.18.0 progress

Private multiplayer is implemented as an optional layer over the existing single-player game. The static game remains GitHub-Pages-compatible; only the small room relay server requires a live backend.

Implemented and statically/integration tested: room creation/joining, 4-player cap, state relay, ping/pong, profile sync, remote character interpolation, remote animation, reconnect path, map markers, meet-up teleport and deployment files.

Still requires real-world two-PC playtesting after the backend is deployed, especially for internet latency, chairlift visual alignment and long-session reconnect behaviour.
