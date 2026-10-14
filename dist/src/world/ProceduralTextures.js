import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function configure(texture, repeatX, repeatY = repeatX, colorSpace = true) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

let cachedSnow=null,cachedCompact=null,cachedRock=null;
export function createSnowTextures() {
  if(cachedSnow)return cachedSnow;
  const size=256,rand=mulberry32(19843);
  const colorCanvas=makeCanvas(size),bumpCanvas=makeCanvas(size),roughCanvas=makeCanvas(size);
  const contexts=[colorCanvas,bumpCanvas,roughCanvas].map(c=>c.getContext('2d'));
  const images=contexts.map(c=>c.createImageData(size,size));
  // Periodic, isotropic value noise. No directional ribs, scratches or UV stripes.
  const grids=[8,32,128].map(n=>({n,v:Array.from({length:n*n},()=>rand())}));
  const noise=(grid,x,y)=>{const n=grid.n,px=x/size*n,py=y/size*n,ix=Math.floor(px),iy=Math.floor(py);let a=px-ix,b=py-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);const at=(xx,yy)=>grid.v[(yy%n)*n+xx%n];return (at(ix,iy)*(1-a)+at(ix+1,iy)*a)*(1-b)+(at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a)*b;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const broad=noise(grids[0],x,y)-.5,fine=noise(grids[1],x,y)-.5,micro=noise(grids[2],x,y)-.5,index=(y*size+x)*4;
    const values=[247+broad*4+fine*2,128+broad*12+fine*15+micro*13,236+broad*8+micro*6];
    images.forEach((im,k)=>{im.data[index]=im.data[index+1]=im.data[index+2]=values[k];im.data[index+3]=255;});
  }
  contexts.forEach((c,i)=>c.putImageData(images[i],0,0));
  return cachedSnow={map:configure(new THREE.CanvasTexture(colorCanvas),1,1,true),bumpMap:configure(new THREE.CanvasTexture(bumpCanvas),1,1,false),roughnessMap:configure(new THREE.CanvasTexture(roughCanvas),1,1,false)};
}

export function createCompactSnowTextures() {
  if(cachedCompact)return cachedCompact;
  const source=createSnowTextures();
  const map=source.map.clone(),bumpMap=source.bumpMap.clone(),roughnessMap=source.roughnessMap.clone();
  map.repeat.set(1, 2);
  bumpMap.repeat.set(1, 2);
  roughnessMap.repeat.set(1, 2);
  return cachedCompact={ map, bumpMap, roughnessMap };
}

export function createRockTextures() {
  if(cachedRock)return cachedRock;
  const size = 96;
  const rand = mulberry32(77129);
  const colorCanvas = makeCanvas(size);
  const ctx = colorCanvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.floor((rand() - 0.5) * 38);
    image.data[i] = 112 + n;
    image.data[i + 1] = 122 + n;
    image.data[i + 2] = 128 + n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = 'rgba(45,55,60,0.22)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }
  const map = configure(new THREE.CanvasTexture(colorCanvas), 2.5, 2.5, true);
  return cachedRock={ map };
}


const fabricMapsCache = new Map();
export function createFabricMaterialMaps(seed = 9981, { repeatX = 4.4, repeatY = 7.2, weave = 0.7 } = {}) {
  const key = `${seed}:${repeatX}:${repeatY}:${weave}`;
  if (fabricMapsCache.has(key)) return fabricMapsCache.get(key);
  const size = 96;
  const rand = mulberry32(seed);
  const bumpCanvas = makeCanvas(size);
  const roughCanvas = makeCanvas(size);
  const bump = bumpCanvas.getContext('2d');
  const rough = roughCanvas.getContext('2d');
  const bumpImage = bump.createImageData(size, size);
  const roughImage = rough.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      // Fine, nearly isotropic textile variation. Avoid obvious grid lines or stripes.
      const thread = Math.sin((x + y * 0.35) * 0.72) * 2.1 + Math.cos((y - x * 0.22) * 0.79) * 1.7;
      const fuzz = (rand() - 0.5) * 13;
      const b = Math.max(0, Math.min(255, 128 + thread * weave + fuzz));
      const r = Math.max(0, Math.min(255, 222 + (rand() - 0.5) * 18 - thread * 0.45));
      bumpImage.data[i] = bumpImage.data[i + 1] = bumpImage.data[i + 2] = b;
      roughImage.data[i] = roughImage.data[i + 1] = roughImage.data[i + 2] = r;
      bumpImage.data[i + 3] = roughImage.data[i + 3] = 255;
    }
  }
  bump.putImageData(bumpImage, 0, 0);
  rough.putImageData(roughImage, 0, 0);
  const maps = {
    bumpMap: configure(new THREE.CanvasTexture(bumpCanvas), repeatX, repeatY, false),
    roughnessMap: configure(new THREE.CanvasTexture(roughCanvas), repeatX, repeatY, false),
  };
  fabricMapsCache.set(key, maps);
  return maps;
}

let cachedGoggleLensTexture = null;
export function createGoggleLensTexture() {
  if (cachedGoggleLensTexture) return cachedGoggleLensTexture;
  const canvas = makeCanvas(256);
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#6f17c9');
  gradient.addColorStop(0.16, '#2630ef');
  gradient.addColorStop(0.46, '#05a9f4');
  gradient.addColorStop(0.58, '#0fc5f0');
  gradient.addColorStop(0.84, '#2452e6');
  gradient.addColorStop(1, '#7e16c5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
  vertical.addColorStop(0, 'rgba(255,255,255,0.22)');
  vertical.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  vertical.addColorStop(0.7, 'rgba(0,15,35,0.13)');
  vertical.addColorStop(1, 'rgba(18,0,45,0.28)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Soft alpine-sky/snow reflection bands keep the lens lively without an env map.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(116, 19, 93, 10, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,238,255,0.13)';
  ctx.beginPath();
  ctx.ellipse(138, 73, 112, 13, 0.02, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cachedGoggleLensTexture = texture;
  return texture;
}


export function createGarmentPatternTexture(pattern = 'plain', seed = 9981) {
  const size = 128;
  const rand = mulberry32(seed);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  if (pattern === 'stripes') {
    ctx.fillStyle = 'rgba(30,40,48,0.36)';
    for (let y = -size; y < size * 2; y += 26) {
      ctx.save(); ctx.translate(size / 2, y); ctx.rotate(-0.34); ctx.fillRect(-size, -6, size * 2, 12); ctx.restore();
    }
  } else if (pattern === 'checker') {
    for (let y = 0; y < size; y += 24) for (let x = 0; x < size; x += 24) {
      if (((x / 24) + (y / 24)) % 2 < 1) { ctx.fillStyle = 'rgba(25,35,42,0.32)'; ctx.fillRect(x, y, 24, 24); }
    }
  } else if (pattern === 'retro') {
    ctx.fillStyle = 'rgba(255,255,255,0.36)'; ctx.fillRect(0, 28, size, 17);
    ctx.fillStyle = 'rgba(25,35,42,0.30)'; ctx.fillRect(0, 48, size, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(0, 66, size, 9);
  } else if (pattern === 'stickers') {
    const colors = ['rgba(238,84,76,.82)','rgba(68,181,219,.82)','rgba(242,194,67,.84)','rgba(35,48,58,.78)'];
    for (let i = 0; i < 22; i += 1) {
      ctx.save();
      ctx.translate(10 + rand() * (size - 20), 10 + rand() * (size - 20));
      ctx.rotate((rand() - 0.5) * 1.8);
      ctx.fillStyle = colors[i % colors.length];
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 4 + rand() * 5, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-5 - rand() * 3, -3 - rand() * 2, 10 + rand() * 6, 6 + rand() * 4);
      ctx.restore();
    }
  } else if (pattern === 'speckle') {
    for (let i = 0; i < 420; i += 1) {
      const v = rand() > 0.55 ? 255 : 20; ctx.fillStyle = `rgba(${v},${v},${v},0.10)`;
      ctx.beginPath(); ctx.arc(rand() * size, rand() * size, 0.5 + rand() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Fine fabric noise without directional grid lines.
  for (let i = 0; i < 420; i += 1) {
    const v = rand() > 0.5 ? 255 : 35; ctx.fillStyle = `rgba(${v},${v},${v},0.025)`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  return configure(new THREE.CanvasTexture(canvas), 3.2, 5.4, true);
}

export function createFabricTexture(base = '#ffffff', seed = 9981) {
  const size = 64;
  const rand = mulberry32(seed);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  for (let i = 0; i < 180; i += 1) {
    const v = rand() > 0.5 ? 255 : 30;
    ctx.fillStyle = `rgba(${v},${v},${v},0.025)`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  return configure(new THREE.CanvasTexture(canvas), 5, 8, true);
}
