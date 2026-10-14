import { CUSTOMIZATION_CATALOG, BATTLE_PASS_TIERS } from '../systems/SaveSystem.js';
import { RUNS,SOUTH_RUNS,TRANSITION_RUN } from '../world/RunDefinitions.js';

const controlsMarkup = `
  <p class="eyebrow">CONTROLS</p>
  <h2>Keyboard & mouse</h2>
  <div class="control-grid">
    <div class="control-row"><strong>A / D</strong><span>Carve left / right · in air: A anticlockwise / D clockwise spin</span></div>
    <div class="control-row"><strong>W</strong><span>Ground: load the ski tips into a nose-butter stance; add A/D to pivot · in air: front flip</span></div>
    <div class="control-row"><strong>S (hold)</strong><span>Ground: pizza / snowplough brake only while held · release S to stop braking · in air: back flip</span></div>
    <div class="control-row"><strong>Ctrl</strong><span>Alternative brake / snowplough</span></div>
    <div class="control-row"><strong>Shift</strong><span>Take skis off / put skis back on — on the ground or in mid-air</span></div>
    <div class="control-row"><strong>Space</strong><span>Jump · pop off a rail · while riding a lift: skip safely to the destination</span></div>
    <div class="control-row"><strong>Left mouse</strong><span>Grounded: left-pole push · airborne: left-hand analogue grab; mouse right = Method, mouse left = Stiffy, mouse forward = Nose tweak, mouse back = Tail tweak</span></div>
    <div class="control-row"><strong>Right mouse</strong><span>Grounded: right-pole push · airborne: right-hand analogue grab; mouse right = Method variation, mouse left = Crossbone, mouse forward = Nose tweak, mouse back = Tail tweak</span></div>
    <div class="control-row"><strong>Both mouse buttons</strong><span>Grounded: double-pole push · airborne: two-hand grab with reduced tweak range</span></div>
    <div class="control-row"><strong>← / → in air</strong><span>Small lateral corrections for transfers; A/D still spins</span></div>
    <div class="control-row"><strong>Q in air</strong><span>Cross skis · hold a mouse grab at the same time to grab the front of the left/right ski · while sideways grinding: front-facing ski off rail</span></div>
    <div class="control-row"><strong>E</strong><span>On snow: hold to sit on your skis · in air: Daffy · while sideways grinding: back-facing ski off rail</span></div>
    <div class="control-row"><strong>F in air</strong><span>Spread Eagle / spread-flight posture</span></div>
    <div class="control-row"><strong>X on rail</strong><span>Right Ski grind variation</span></div>
    <div class="control-row"><strong>Z / J / V / B / G / H</strong><span>Legacy named grabs: Mute, Safety, Tail, Nose, Japan, Stalefish</span></div>
    <div class="control-row"><strong>T / Y</strong><span>Set / return to session marker</span></div>
    <div class="control-row"><strong>M</strong><span>Satellite map: real top-down resort view; mouse wheel zooms in/out; press M again to return</span></div>
    <div class="control-row"><strong>O</strong><span>Cycle morning, day, sunset, overcast, snow, blizzard and Night mode</span></div>
    <div class="control-row"><strong>L</strong><span>Board a chairlift / gondola when you are in the loading zone</span></div>
    <div class="control-row"><strong>Lift</strong><span>Follow the labelled blue lane and gate · L manually boards · Space skips ride · R remains an emergency safe exit while you are on the lift</span></div>
    <div class="control-row"><strong>N</strong><span>Mute / unmute generated ski, wind, grind and lift audio</span></div>
    <div class="control-row"><strong>C</strong><span>Normal skiing: third / first person · while grinding: Split-Side Slide</span></div>
    <div class="control-row"><strong>R</strong><span>During a lift ride: guaranteed emergency recovery</span></div>
    <div class="control-row"><strong>F9</strong><span>Open the automatic replay editor for the most recent 45 seconds. Scrub, trim, change speed and switch replay cameras.</span></div>
    <div class="control-row"><strong>Esc</strong><span>Pause · closes the replay editor when it is open</span></div>
  </div>
  <p>In the air, grab with either mouse button and move horizontally to select/tweak Method, Stiffy or Crossbone-style poses; two-hand grabs have a deliberately smaller tweak range. Press E for a Daffy. On snow, W loads the ski tips and A/D pivots the nose butter; S brakes only while held. Chairlift cables can also be ground if you reach them. On rails, hold A/D to rotate into a boardslide; Q/E lift the front/back-facing ski once sideways; C enters the Split-Side Slide on any grind. Ctrl centres the skis. Excessive rotation eventually loses balance.</p>
`;

const skipediaMarkup = `
  <p class="eyebrow">SKIPEDIA</p>
  <h2>Trick guide</h2>
  <p>Every move is scored only when you physically perform it and land. Link tricks quickly to keep your line alive and build the multiplier up to 5.0×.</p>
  <div class="skipedia-grid">
    <section><h3>Spins + switch</h3><p><strong>A</strong> in the air = anticlockwise spin. <strong>D</strong> = clockwise. 180 / 540 / 900 land you <strong>switch</strong> and you keep skiing backwards; even 360 / 720 spins return to normal stance.</p></section>
    <section><h3>Flips</h3><p><strong>W</strong> in the air = front flip. <strong>S</strong> = back flip. Combine a flip with a spin and grab for bigger scores.</p></section>
    <section><h3>Mouse grabs</h3><p><strong>Left click</strong> = left-hand grab; move right for <strong>Method</strong>, left for <strong>Stiffy</strong>. <strong>Right click</strong> = right-hand grab; move right for a Method variation, left for <strong>Crossbone</strong>. Hold both for a two-handed grab with a smaller tweak range.</p></section>
    <section><h3>Analogue tweaks</h3><p>Keep the grab held and <strong>move the mouse</strong>. Horizontal movement chooses the directional grab style and controls tweak intensity; vertical movement adjusts the contact/extension. The pose is smoothed and clamped rather than snapping instantly.</p></section>
    <section><h3>Daffy + classic airs</h3><p><strong>E</strong> while airborne performs a <strong>Daffy</strong>: one ski scissors forward while the other moves back, with the legs and upper body counterbalancing. <strong>F</strong> = Spread Eagle and <strong>Q</strong> = crossed skis. Named grabs remain on Z/J/V/B/G/H.</p></section>
    <section><h3>Nose butter + braking</h3><p>Hold <strong>W</strong> to lean forward and load the ski tips; add <strong>A/D</strong> to pivot the nose butter. <strong>S</strong> brakes on snow. There is no separate nose-manual/tail-manual ground mode.</p></section>
    <section><h3>50-50</h3><p>Land on a rail and keep the controls neutral. Clean, stable and good for starting a line.</p></section>
    <section><h3>FS / BS rail slide</h3><p>While grinding, hold <strong>A/D</strong> for about 0.9 seconds to turn 90° into a boardslide. Release to hold the angle, or use <strong>Ctrl</strong> to centre it. Incoming air rotation is retained. Rails can also be ridden in reverse and switch.</p></section>
    <section><h3>Nose / tail press</h3><p>While grinding hold <strong>W</strong> for Nose Press or <strong>S</strong> for Tail Press.</p></section>
    <section><h3>Rail variations</h3><p>While sideways on a rail, <strong>Q</strong> moves the front-facing ski off and <strong>E</strong> moves the back-facing ski off. <strong>C</strong> performs the Split-Side Slide on any grind. Z/X still provide the original left/right single-ski grinds.</p></section>
    <section><h3>Session marker</h3><p>Press <strong>T</strong> before a feature. Press <strong>Y</strong> after a crash or bad attempt to drop straight back in.</p></section>
    <section><h3>On foot</h3><p>Press <strong>Shift</strong> to take your skis off on the ground or in mid-air. On foot use <strong>W/S</strong> to walk and <strong>A/D</strong> to turn. Press Shift again to put the skis back on.</p></section>
    <section><h3>Landings</h3><p>Finish rotations before touchdown. Sideways spin landings bail, and flips must come back upright: landing head-first or clearly under-rotated now causes a bail instead of snapping upright.</p></section>
    <section><h3>Audio</h3><p>Wind, ski hiss, grinding, landings and the lift are generated in the browser. Press <strong>N</strong> to mute or unmute.</p></section>
  </div>
`;

const aboutMarkup = `
  <p class="eyebrow">BUILD INFO</p>
  <h2>Settings & build info · v0.18.0</h2>
  <p>This build keeps Alpine Freeride as one navigable resort while cleaning up progression and menus: eight named pistes, unmarked off-piste terrain, Transition Mountain, a labelled lift network, base village start and clickable map waypoints.</p>
  <h3>Major changes</h3><p>v0.17.20 expands the second mountain with many more visible piste kickers and rails, adds a dedicated South Transition slope with halfpipes/quarterpipes/spines, simplifies ground controls to W nose butter and S brake, strengthens rail audio, and keeps the seated ski glide as a context-sensitive E control.</p>
  <ul>
    <li>Eight named pistes plus Transition Mountain share one continuous resort; the old Wild Bowl piste presentation has been retired and its western basin is now unmarked off-piste terrain.</li>
    <li>Snow tracks and dynamic carve/brake/powder spray make skiing leave visible feedback on the mountain.</li>
    <li>Morning, day, sunset, overcast, snowfall, blizzard and Night presets change light, fog, visibility and piste lighting.</li>
    <li>A live coordinate-based map shows the named piste paths, groomed connectors, marked lift routes, stations and player waypoints.</li>
    <li>Normal play now starts in Base Village; fast travel is optional rather than the primary way to reach runs.</li>
  </ul>
  <p>Freestyle, analogue grabs, switch skiing, grinds, session markers, walking, customisation, lifts, challenges and credits remain integrated, with extra grab modifiers and seated-ski behaviour refinements.</p>
`

const creditsMarkup = `
  <p class="eyebrow">CREDITS</p>
  <h2>Built for the browser</h2>
  <p><strong>ALPINE FREERIDE</strong> uses original project code and procedural game geometry.</p>
  <ul>
    <li><strong>Three.js</strong> — 3D rendering library, MIT License.</li>
    <li><strong>Vite</strong> — development and production build tooling, MIT License.</li>
  </ul>
`;

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[char]));
}

export class MenuUI {
  constructor(game) {
    this.game = game;
    this.main = document.querySelector('#main-menu');
    this.pause = document.querySelector('#pause-menu');
    this.modal = document.querySelector('#info-modal');
    this.modalContent = document.querySelector('#modal-content');

    document.querySelector('#play-button').addEventListener('click', () => this.game.start());
    document.querySelector('#run-select-button').addEventListener('click', () => this.openRunSelect());
    document.querySelector('#customize-button').addEventListener('click', () => this.openCustomization());
    document.querySelector('#multiplayer-button')?.addEventListener('click', () => this.openMultiplayer());
    document.querySelector('#battle-pass-button').addEventListener('click', () => this.openBattlePass());
    document.querySelector('#challenges-button').addEventListener('click', () => this.openChallenges());
    document.querySelector('#replay-button').addEventListener('click', () => this.game.openReplayEditor());
    document.querySelector('#settings-button').addEventListener('click', () => this.openSettings());

    document.querySelector('#close-modal').addEventListener('click', () => this.closeModal());
    document.querySelector('#resume-button').addEventListener('click', () => this.game.resume());
    document.querySelector('#restart-button').addEventListener('click', () => {
      this.game.resetPlayer('RUN RESTARTED');
      this.game.resume();
    });
    document.querySelector('#return-menu-button').addEventListener('click', () => this.game.returnToMenu());

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.closeModal();
    });

    this.modalContent.addEventListener('click', (event) => this.handleModalClick(event));
  }

  showMain(show) {
    this.main.classList.toggle('hidden', !show);
  }

  showPause(show) {
    this.pause.classList.toggle('hidden', !show);
    this.pause.setAttribute('aria-hidden', String(!show));
  }

  openModal(markup) {
    this.modalContent.innerHTML = markup;
    this.modal.classList.remove('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  openRunSelect() {
    const cards = [...RUNS.filter((run) => run.id !== 'wild'),...SOUTH_RUNS,TRANSITION_RUN].map((run) => `
      <button class="run-card" data-run-id="${run.id}">
        <span class="run-dot" style="--run-color:#${run.color.toString(16).padStart(6, '0')}"></span>
        <span><strong>${escapeHtml(run.name)}</strong><small>${escapeHtml(run.difficulty)} · ${escapeHtml(run.description)}</small></span>
      </button>
    `).join('');
    this.openModal(`
      <p class="eyebrow">DROP IN</p>
      <h2>Choose a run</h2>
      <p>Fast travel is optional. Normal play starts in Base Village: follow signs and ride the lift network across both main mountains plus Transition Mountain.</p>
      <div class="run-grid">${cards}<button class="run-card lift-card" data-lift-base="true"><span class="run-dot" style="--run-color:#7fe4ff"></span><span><strong>Nearest Lift Base</strong><small>Fast-travel to the loading area for the lift serving your currently selected run. In normal play, ski there through the connected resort.</small></span></button></div>
    `);
  }



  openMultiplayer(message = '') {
    const mp = this.game.multiplayer;
    if (!mp) return;
    const server = escapeHtml(mp.getServerUrl() || '');
    const name = escapeHtml(mp.playerName || '');
    const inviteRoom = escapeHtml(mp.getRoomFromUrl() || '');
    if (mp.connected) {
      const peers = mp.getRoster();
      const ping = Number.isFinite(mp.pingMs) ? `${mp.pingMs} ms` : 'measuring…';
      const roster = [`<div class="mp-player mp-you"><span><b>${escapeHtml(mp.playerName)}</b><small>YOU</small></span><em>LOCAL</em></div>`, ...peers.map((p) => `<div class="mp-player"><span><b>${escapeHtml(p.name)}</b><small>${p.ready ? `${Math.round(p.distance || 0)} m away` : 'joining mountain…'}</small></span><button data-mp-teleport="${escapeHtml(p.id)}" ${p.ready ? '' : 'disabled'}>MEET UP</button></div>`)].join('');
      this.openModal(`<div data-multiplayer-panel><p class="eyebrow">MULTIPLAYER · ONLINE</p><h2>Room ${escapeHtml(mp.roomCode)}</h2><p>Private room · ${mp.playerCount}/4 skiers · ${ping}. Your mountain still runs locally; only skier state is networked.</p>${message ? `<p class="mp-feedback">${escapeHtml(message)}</p>` : ''}<div class="mp-room-code">${escapeHtml(mp.roomCode)}</div><div class="mp-actions"><button class="primary" data-mp-copy>Copy invite link</button><button data-mp-start>Start / resume ride</button><button data-mp-leave>Leave room</button></div><h3>Skiers</h3><div class="mp-roster">${roster}</div><p class="mp-note">MEET UP places you safely on the snow beside that skier. Player collisions are intentionally disabled to keep multiplayer smooth.</p></div>`);
      return;
    }
    const status = mp.status === 'connecting' ? 'Connecting…' : mp.status === 'reconnecting' ? 'Reconnecting…' : '';
    this.openModal(`<div data-multiplayer-panel><p class="eyebrow">MULTIPLAYER · PRIVATE LOBBIES</p><h2>Ski together</h2><p>Create a room and send your friend the six-character code or invite link. Up to four players can share the resort.</p>${message || status ? `<p class="mp-feedback">${escapeHtml(message || status)}</p>` : ''}<label class="mp-field"><span>Display name</span><input id="mp-name" maxlength="18" value="${name}" placeholder="Skier name" /></label><label class="mp-field"><span>Multiplayer server</span><input id="mp-server" value="${server}" placeholder="wss://your-multiplayer-server.example" spellcheck="false" /></label><div class="mp-actions"><button class="primary" data-mp-create>Create room</button></div><div class="mp-divider"><span>OR JOIN</span></div><label class="mp-field"><span>Room code</span><input id="mp-room" maxlength="6" value="${inviteRoom}" placeholder="SKI482" autocomplete="off" /></label><div class="mp-actions"><button data-mp-join>Join room</button></div><p class="mp-note">The server URL only handles room messages. Terrain, lifts, snow and physics stay on each player's browser, so multiplayer traffic stays small.</p></div>`);
  }

  refreshMultiplayer(message = '') {
    if (this.modalContent?.querySelector('[data-multiplayer-panel]')) this.openMultiplayer(message);
  }

  openWeather() {
    const current = this.game.weather.current.id;
    const cards = Object.values(WEATHER_PRESETS).map((preset) => `<button class="weather-option ${current === preset.id ? 'active' : ''}" data-weather-id="${preset.id}"><strong>${escapeHtml(preset.name)}</strong><small>${preset.id === 'morning' ? 'Cool snow, low sun and long morning shadows.' : preset.id === 'sunset' ? 'Warm alpine light with clear visibility.' : preset.id === 'clear' ? 'Long visibility and crisp shadows.' : preset.id === 'overcast' ? 'Soft grey light and lower contrast.' : preset.id === 'snow' ? 'Falling snow with reduced visibility.' : 'Heavy snow, short visibility and strong wind.'}</small></button>`).join('');
    this.openModal(`<p class="eyebrow">MOUNTAIN WEATHER</p><h2>Choose conditions</h2><p>Weather changes lighting, fog, visibility and snowfall. Press O while skiing to cycle quickly.</p><div class="weather-grid">${cards}</div>`);
  }

  openSettings() {
    const current = this.game.graphicsQuality || 'high';
    const options = [
      ['low', 'Low', 'Lower resolution, no real-time shadows and fewer weather particles.'],
      ['medium', 'Medium', 'Balanced resolution, 1024px shadows and moderate particles.'],
      ['high', 'High', 'Sharper rendering, 2048px shadows and full atmospheric particles.'],
      ['ultra', 'Ultra', 'Maximum browser pixel ratio and full effects for capable gaming PCs.'],
    ];
    const cards = options.map(([id, name, description]) => `<button class="weather-option ${current === id ? 'active' : ''}" data-graphics-id="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    const renderCurrent=this.game.renderDistance||'far';
    const renderOptions=[['near','Near · 2.6 km','Best FPS. Nearby mountain detail only.'],['balanced','Balanced · 4.2 km','Good visibility with conservative distant detail.'],['far','Far · 6.2 km','Recommended. Opposite mountain stays visible with lightweight distant detail.'],['resort','Resort-wide · 9.0 km','Maximum terrain visibility; distant scenery still uses aggressive LOD.']];
    const renderCards=renderOptions.map(([id,name,description])=>`<button class="weather-option ${renderCurrent===id?'active':''}" data-render-distance="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    const cameraEffects = Number(this.game.save.getSetting('cameraEffects', 1));
    const motion = [
      ['0', 'Camera motion off', 'Disables first-person bob and almost all landing shake.'],
      ['0.5', 'Reduced camera motion', 'Gentler first-person head movement and impacts.'],
      ['1', 'Full camera motion', 'Default speed/bump feedback with comfort-limited crash shake.'],
    ].map(([id, name, description]) => `<button class="weather-option ${Math.abs(cameraEffects - Number(id)) < 0.01 ? 'active' : ''}" data-camera-effects="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    const skierHeight = Math.max(165, Math.min(195, Number(this.game.save.getSetting('skierHeightCm', 180)) || 180));
    this.openModal(`
      <p class="eyebrow">SETTINGS</p>
      <h2>Game settings</h2>
      <p>Everything non-essential now lives here: graphics, controls, credits and build info. Weather no longer has its own menu — press <strong>O</strong> in-game to cycle it.</p>
      <h3>Graphics quality</h3>
      <div class="weather-grid">${cards}</div>
      <h3>Render distance</h3>
      <p>Terrain can stay visible across the resort while expensive trees, buildings and moving lift carriers use shorter detail ranges to protect FPS.</p>
      <div class="weather-grid">${renderCards}</div>
      <h3>Camera effects</h3>
      <div class="weather-grid">${motion}</div>
      <h3>Skier height</h3>
      <div class="height-setting">
        <input id="skier-height-slider" type="range" min="165" max="195" step="1" value="${skierHeight}" aria-label="Skier height in centimetres" />
        <strong id="skier-height-value">${Math.round(skierHeight)} cm</strong>
        <small>Visual height only — ski physics and equipment size stay consistent.</small>
      </div>
      <section class="settings-controls">${controlsMarkup}</section>
      <h3>Build info</h3>
      <p><strong>ALPINE FREERIDE v0.18.0</strong> — faster quarterpipe spins/flips, easier switch landings, normal pipe camera distance, and a completely reorganised stadium-style Transition park with calibrated gap landings.</p>
      <h3>Credits</h3>
      <p><strong>Three.js</strong> for rendering · <strong>Vite</strong> for build tooling · original Alpine Freeride project code and procedural geometry.</p>
    `);
    const heightSlider=this.modalContent.querySelector('#skier-height-slider');
    const heightValue=this.modalContent.querySelector('#skier-height-value');
    heightSlider?.addEventListener('input',()=>{
      const cm=this.game.setSkierHeight(Number(heightSlider.value));
      if(heightValue)heightValue.textContent=`${Math.round(cm)} cm`;
    });
  }

  openGraphics() {
    const current = this.game.graphicsQuality || 'high';
    const options = [
      ['low', 'Low', 'Lower resolution, no real-time shadows and fewer weather particles.'],
      ['medium', 'Medium', 'Balanced resolution, 1024px shadows and moderate particles.'],
      ['high', 'High', 'Sharper rendering, 2048px shadows and full atmospheric particles.'],
      ['ultra', 'Ultra', 'Maximum browser pixel ratio and full effects for capable gaming PCs.'],
    ];
    const cards = options.map(([id, name, description]) => `<button class="weather-option ${current === id ? 'active' : ''}" data-graphics-id="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    const renderCurrent=this.game.renderDistance||'far';
    const renderOptions=[['near','Near · 2.6 km','Best FPS.'],['balanced','Balanced · 4.2 km','Good all-round visibility.'],['far','Far · 6.2 km','Recommended for seeing across the valley.'],['resort','Resort-wide · 9.0 km','Maximum terrain visibility.']];
    const renderCards=renderOptions.map(([id,name,description])=>`<button class="weather-option ${renderCurrent===id?'active':''}" data-render-distance="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    const cameraEffects = Number(this.game.save.getSetting('cameraEffects', 1));
    const motion = [
      ['0', 'Camera motion off', 'Disables first-person bob and almost all landing shake.'],
      ['0.5', 'Reduced camera motion', 'Gentler first-person head movement and impacts.'],
      ['1', 'Full camera motion', 'Default speed/bump feedback with comfort-limited crash shake.'],
    ].map(([id, name, description]) => `<button class="weather-option ${Math.abs(cameraEffects - Number(id)) < 0.01 ? 'active' : ''}" data-camera-effects="${id}"><strong>${name}</strong><small>${description}</small></button>`).join('');
    this.openModal(`<p class="eyebrow">GRAPHICS & CAMERA</p><h2>Performance preset</h2><p>Changes apply immediately and save on this browser.</p><div class="weather-grid">${cards}</div><h3>Render distance</h3><div class="weather-grid">${renderCards}</div><h3>Camera effects</h3><div class="weather-grid">${motion}</div>`);
  }

  openChallenges() {
    const list = this.game.challenges.getList();
    const difficultyOrder = ['ELITE', 'EXPERT', 'HARD', 'STANDARD'];
    const completed = list.filter((c) => c.complete).length;
    const formatProgress = (challenge) => {
      if (challenge.complete) return 'COMPLETED';
      const value = challenge.unit === '×' ? challenge.progress.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : Math.round(challenge.progress).toLocaleString();
      const goal = challenge.unit === '×' ? Number(challenge.goal).toFixed(1) : Number(challenge.goal).toLocaleString();
      return `${value} / ${goal}${challenge.unit ? ` ${challenge.unit}` : ''}`;
    };
    const card = (challenge) => `
      <div class="challenge-card ${challenge.complete ? 'complete' : ''} challenge-${String(challenge.difficulty || 'standard').toLowerCase()}">
        <div>
          <span class="challenge-meta"><b>${escapeHtml(challenge.difficulty || 'STANDARD')}</b><em>${escapeHtml(challenge.category || 'MOUNTAIN')}</em></span>
          <strong>${escapeHtml(challenge.name)}</strong>
          <small>${escapeHtml(challenge.description)}</small>
        </div>
        <div class="challenge-reward">${challenge.complete ? '✓' : `+${challenge.reward.toLocaleString()} C`}<small>${formatProgress(challenge)}</small></div>
      </div>`;
    const sections = difficultyOrder.map((difficulty) => {
      const challenges = list
        .filter((challenge) => challenge.difficulty === difficulty)
        .sort((a, b) => (a.complete !== b.complete ? (a.complete ? 1 : -1) : b.reward - a.reward));
      if (!challenges.length) return '';
      const done = challenges.filter((challenge) => challenge.complete).length;
      const descriptions = {
        ELITE: 'The hardest goals in the game: huge rotations, long powder missions, massive lines and high-risk style combinations.',
        EXPERT: 'Serious progression targets that require consistency rather than a lucky first attempt.',
        HARD: 'A meaningful step above the basic milestones. These should take deliberate runs to complete.',
        STANDARD: 'Foundation challenges that teach the mountain and core freestyle systems.',
      };
      return `<section class="challenge-difficulty-section challenge-section-${difficulty.toLowerCase()}">
        <div class="challenge-difficulty-heading"><div><span>${difficulty}</span><strong>${challenges.length} CHALLENGES</strong></div><small>${done}/${challenges.length} complete · ${descriptions[difficulty]}</small></div>
        <div class="challenge-grid">${challenges.map(card).join('')}</div>
      </section>`;
    }).join('');
    const elite = list.filter((c) => c.difficulty === 'ELITE');
    const expert = list.filter((c) => c.difficulty === 'EXPERT');
    this.openModal(`
      <div class="challenge-heading challenge-heading-expanded">
        <div><p class="eyebrow">MOUNTAIN CHALLENGES</p><h2>Difficulty ladder</h2><p>Races and timed freestyle events are gone. Progress now comes from skiing, exploration and progressively harder freestyle goals.</p></div>
        <div class="challenge-stats"><strong>${completed}/${list.length}</strong><span>COMPLETE</span><b>${elite.filter((c) => !c.complete).length}</b><span>ELITE LEFT</span><b>${expert.filter((c) => !c.complete).length}</b><span>EXPERT LEFT</span></div>
      </div>
      <div class="challenge-difficulty-legend"><span class="legend-elite">ELITE</span><span class="legend-expert">EXPERT</span><span class="legend-hard">HARD</span><span class="legend-standard">STANDARD</span></div>
      ${sections}
    `);
  }

  openBattlePass() {
    const save = this.game.save;
    const state = save.getBattlePassState();
    const claimed = new Set(state.claimed);
    const claimable = BATTLE_PASS_TIERS.filter((entry) => state.xp >= entry.requiredXP && !claimed.has(entry.tier));
    const milestoneTiers = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    const maxTier = BATTLE_PASS_TIERS.length;
    const rewardGlyph = (reward) => {
      if (reward.type === 'credits') return 'C';
      if (reward.category === 'skis') return 'SKI';
      if (reward.category === 'pants') return 'PNT';
      if (reward.category === 'jacket') return 'JKT';
      if (reward.category === 'helmet') return 'HLM';
      if (reward.category === 'goggles') return 'GGL';
      if (reward.category === 'gloves') return 'GLV';
      return 'GEAR';
    };
    const cards = BATTLE_PASS_TIERS.map((entry) => {
      const unlocked = state.xp >= entry.requiredXP;
      const isClaimed = claimed.has(entry.tier);
      const status = isClaimed ? 'CLAIMED' : unlocked ? 'READY' : `${entry.requiredXP.toLocaleString()} XP`;
      const milestone = milestoneTiers.has(entry.tier) ? ' milestone' : '';
      const legend = entry.tier > 40 ? ' legend-tier' : entry.tier > 30 ? ' summit-tier' : '';
      return `<button class="pass-tier ${unlocked ? 'unlocked' : 'locked'} ${isClaimed ? 'claimed' : ''}${milestone}${legend}" data-pass-tier="${entry.tier}" ${isClaimed || !unlocked ? 'disabled' : ''}>
        <span class="pass-tier-number">${entry.tier}</span>
        <span class="pass-reward-icon">${rewardGlyph(entry.reward)}</span>
        <span class="pass-reward-copy"><strong>${escapeHtml(entry.reward.name)}</strong><small>${status}</small></span>
        ${milestoneTiers.has(entry.tier) ? '<i class="pass-milestone">MILESTONE</i>' : ''}
      </button>`;
    }).join('');
    const next = BATTLE_PASS_TIERS[Math.min(BATTLE_PASS_TIERS.length - 1, state.tier)];
    const nextText = state.tier >= maxTier ? 'PASS COMPLETE' : `${state.xp.toLocaleString()} / ${next.requiredXP.toLocaleString()} XP`;
    const nextReward = BATTLE_PASS_TIERS.find((entry) => entry.requiredXP > state.xp && !claimed.has(entry.tier));
    const chapter = state.tier <= 10 ? 'BASE CAMP' : state.tier <= 20 ? 'RIDGE' : state.tier <= 30 ? 'EXPERT' : state.tier <= 40 ? 'SUMMIT' : 'LEGEND';
    this.openModal(`
      <section class="pass-hero pass-hero-expanded">
        <div>
          <p class="eyebrow">FREE PASS · 50 TIERS · NO PREMIUM TRACK</p>
          <h2>Mountain Pass</h2>
          <p>Five chapters now run from Base Camp to Legend. Tiers 41–50 are a full extra endgame chapter with ten visible equipment rewards rather than filler currency.</p>
        </div>
        <div class="pass-rank"><span>${chapter}</span><strong>${state.tier}</strong><small>${state.xp.toLocaleString()} XP</small></div>
      </section>
      <div class="pass-summary pass-summary-upgraded">
        <strong>${state.tier >= maxTier ? 'ALL TIERS UNLOCKED' : `TIER ${state.tier} → ${Math.min(maxTier, state.tier + 1)}`}</strong>
        <span>${nextText}</span>
        <div class="pass-progress"><i style="width:${Math.round(state.progress * 100)}%"></i></div>
        <small>${nextReward ? `NEXT REWARD · ${escapeHtml(nextReward.reward.name)}` : 'EVERY REWARD UNLOCKED'}</small>
      </div>
      <div class="pass-actions">
        <button class="primary" data-pass-claim-all ${claimable.length ? '' : 'disabled'}>CLAIM ALL UNLOCKED (${claimable.length})</button>
        <span>${claimed.size}/${maxTier} claimed</span>
      </div>
      <p id="pass-feedback" class="shop-feedback"></p>
      <div class="pass-chapters pass-chapters-five"><span>BASE CAMP · 1–10</span><span>RIDGE · 11–20</span><span>EXPERT · 21–30</span><span>SUMMIT · 31–40</span><span>LEGEND · 41–50</span></div>
      <div class="pass-track"><div class="pass-grid">${cards}</div></div>
    `);
  }

  openCustomization() {
    const save = this.game.save;
    const categoryNames = {
      skin: 'Skin tone', helmet: 'Helmet', jacket: 'Jacket', pants: 'Trousers', skis: 'Skis', goggles: 'Goggles', gloves: 'Gloves',
    };
    const sections = Object.entries(CUSTOMIZATION_CATALOG).map(([category, items]) => {
      const itemCards = items.map((item) => {
        const unlocked = save.isUnlocked(category, item.id);
        const equipped = save.data.equipped[category] === item.id;
        const levelLocked = Boolean(item.levelReq && save.getLevel() < item.levelReq);
        const action = equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : item.passTier ? `FREE PASS TIER ${item.passTier}` : levelLocked ? `LVL ${item.levelReq} · ${item.price} C` : `${item.price} C`;
        return `
          <button class="gear-item ${equipped ? 'equipped' : ''} ${levelLocked ? 'level-locked' : ''}" data-gear-category="${category}" data-gear-id="${item.id}" ${equipped ? 'disabled' : ''}>
            <span class="swatch" style="--swatch:${item.color}"></span>
            <span><strong>${escapeHtml(item.name)}</strong><small>${item.style || item.profile ? `${escapeHtml(String(item.style || item.profile))} · ` : ''}${action}</small></span>
          </button>
        `;
      }).join('');
      return `<section class="gear-section"><h3>${categoryNames[category]}</h3><div class="gear-grid">${itemCards}</div></section>`;
    }).join('');

    this.openModal(`
      <div class="shop-heading">
        <div><p class="eyebrow">LOCKER</p><h2>Customise skier</h2></div>
        <div class="credit-pill"><strong>${save.getCredits()}</strong><span>CREDITS · LVL ${save.getLevel()}</span></div>
      </div>
      <p>Skin tones are always available. Discoveries, challenges and landed trick lines award credits and XP; higher levels unlock specialist gear.</p>
      <p id="shop-feedback" class="shop-feedback"></p><div class="gear-scroll">${sections}</div>
    `);
  }

  handleModalClick(event) {
    const mpTeleport = event.target.closest('[data-mp-teleport]');
    if (mpTeleport) { this.game.multiplayer?.teleportTo(mpTeleport.dataset.mpTeleport); this.closeModal(); return; }
    if (event.target.closest('[data-mp-start]')) { this.closeModal(); this.game.start(); return; }
    if (event.target.closest('[data-mp-leave]')) { this.game.multiplayer?.leave(true); this.openMultiplayer('Left the multiplayer room.'); return; }
    if (event.target.closest('[data-mp-copy]')) {
      const link=this.game.multiplayer?.inviteUrl?.()||'';
      if(link) navigator.clipboard?.writeText(link).then(()=>this.refreshMultiplayer('Invite link copied.')).catch(()=>this.refreshMultiplayer('Copy failed — room code is shown above.'));
      return;
    }
    const mpCreate = event.target.closest('[data-mp-create]');
    const mpJoin = event.target.closest('[data-mp-join]');
    if (mpCreate || mpJoin) {
      const name=this.modalContent.querySelector('#mp-name')?.value||''; const server=this.modalContent.querySelector('#mp-server')?.value||''; const room=(this.modalContent.querySelector('#mp-room')?.value||'').trim().toUpperCase();
      const action=mpCreate?this.game.multiplayer?.createRoom(name,server):this.game.multiplayer?.joinRoom(room,name,server);
      Promise.resolve(action).catch((error)=>this.refreshMultiplayer(error?.message||'Could not connect.'));
      this.refreshMultiplayer('Connecting…'); return;
    }
    const claimAll = event.target.closest('[data-pass-claim-all]');
    if (claimAll) {
      const state = this.game.save.getBattlePassState();
      let claimedCount = 0;
      for (const entry of BATTLE_PASS_TIERS) {
        if (state.xp < entry.requiredXP || state.claimed.includes(entry.tier)) continue;
        const result = this.game.save.claimBattlePassTier(entry.tier);
        if (result.ok) claimedCount += 1;
      }
      this.game.applySavedLoadout();
      this.game.hud.updateCredits(this.game.save.getCredits());
      this.game.hud.updateProgress(this.game.save);
      this.openBattlePass();
      const feedback = this.modalContent.querySelector('#pass-feedback');
      if (feedback && claimedCount) feedback.textContent = `${claimedCount} reward${claimedCount === 1 ? '' : 's'} claimed.`;
      return;
    }
    const passButton = event.target.closest('[data-pass-tier]');
    if (passButton) {
      const result = this.game.save.claimBattlePassTier(Number(passButton.dataset.passTier));
      const feedback = this.modalContent.querySelector('#pass-feedback');
      if (!result.ok) { if (feedback) feedback.textContent = result.reason; return; }
      this.game.applySavedLoadout();
      this.game.hud.updateCredits(this.game.save.getCredits());
      this.game.hud.updateProgress(this.game.save);
      this.openBattlePass();
      return;
    }

    const graphicsButton = event.target.closest('[data-graphics-id]');
    if (graphicsButton) {
      this.game.setGraphicsQuality(graphicsButton.dataset.graphicsId);
      this.openSettings();
      return;
    }

    const renderDistanceButton = event.target.closest('[data-render-distance]');
    if (renderDistanceButton) {
      this.game.setRenderDistance(renderDistanceButton.dataset.renderDistance);
      this.openSettings();
      return;
    }

    const cameraButton = event.target.closest('[data-camera-effects]');
    if (cameraButton) {
      this.game.setCameraEffects(Number(cameraButton.dataset.cameraEffects));
      this.openSettings();
      return;
    }
    const liftButton = event.target.closest('[data-lift-base]');
    if (liftButton) {
      this.closeModal();
      this.game.goToLiftBase();
      return;
    }

    const runButton = event.target.closest('[data-run-id]');
    if (runButton) {
      const id = runButton.dataset.runId;
      this.closeModal();
      this.game.startRun(id);
      return;
    }

    const gearButton = event.target.closest('[data-gear-category][data-gear-id]');
    if (gearButton) {
      const result = this.game.save.buyOrEquip(gearButton.dataset.gearCategory, gearButton.dataset.gearId);
      if (!result.ok) {
        const feedback = this.modalContent.querySelector('#shop-feedback');
        if (feedback) feedback.textContent = result.reason;
        return;
      }
      this.game.applySavedLoadout();
      this.game.hud.updateCredits(this.game.save.getCredits());
      this.openCustomization();
    }
  }
}
