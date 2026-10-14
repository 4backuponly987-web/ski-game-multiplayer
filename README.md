# Alpine Freeride v0.18.0 — Private Multiplayer

This build adds optional private online multiplayer while retaining the v0.17.37 render-distance, performance, snow-contact and crash-tuning work.

## Launch
Close older Alpine Freeride command windows, extract this ZIP to a new folder, and double-click `RUN_GAME.cmd`.
This build uses localhost port **5208**.


## Multiplayer
- Private 2–4 player browser rooms with six-character codes and shareable invite links.
- Remote skier interpolation at ~105 ms with about 12.5 network updates per second.
- Cosmetics, height, tricks, crashes, skis-on/off and transport pose are synchronized.
- Friend markers appear on the resort map and MEET UP safely moves you beside a friend.
- Player collision is intentionally disabled to protect physics stability and latency.
- GitHub Pages deployment workflow and a tiny dependency-free Node WebSocket server are included.
- See `MULTIPLAYER_SETUP.md` for deployment.

## Existing handling / contact fixes
- HARD IMPACT thresholds remain **23.0 m/s** on ordinary terrain and **31.0 m/s** on steep landings.
- Stable gameplay FOV, swept terrain checks and deep-penetration snow recovery remain enabled.
- Render distance remains selectable from 2.6 km to 9.0 km with distant-detail culling.

## Performance changes
- Removed the deferred SceneDetail pass that accidentally captured animated skier meshes and could hide them later.
- Character meshes are protected from frustum-culling glitches and the live skier root is forced visible.
- Terrain render mesh uses fewer chunks / lower transition render tessellation while physics keeps full analytic precision.
- Graphics quality no longer rebuilds hundreds of terrain chunks.
- Reduced decorative tree density while keeping the resort, collision system and forests intact.
- Tree shadows are Ultra-only; High keeps core shadows at a cheaper 1024 map.
- Lift traffic is distance-culled, reduced in count, and updated at 24 Hz instead of every rendered frame.
- Physics step changed from 120 Hz to 90 Hz to lower CPU cost without changing controls.
- Replay capture reduced from 20 Hz to 15 Hz.
- Snow spray and ski-track pools reduced and track expiry work is throttled.
- Race gates and the ski-jump venue are built only when those activities are actually started.
- JS/CSS/vendor files now use browser cache within this build; HTML remains no-cache. New versions use a new port to avoid stale code.
- Module preload begins fetching Three.js and the game graph while the loading screen is visible.

## Night-mode spike fix
Night used to flip 16 PointLights in/out of the active lighting graph and force `material.needsUpdate` on every piste material. That triggered large WebGL shader recompiles. v0.18.0 keeps only two non-shadowing local lights in the shader graph at all times (zero intensity by day), changes emissive intensity as uniforms, and uses a no-allocation nearest-two search.

## Character invisibility fix
v0.17.31 deferred SceneDetail construction until after the skier existed. SceneDetail stored the skier's original world-space bounds as if the skier were static and later hid those meshes when the player moved away. That system is no longer instantiated, and the skier's animated meshes have frustum culling disabled.

## Automatic smoothness
On first launch of this build, old High/Ultra saves are migrated once to **Medium** because earlier versions defaulted everyone to expensive realtime shadows. High and Ultra remain selectable in Settings. During play the renderer also uses a slow adaptive-resolution scaler: if sustained frame time rises, internal render resolution steps down slightly; when performance recovers it steps back up.

## Extra runtime work removed
- Lift carriers now share geometry per lift instead of rebuilding identical chair/gondola geometry for every carrier.
- Lift boarding status is calculated once per frame instead of three times.
- Challenge progress sampling runs at 15 Hz rather than every physics substep.
- HUD text only mutates the DOM when displayed values actually change.
- Satellite mode temporarily hides tree instance pools, lift carriers and snow particles while the full resort is viewed from above.
- The main terrain shader is now `MeshStandardMaterial` instead of the heavier physical clearcoat shader, and unused terrain UV/finish vertex attributes were removed.
