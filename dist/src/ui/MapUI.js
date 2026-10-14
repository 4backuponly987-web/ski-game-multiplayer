import * as THREE from 'three';
import { RUNS, SOUTH_RUNS, getRun, RESORT_CONNECTORS, runRange } from '../world/RunDefinitions.js';
import { HALF_WORLD } from '../world/terrainMath.js';
import { RESORT_LIFTS, RESORT_STATIONS, getStation } from '../world/ResortNetwork.js';

const MAP_WIDTH = 900;
const MAP_HEIGHT = 820;
const SVG_NS = 'http://www.w3.org/2000/svg';

const RUN_LABEL_LAYOUT = Object.freeze({
  flow:{t:.30,dx:54,dy:-18,anchor:'start'},
  glacier:{t:.20,dx:-58,dy:-16,anchor:'end'},
  velocity:{t:.54,dx:-66,dy:-4,anchor:'end'},
  avalanche:{t:.50,dx:-78,dy:8,anchor:'end'},
  pine:{t:.30,dx:62,dy:-10,anchor:'start'},
  woodland:{t:.58,dx:76,dy:2,anchor:'start'},
  park:{t:.23,dx:70,dy:-16,anchor:'start'},
  sunset:{t:.62,dx:76,dy:8,anchor:'start'},
  'south-aurora':{t:.70,dx:-58,dy:8,anchor:'end'},
  'south-talon':{t:.82,dx:-24,dy:-20,anchor:'end'},
  'south-meridian':{t:.60,dx:0,dy:28,anchor:'middle'},
  'south-cedar':{t:.46,dx:60,dy:20,anchor:'start'},
  'south-park':{t:.72,dx:66,dy:0,anchor:'start'},
  'south-raven':{t:.38,dx:84,dy:-4,anchor:'start'},
  'south-transition':{t:.26,dx:90,dy:-10,anchor:'start'},
});

function difficultyColor(run) {
  const difficulty = String(run?.difficulty || '').toUpperCase();
  if (difficulty === 'PARK') return '#c47cff';
  if (difficulty.includes('BLACK')) return '#f2f6f8';
  if (difficulty === 'RED') return '#ff5667';
  if (difficulty.includes('BLUE') && difficulty.includes('RED')) return '#62d49a';
  if (difficulty.includes('BLUE')) return '#43a9ff';
  return '#73efe5';
}

function esc(value='') {
  return String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function legendMarkup() {
  const rows = [
    ['#43a9ff', 'BLUE'], ['#ff5667', 'RED'], ['#f2f6f8', 'BLACK'],
    ['#62d49a', 'BLUE / RED'], ['#c47cff', 'PARK'], ['#58e2d9', 'TRANSITION'],
  ];
  return `<g class="map-key" transform="translate(24 26)">
    <rect x="0" y="0" width="188" height="222" rx="14" />
    <text x="16" y="25" class="map-key-title">PISTE KEY</text>
    ${rows.map(([color,label],i)=>`<line x1="16" y1="48" x2="48" y2="48" transform="translate(0 ${i*23})" stroke="${color}" stroke-width="8" stroke-linecap="round"/><text x="59" y="52" transform="translate(0 ${i*23})" class="map-key-text">${label}</text>`).join('')}
    <line x1="16" y1="188" x2="48" y2="188" stroke="#bfe9f7" stroke-width="3" stroke-dasharray="7 6"/><text x="59" y="192" class="map-key-text">LIFT</text>
    <circle cx="25" cy="210" r="5.5" fill="#eafaff" stroke="#1b6988" stroke-width="2"/><text x="59" y="214" class="map-key-text">STATION / WAYPOINT</text>
  </g>`;
}

export class MapUI {
  constructor(game) {
    this.game = game;
    this.root = document.querySelector('#mountain-map');
    this.svg = document.querySelector('#mountain-map-svg');
    this.player = null;
    this.destination = null;
    this.selectedWaypoint = null;
    this.visible = false;
    this.focusTransition = false;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.projectVec = new THREE.Vector3();
    this.satelliteNextUpdate = 0;

    this.satelliteSvg = document.createElementNS(SVG_NS, 'svg');
    this.satelliteSvg.setAttribute('id', 'satellite-map-overlay');
    this.satelliteSvg.setAttribute('aria-hidden', 'true');
    this.root?.prepend(this.satelliteSvg);

    document.querySelector('#close-map')?.addEventListener('click', () => this.game.toggleMap(false));
    this.svg?.addEventListener('click', (event) => this.onMapClick(event));
    this.game.canvas?.addEventListener('click', (event) => {
      if (this.visible) this.onSatelliteClick(event);
    });
    document.querySelector('#map-focus')?.addEventListener('click', () => {
      this.focusTransition = !this.focusTransition;
      document.querySelector('#map-focus').textContent = this.focusTransition ? 'WHOLE RESORT' : 'TRANSITION ZONE DETAIL';
      this.build();
    });

    this.worldWaypoint = this.createWorldWaypointMarker();
    this.build();
  }

  createWorldWaypointMarker() {
    const group = new THREE.Group();
    group.name = 'Waypoint world beacon';
    group.visible = false;
    const cyan = 0x65e6ff;
    const beamMat = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.5, 72, 12, 1, true), beamMat);
    beam.position.y = 36; group.add(beam);
    const ringMat = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.28, 8, 48), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.18; group.add(ring);
    const ring2 = ring.clone(); ring2.material = ringMat.clone(); ring2.material.opacity = 0.42; ring2.scale.setScalar(1.45); ring2.position.y = 0.22; group.add(ring2);
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, depthWrite: false }));
    diamond.position.y = 9.5; group.add(diamond);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
    label.position.y = 14.5; label.scale.set(22, 5.5, 1); group.add(label);
    group.userData = { beam, ring, ring2, diamond, canvas, texture, label, labelName: '' };
    this.game.scene.add(group);
    return group;
  }

  setWorldWaypointLabel(name) {
    const marker = this.worldWaypoint;
    if (!marker || marker.userData.labelName === name) return;
    const { canvas, texture } = marker.userData;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(5,20,30,.88)'; ctx.beginPath(); ctx.roundRect(16, 28, 992, 196, 40); ctx.fill();
    ctx.strokeStyle = '#7cecff'; ctx.lineWidth = 8; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.font = '800 62px Arial';
    ctx.fillText(String(name || 'WAYPOINT').toUpperCase(), 512, 108);
    ctx.fillStyle = '#94eaff'; ctx.font = '700 32px Arial'; ctx.fillText('SKI TO THE CYAN BEACON', 512, 174);
    texture.needsUpdate = true; marker.userData.labelName = name;
  }

  updateWorldWaypoint(position) {
    if (!this.worldWaypoint) return;
    const target = this.selectedWaypoint;
    if (!this.game.active || !target || !position) { this.worldWaypoint.visible = false; return; }
    this.worldWaypoint.visible = true; this.setWorldWaypointLabel(target.name);
    const ground = this.game.terrain.getHeight(target.x, target.z);
    this.worldWaypoint.position.set(target.x, ground + 0.05, target.z);
    const t = performance.now() * 0.001;
    this.worldWaypoint.userData.ring.scale.setScalar(1 + Math.sin(t * 3.1) * 0.09);
    this.worldWaypoint.userData.ring2.scale.setScalar(1.42 + Math.sin(t * 2.2 + 1.3) * 0.12);
    this.worldWaypoint.userData.diamond.rotation.y = t * 1.4;
    this.worldWaypoint.userData.diamond.position.y = 9.5 + Math.sin(t * 2.6) * 0.55;
    this.worldWaypoint.userData.beam.material.opacity = 0.13 + (Math.sin(t * 2.4) + 1) * 0.035;
  }

  worldToMap(x, z) {
    const minX = this.focusTransition ? -230 : -HALF_WORLD;
    const maxX = this.focusTransition ? 1050 : HALF_WORLD;
    const mapMinZ = this.focusTransition ? -3560 : -3700;
    const mapMaxZ = this.focusTransition ? -1440 : 3400;
    return [((x-minX)/(maxX-minX))*MAP_WIDTH, ((z-mapMinZ)/(mapMaxZ-mapMinZ))*(MAP_HEIGHT-70)+35];
  }

  pathFor(run) {
    const points = []; const range = runRange(run);
    for (let i = 0; i <= 90; i += 1) {
      const z = range.min + (range.max - range.min) * (i / 90);
      const [x, y] = this.worldToMap(run.centerAt(z), z);
      points.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  }

  runLabelData(run, project = null) {
    const layout = RUN_LABEL_LAYOUT[run.id] || { t: 0.5, dx: 0, dy: 0, anchor: 'middle' };
    const range = runRange(run);
    const z = range.min + (range.max - range.min) * layout.t;
    const x = run.centerAt(z);
    const base = project ? project(x, z) : (() => { const [mx, my] = this.worldToMap(x, z); return { x: mx, y: my }; })();
    const label = String(run.name || '').toUpperCase();
    const width = Math.max(88, label.length * 7.25 + 18);
    const height = 22;
    const cx = base.x + layout.dx;
    const cy = base.y + layout.dy;
    let boxX = cx - width / 2;
    if (layout.anchor === 'start') boxX = cx - 6;
    else if (layout.anchor === 'end') boxX = cx - width + 6;
    return { label, baseX: base.x, baseY: base.y, boxX, boxY: cy - height / 2, width, height, textX: cx, textY: cy + 3.5 };
  }

  runLabelMarkup(run, project = null, className = 'map-run-label-pill') {
    const d = this.runLabelData(run, project);
    return `<g class="${className}"><line x1="${d.baseX.toFixed(1)}" y1="${d.baseY.toFixed(1)}" x2="${(d.boxX + d.width/2).toFixed(1)}" y2="${(d.boxY + d.height/2).toFixed(1)}" class="map-run-label-line"/><rect x="${d.boxX.toFixed(1)}" y="${d.boxY.toFixed(1)}" width="${d.width.toFixed(1)}" height="${d.height.toFixed(1)}" rx="11"/><text x="${d.textX.toFixed(1)}" y="${d.textY.toFixed(1)}">${esc(d.label)}</text></g>`;
  }

  build() {
    if (!this.svg) return;
    const visibleRuns = [...RUNS.filter((run)=>run.id!=='wild'), ...SOUTH_RUNS];
    const runPaths = visibleRuns.map((run)=>`<g class="map-run"><path d="${this.pathFor(run)}" fill="none" stroke="#07131d" stroke-width="${run.difficulty==='PARK'?18:15}" stroke-linecap="round" opacity=".72"/><path d="${this.pathFor(run)}" fill="none" stroke="${difficultyColor(run)}" stroke-width="${run.difficulty==='PARK'?11:8}" stroke-linecap="round" opacity=".98"/><title>${esc(run.name)} · ${esc(run.difficulty)}</title></g>`).join('');
    const runLabels = visibleRuns.map((run)=>this.runLabelMarkup(run)).join('');
    const connectorPaths = RESORT_CONNECTORS.map((connector)=>{const d=connector.points.map((point,index)=>{const [x,y]=this.worldToMap(point.x,point.z);return `${index?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');return `<g class="map-connector"><path d="${d}" fill="none" stroke="#dff7ff" stroke-width="4.2" stroke-dasharray="3 5" opacity=".56"/></g>`;}).join('');
    const liftPaths = RESORT_LIFTS.filter((lift)=>lift.destinationRunId!=='wild').map((lift)=>{const from=getStation(lift.from),to=getStation(lift.to);const [x1,y1]=this.worldToMap(from.x,from.z),[x2,y2]=this.worldToMap(to.x,to.z);return `<g class="map-network-lift"><path d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="#bfe9f7" stroke-width="3.1" stroke-dasharray="7 6" opacity=".88"/></g>`;}).join('');
    const stationMarkers = RESORT_STATIONS.filter((station)=>station.id!=='wild-top').map((station)=>{const [x,y]=this.worldToMap(station.x,station.z);const r=station.kind==='base'?7.2:station.kind==='summit'?5.2:5.8;return `<g class="map-station map-clickable" data-waypoint-id="${station.id}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/></g>`;}).join('');

    this.svg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
    this.svg.innerHTML = `<rect x="8" y="8" width="884" height="804" rx="26" class="map-bg"/><path d="M22 115 L145 52 L275 94 L397 35 L520 94 L650 50 L790 100 L878 70 L888 370 L878 785 L22 785 Z" class="map-mountain"/>
      ${runPaths}${connectorPaths}${liftPaths}${stationMarkers}${runLabels}${legendMarkup()}
      <circle id="map-destination-dot" cx="0" cy="0" r="10" class="map-destination hidden"/><line id="map-waypoint-line" x1="0" y1="0" x2="0" y2="0" stroke="#fff" stroke-width="2" stroke-dasharray="4 6" class="hidden"/><g id="map-multiplayer-layer"></g><circle id="map-player-dot" cx="450" cy="120" r="8"/>`;
    this.player = this.svg.querySelector('#map-player-dot');
    this.multiplayerLayer = this.svg.querySelector('#map-multiplayer-layer');
    this.destination = this.svg.querySelector('#map-destination-dot');
    this.waypointLine = this.svg.querySelector('#map-waypoint-line');
  }

  onMapClick(event) {
    const target = event.target.closest?.('[data-waypoint-id]'); if (!target) return;
    const station = getStation(target.dataset.waypointId); if (!station) return;
    this.selectedWaypoint = station;
    this.setWorldWaypointLabel(station.name);
    this.game.hud.showMessage(`WAYPOINT · ${station.name.toUpperCase()}`, 1.5);
    this.update(this.game.physics.getState().position, true);
  }

  screenToWorld(clientX, clientY) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.ndc.set(((clientX-rect.left)/rect.width)*2-1, -((clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.ndc, this.game.camera);
    const point = new THREE.Vector3();
    let height = 200;
    for (let i = 0; i < 4; i += 1) {
      const plane = new THREE.Plane(new THREE.Vector3(0,1,0), -height);
      if (!this.raycaster.ray.intersectPlane(plane, point)) return null;
      height = this.game.terrain.getHeight(point.x, point.z);
    }
    if (Math.abs(point.x) > HALF_WORLD + 120 || point.z < -3900 || point.z > 3600) return null;
    point.y = this.game.terrain.getHeight(point.x, point.z);
    return point;
  }

  onSatelliteClick(event) {
    if (!this.visible) return;
    const point = this.screenToWorld(event.clientX, event.clientY); if (!point) return;
    this.selectedWaypoint = { id:'custom-satellite-marker', name:'CUSTOM MARKER', x:point.x, z:point.z, kind:'custom' };
    this.setWorldWaypointLabel('CUSTOM MARKER');
    this.game.hud.showMessage('SATELLITE MARKER SET · FOLLOW THE CYAN BEACON', 1.8);
    this.update(this.game.physics.getState().position, true);
  }

  projectWorld(x, z, lift = 5) {
    const y = this.game.terrain.getHeight(x, z) + lift;
    this.projectVec.set(x, y, z).project(this.game.camera);
    const w = window.innerWidth, h = window.innerHeight;
    return { x:(this.projectVec.x+1)*.5*w, y:(1-this.projectVec.y)*.5*h, depth:this.projectVec.z };
  }

  updateSatelliteOverlay(position, force = false) {
    if (!this.satelliteSvg || !this.visible) return;
    const now = performance.now();
    if (!force && now < this.satelliteNextUpdate) return;
    this.satelliteNextUpdate = now + 55;
    const w = window.innerWidth, h = window.innerHeight;
    this.satelliteSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const runs = [...RUNS.filter((run)=>run.id!=='wild'), ...SOUTH_RUNS];
    const runMarkup = runs.map((run)=>{
      const range = runRange(run), pts = [];
      for (let i = 0; i <= 34; i += 1) {
        const z = range.min + (range.max - range.min) * (i / 34);
        const p = this.projectWorld(run.centerAt(z), z, 7);
        pts.push(`${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      const color = difficultyColor(run);
      return `<g class="sat-run"><path class="sat-piste-outline" d="${pts.join(' ')}"/><path class="sat-piste" d="${pts.join(' ')}" stroke="${color}"/>${this.runLabelMarkup(run, (x,z)=>this.projectWorld(x,z,14), 'sat-run-label-pill')}</g>`;
    }).join('');
    const liftMarkup = RESORT_LIFTS.filter((l)=>l.destinationRunId!=='wild').map((lift)=>{const a=getStation(lift.from), b=getStation(lift.to), p1=this.projectWorld(a.x,a.z,16), p2=this.projectWorld(b.x,b.z,16);return `<path class="sat-lift" d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} L${p2.x.toFixed(1)},${p2.y.toFixed(1)}"/>`;}).join('');
    const stationMarkup = RESORT_STATIONS.filter((s)=>s.id!=='wild-top').map((s)=>{const p=this.projectWorld(s.x,s.z,20);return `<g class="sat-station"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5"/></g>`;}).join('');
    let playerMarkup = '';
    if (position) {
      const p = this.projectWorld(position.x, position.z, 20);
      playerMarkup = `<g class="sat-player"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/></g>`;
    }
    let multiplayerMarkup = '';
    const multiplayerPeers = this.game.multiplayer?.getRoster?.() || [];
    if (multiplayerPeers.length) multiplayerMarkup = multiplayerPeers.map((peer)=>{
      const remote=this.game.multiplayer.players.get(peer.id); const pos=remote?.ready?remote.state?.position:null; if(!pos)return '';
      const p=this.projectWorld(pos.x,pos.z,22); return `<g class="sat-multiplayer-player"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7"/><text x="${(p.x+10).toFixed(1)}" y="${(p.y-9).toFixed(1)}">${esc(peer.name)}</text></g>`;
    }).join('');
    let waypointMarkup = '';
    if (this.selectedWaypoint) {
      const p = this.projectWorld(this.selectedWaypoint.x, this.selectedWaypoint.z, 24);
      waypointMarkup = `<g class="sat-waypoint"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13"/><path d="M${p.x.toFixed(1)} ${(p.y-10).toFixed(1)} L${(p.x+8).toFixed(1)} ${p.y.toFixed(1)} L${p.x.toFixed(1)} ${(p.y+10).toFixed(1)} L${(p.x-8).toFixed(1)} ${p.y.toFixed(1)} Z"/></g>`;
    }
    const key = `<g class="sat-overlay-key" transform="translate(${Math.max(10,w-318)} 18)"><rect width="300" height="38" rx="10"/><text x="14" y="24">CLEAN PISTE MAP · CLICK TERRAIN = MARKER</text></g>`;
    this.satelliteSvg.innerHTML = `${runMarkup}${liftMarkup}${stationMarkup}${playerMarkup}${multiplayerMarkup}${waypointMarkup}${key}`;
  }

  getWaypointPrompt(position) {
    if (!this.selectedWaypoint || !position) return '';
    const dx = this.selectedWaypoint.x - position.x, dz = this.selectedWaypoint.z - position.z, distance = Math.hypot(dx, dz);
    if (distance < 24) return `DESTINATION REACHED · ${this.selectedWaypoint.name.toUpperCase()}`;
    return `WAYPOINT · ${this.selectedWaypoint.name.toUpperCase()} · ${Math.round(distance)} m · FOLLOW CYAN BEACON`;
  }

  refreshDiscoveries() {}

  setSatelliteWorldLabelsHidden(hidden) {
    this.game.scene.traverse((obj)=>{
      if (!obj.isSprite) return;
      if (hidden) {
        if (!Object.prototype.hasOwnProperty.call(obj.userData, 'satellitePrevVisible')) obj.userData.satellitePrevVisible = obj.visible;
        obj.visible = false;
      } else if (Object.prototype.hasOwnProperty.call(obj.userData, 'satellitePrevVisible')) {
        obj.visible = Boolean(obj.userData.satellitePrevVisible);
        delete obj.userData.satellitePrevVisible;
      }
    });
  }

  setSatellitePerformanceMode(enabled) {
    // The map needs terrain, pistes and lift lines—not thousands of individual
    // trees, moving chairs or snow particles. Temporarily hide those expensive
    // layers while the full 7 km resort is on screen, then restore them exactly.
    const objects = [
      ...(this.game.environment?.foliage || []),
      ...(this.game.dressing?.trees || []),
      ...((this.game.lift?.lifts || []).flatMap((lift)=>lift.carriers || [])),
      this.game.snowFX?.tracks,
      this.game.snowFX?.spray,
    ].filter(Boolean);
    for (const obj of objects) {
      if (enabled) {
        if (!Object.prototype.hasOwnProperty.call(obj.userData, 'satellitePerfPrevVisible')) obj.userData.satellitePerfPrevVisible = obj.visible;
        obj.visible = false;
      } else if (Object.prototype.hasOwnProperty.call(obj.userData, 'satellitePerfPrevVisible')) {
        obj.visible = Boolean(obj.userData.satellitePerfPrevVisible);
        delete obj.userData.satellitePerfPrevVisible;
      }
    }
  }

  show(show) {
    this.visible = Boolean(show);
    this.root?.classList.toggle('hidden', !this.visible);
    this.root?.classList.toggle('satellite-mode', this.visible);
    this.root?.setAttribute('aria-hidden', String(!this.visible));
    this.setSatelliteWorldLabelsHidden(this.visible);
    this.setSatellitePerformanceMode(this.visible);
    if (this.satelliteSvg) this.satelliteSvg.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.satelliteNextUpdate = 0;
  }

  update(position, force = false) {
    this.updateWorldWaypoint(position);
    if (!this.visible || !this.player || !position) return;
    const [x, y] = this.worldToMap(position.x, position.z);
    this.player.setAttribute('cx', x.toFixed(1));
    this.player.setAttribute('cy', y.toFixed(1));
    if (this.multiplayerLayer) {
      const peers=this.game.multiplayer?.getRoster?.()||[];
      this.multiplayerLayer.innerHTML=peers.map((peer)=>{const remote=this.game.multiplayer.players.get(peer.id);const pos=remote?.ready?remote.state?.position:null;if(!pos)return '';const [mx,my]=this.worldToMap(pos.x,pos.z);return `<circle class="map-multiplayer-player" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7"><title>${esc(peer.name)}</title></circle>`;}).join('');
    }
    const target = this.selectedWaypoint;
    if (target && this.destination) {
      const [dx, dy] = this.worldToMap(target.x, target.z);
      this.destination.setAttribute('cx', dx.toFixed(1));
      this.destination.setAttribute('cy', dy.toFixed(1));
      this.destination.classList.remove('hidden');
      this.waypointLine?.setAttribute('x1', x.toFixed(1));
      this.waypointLine?.setAttribute('y1', y.toFixed(1));
      this.waypointLine?.setAttribute('x2', dx.toFixed(1));
      this.waypointLine?.setAttribute('y2', dy.toFixed(1));
      this.waypointLine?.classList.remove('hidden');
    } else {
      this.destination?.classList.add('hidden');
      this.waypointLine?.classList.add('hidden');
    }
    this.updateSatelliteOverlay(position, force);
  }
}
