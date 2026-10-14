# Alpine Freeride v0.18.0 — Build verification

- JavaScript/MJS syntax checked with `node --check` across game, launcher scripts and multiplayer server.
- Local static game server returns HTTP 200 for the game, multiplayer client and config module on port 5208.
- Multiplayer server `/health` endpoint tested locally.
- Two real WebSocket clients tested: create room → join room → peer join broadcast → movement-state relay → ping/pong.
- Four-player room cap tested; fifth client receives the expected `That room is full (4/4).` error.
- Browser-client MultiplayerClient was imported and connected to the local server in a Node WebSocket smoke test.
- RemotePlayer character construction/interpolation was tested with mocked canvas texture support; the remote skier produced a visible finite pose/animation.
- Final ZIP integrity is checked after packaging.

Not claimed: full two-physical-PC internet gameplay testing. That requires deploying the backend and GitHub Pages build to public URLs.
