import * as THREE from 'three';

export const WEATHER_PRESETS = Object.freeze({
  clear: {
    id: 'clear', name: 'Clear Day', sky: 0x8fc3df, skyTop: 0x4e8fbd, skyHorizon: 0xd4e9f2, fog: 0xb8d2df, fogDensity: 0.00048,
    sun: 2.9, hemi: 1.25, exposure: 1.0, snow: 0, wind: 0.15, sunOffset:[-310,370,-170],
  },
  morning: {
    id:'morning',name:'Clear Morning',sky:0xa6cfe8,skyTop:0x578fb6,skyHorizon:0xe3edf1,fog:0xbfcfdb,fogDensity:0.0004,
    sun:3.2,hemi:1.25,exposure:1.0,snow:0,wind:0.12,sunColor:0xffe3bb,sunOffset:[-380,280,-160],
  },
  sunset: {
    id:'sunset',name:'Sunset',sky:0xb6a6bd,skyTop:0x667f9e,skyHorizon:0xf5c6a5,fog:0xd0b9b5,fogDensity:0.00055,
    sun:2.6,hemi:1.15,exposure:1.0,snow:0,wind:0.17,sunColor:0xffba7a,sunOffset:[-420,190,120],
  },
  overcast: {
    id: 'overcast', name: 'Overcast', sky: 0x9ba8b0, skyTop: 0x7c8b95, skyHorizon: 0xc5cdd1, fog: 0xb8c1c6, fogDensity: 0.00072,
    sun: 1.7, hemi: 1.35, exposure: 0.94, snow: 0, wind: 0.26,
  },
  snow: {
    id: 'snow', name: 'Snowfall', sky: 0x869ba8, skyTop: 0x6f8795, skyHorizon: 0xb9c7cd, fog: 0xaebdc5, fogDensity: 0.00118,
    sun: 1.25, hemi: 1.3, exposure: 0.91, snow: 0.58, wind: 0.45,
  },
  blizzard: {
    id: 'blizzard', name: 'Blizzard', sky: 0x6f7d84, skyTop: 0x59666c, skyHorizon: 0x9da7ab, fog: 0x9da7ab, fogDensity: 0.00235,
    sun: 0.72, hemi: 1.05, exposure: 0.82, snow: 1, wind: 1,
  },
  night: {
    id:'night', name:'Night', sky:0x07111f, skyTop:0x020711, skyHorizon:0x13283a, fog:0x0f1e2b, fogDensity:0.00072,
    sun:0.16, hemi:0.34, exposure:0.72, snow:0, wind:0.12, sunColor:0xa9c9ff, sunOffset:[-260,420,-180],
  },
});

const ORDER = ['morning','clear','sunset','overcast','snow','blizzard','night'];

export class WeatherSystem {
  constructor(scene, renderer, sun, hemi) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = sun;
    this.hemi = hemi;
    this.current = WEATHER_PRESETS.clear;
    this.qualityFactor = 1;
    this.time = 0;
    this.satelliteMode = false;
    this.renderDistance = 2600;
    this.fogDistanceScale = 1;
    this.maxFlakes = 900;
    this.positions = new Float32Array(this.maxFlakes * 3);
    this.seeds = new Float32Array(this.maxFlakes);
    this.center = new THREE.Vector3();

    // A lightweight gradient sky dome gives the mountain depth and a real
    // horizon without external HDR files. It follows the player, so the world
    // can be large without the camera ever reaching the sphere edge.
    this.skyUniforms = {
      topColor: { value: new THREE.Color(WEATHER_PRESETS.clear.skyTop) },
      horizonColor: { value: new THREE.Color(WEATHER_PRESETS.clear.skyHorizon) },
    };
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: `
        varying float vSkyY;
        void main() {
          vSkyY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying float vSkyY;
        void main() {
          float h = smoothstep(-0.08, 0.78, vSkyY);
          vec3 col = mix(horizonColor, topColor, h);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMaterial);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -100;
    scene.add(this.sky);

    // Lightweight star field used only by Night mode.
    const starCount = 320;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = 780;
      const s = Math.sqrt(1 - u * u);
      starPositions[i*3] = Math.cos(a) * s * r;
      starPositions[i*3+1] = Math.abs(u) * r * 0.92 + 120;
      starPositions[i*3+2] = Math.sin(a) * s * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color:0xdcecff, size:1.65, transparent:true, opacity:0.88, depthWrite:false, depthTest:false, sizeAttenuation:true }));
    this.stars.visible = true; this.stars.material.opacity = 0; this.stars.renderOrder = -90; this.stars.frustumCulled = false; scene.add(this.stars);

    for (let i = 0; i < this.maxFlakes; i += 1) {
      const j = i * 3;
      this.positions[j] = (Math.random() - 0.5) * 150;
      this.positions[j + 1] = Math.random() * 90;
      this.positions[j + 2] = (Math.random() - 0.5) * 150;
      this.seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.PointsMaterial({
      color: 0xf5fbff,
      size: 0.32,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.snow = new THREE.Points(geometry, material);
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 10;
    scene.add(this.snow);
    this.setPreset('clear');
  }

  applyAtmosphere() {
    const preset = this.current || WEATHER_PRESETS.clear;
    this.scene.background = new THREE.Color(preset.sky);
    this.skyUniforms.topColor.value.setHex(preset.skyTop ?? preset.sky);
    this.skyUniforms.horizonColor.value.setHex(preset.skyHorizon ?? preset.fog);
    if (this.scene.fog?.isFogExp2) {
      this.scene.fog.color.setHex(preset.fog);
      // Longer view-distance settings thin clear-air fog, but poor weather still
      // keeps its intended reduced visibility instead of becoming crystal clear.
      let fogScale = this.fogDistanceScale;
      if (preset.id === 'overcast') fogScale = Math.max(fogScale, 0.68);
      if (preset.id === 'snow') fogScale = Math.max(fogScale, 0.78);
      if (preset.id === 'blizzard') fogScale = Math.max(fogScale, 0.90);
      if (preset.id === 'night') fogScale = Math.max(fogScale, 0.60);
      this.scene.fog.density = this.satelliteMode ? 0 : preset.fogDensity * fogScale;
    }
    if (this.sky) this.sky.visible = !this.satelliteMode;
    if (this.stars) { this.stars.visible = !this.satelliteMode; this.stars.material.opacity = preset.id === 'night' ? 0.88 : 0; }
  }

  setPreset(id) {
    const preset = WEATHER_PRESETS[id] || WEATHER_PRESETS.clear;
    this.current = preset;
    this.applyAtmosphere();
    this.sun.intensity = preset.sun;
    this.sun.color.setHex(preset.sunColor||0xfff1d7);
    this.hemi.intensity = preset.hemi;
    this.renderer.toneMappingExposure = preset.exposure;
    this.snow.geometry.setDrawRange(0, Math.round(this.maxFlakes * preset.snow * this.qualityFactor));
    this.snow.material.opacity = preset.id === 'blizzard' ? 0.9 : 0.74;
    this.sky.material.transparent = false;
    return preset;
  }

  setSatelliteMode(enabled) {
    this.satelliteMode = Boolean(enabled);
    this.applyAtmosphere();
  }


  setRenderDistance(meters = 2600) {
    this.renderDistance = THREE.MathUtils.clamp(Number(meters) || 2600, 1800, 10000);
    this.fogDistanceScale = THREE.MathUtils.clamp(2600 / this.renderDistance, 0.30, 1.10);
    this.applyAtmosphere();
  }

  setQualityFactor(value) {
    this.qualityFactor = Math.max(0.25, Math.min(1, Number(value) || 1));
    this.snow.geometry.setDrawRange(0, Math.round(this.maxFlakes * this.current.snow * this.qualityFactor));
  }

  cycle() {
    const index = ORDER.indexOf(this.current.id);
    return this.setPreset(ORDER[(index + 1) % ORDER.length]);
  }

  update(dt, playerPosition) {
    if (!playerPosition) return;
    this.sky.position.copy(playerPosition);
    if (this.stars) this.stars.position.copy(playerPosition);
    if (!this.current.snow) return;
    this.time += dt;
    this.center.lerp(playerPosition, 1 - Math.exp(-3 * dt));
    const active = Math.round(this.maxFlakes * this.current.snow * this.qualityFactor);
    const wind = this.current.wind;
    for (let i = 0; i < active; i += 1) {
      const j = i * 3;
      let x = this.positions[j];
      let y = this.positions[j + 1];
      let z = this.positions[j + 2];
      const speed = 11 + this.seeds[i] * 17 + wind * 10;
      y -= speed * dt;
      x += (2.5 + this.seeds[i] * 4) * wind * dt;
      z += Math.sin(this.time * 1.7 + i * 0.37) * wind * dt * 2.2;

      if (y < this.center.y - 12) y = this.center.y + 72 + this.seeds[i] * 25;
      if (x < this.center.x - 78) x += 156;
      if (x > this.center.x + 78) x -= 156;
      if (z < this.center.z - 78) z += 156;
      if (z > this.center.z + 78) z -= 156;

      // Initial particles are local coordinates until first update; migrate them
      // around the player as soon as the preset becomes active.
      if (Math.abs(x - this.center.x) > 240 || Math.abs(z - this.center.z) > 240 || y < 0) {
        x = this.center.x + (this.seeds[i] - 0.5) * 150;
        y = this.center.y + this.seeds[(i * 17) % this.maxFlakes] * 85;
        z = this.center.z + (this.seeds[(i * 31) % this.maxFlakes] - 0.5) * 150;
      }
      this.positions[j] = x;
      this.positions[j + 1] = y;
      this.positions[j + 2] = z;
    }
    this.snow.geometry.attributes.position.needsUpdate = true;
  }
}
