// What makes each table feel like a place: candles on velvet and stone,
// twinkling star motes on the night table, window light on parchment.
import * as THREE from 'three';
import type { Theme } from '../data/themes';

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Props = 'candles' | 'candle' | 'stars' | 'window';

const LIGHT_LIFT = new THREE.Vector3(0.25, 0.75, 0.35);

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A candle flame: white-hot core, yellow body, orange edge, blue at the root. */
function flameTexture() {
  const [c, g] = canvas(64, 128);
  const shape = () => {
    g.beginPath();
    g.moveTo(32, 6);
    g.bezierCurveTo(46, 44, 52, 84, 32, 112);
    g.bezierCurveTo(12, 84, 18, 44, 32, 6);
  };
  g.filter = 'blur(3px)';
  let grd = g.createRadialGradient(32, 86, 2, 32, 76, 52);
  grd.addColorStop(0, 'rgba(255,255,240,1)');
  grd.addColorStop(0.3, 'rgba(255,226,140,0.95)');
  grd.addColorStop(0.65, 'rgba(255,150,50,0.75)');
  grd.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grd;
  shape();
  g.fill();
  grd = g.createRadialGradient(32, 106, 0, 32, 106, 12);
  grd.addColorStop(0, 'rgba(120,150,255,0.7)');
  grd.addColorStop(1, 'rgba(120,150,255,0)');
  g.fillStyle = grd;
  g.fillRect(16, 90, 32, 30);
  return tex(c);
}

function haloTexture() {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,200,120,0.55)');
  grd.addColorStop(0.4, 'rgba(255,160,70,0.16)');
  grd.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** Light through a mullioned window, projected by a spotlight onto the table. */
function windowTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  g.filter = 'blur(5px)';
  g.fillStyle = '#fff';
  const panes = [
    [52, 40], [132, 40],
    [52, 118], [132, 118],
  ];
  for (const [x, y] of panes) g.fillRect(x, y, 72, 70);
  // arched top light
  g.beginPath();
  g.arc(128, 40, 76, Math.PI, 0);
  g.closePath();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fill();
  g.fillStyle = '#000';
  g.fillRect(124, 0, 8, 200);
  g.fillRect(40, 110, 176, 8);
  return tex(c);
}

class Candle {
  group = new THREE.Group();
  flame: THREE.Sprite;
  halo: THREE.Sprite;
  private seed = Math.random() * 100;
  readonly height: number;

  constructor(height: number, radius: number, mats: { wax: THREE.Material; brass: THREE.Material; flame: THREE.SpriteMaterial; halo: THREE.SpriteMaterial }) {
    this.height = height;
    // wax with a slightly sunken, melted top
    const r = radius, h = height;
    const wax = new THREE.Mesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, h - 0.02),
        new THREE.Vector2(r * 0.97, h + 0.012), new THREE.Vector2(r * 0.8, h - 0.006), new THREE.Vector2(r * 0.3, h - 0.03),
        new THREE.Vector2(0, h - 0.028),
      ], 28),
      mats.wax,
    );
    wax.castShadow = true;
    this.group.add(wax);
    // a few drips down the side
    for (let i = 0; i < 3; i++) {
      const len = 0.05 + Math.random() * 0.12;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.014 + Math.random() * 0.008, len, 4, 8), mats.wax);
      const a = Math.random() * Math.PI * 2;
      drip.position.set(Math.cos(a) * r * 0.98, h - len / 2 - 0.02, Math.sin(a) * r * 0.98);
      this.group.add(drip);
    }
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), new THREE.MeshBasicMaterial({ color: '#2a1a10' }));
    wick.position.y = h - 0.005;
    this.group.add(wick);
    // brass dish
    const dish = new THREE.Mesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(r * 2.1, 0), new THREE.Vector2(r * 2.25, 0.04),
        new THREE.Vector2(r * 2.15, 0.05), new THREE.Vector2(r * 1.05, 0.03), new THREE.Vector2(r * 1.05, 0.08), new THREE.Vector2(0, 0.08),
      ], 36),
      mats.brass,
    );
    dish.castShadow = dish.receiveShadow = true;
    this.group.add(dish);
    wax.position.y = 0.06;
    this.flame = new THREE.Sprite(mats.flame);
    this.flame.center.set(0.5, 0.12);
    this.flame.position.y = h + 0.075;
    this.halo = new THREE.Sprite(mats.halo);
    this.halo.position.y = h + 0.17;
    this.halo.scale.setScalar(0.9);
    this.group.add(this.flame, this.halo);
  }

  flicker(t: number) {
    const s = this.seed;
    const n = Math.sin(t * 9.1 + s) * 0.5 + Math.sin(t * 15.7 + s * 2) * 0.3 + Math.sin(t * 27.3 + s * 3) * 0.2;
    this.flame.scale.set(0.13 * (1 + n * 0.05), 0.34 * (1 + n * 0.12), 1);
    this.flame.material.rotation = Math.sin(t * 2.3 + s) * 0.04;
    this.halo.scale.setScalar(0.85 + n * 0.06);
    return n;
  }
}

const SPARKLE_VERT = /* glsl */ `
  attribute float phase;
  uniform float time;
  uniform float size;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.5 + 0.5 * sin(time * (1.2 + fract(phase) * 2.0) + phase * 6.2831);
    vTw = tw * tw;
    gl_PointSize = size * (0.4 + vTw) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const SPARKLE_FRAG = /* glsl */ `
  uniform vec3 color;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.5, 0.0, d);
    float cross = max(smoothstep(0.08, 0.0, abs(p.x)), smoothstep(0.08, 0.0, abs(p.y))) * smoothstep(0.5, 0.1, d);
    float a = (core * core + cross * 0.6) * vTw;
    gl_FragColor = vec4(color, a);
  }`;

export class Atmosphere {
  group = new THREE.Group();
  props: Props | null = null;
  /** where the main candle flame is, for the rig's candle light */
  flamePos = new THREE.Vector3();

  private candles: Candle[] = [];
  private light = new THREE.PointLight('#ffae5c', 0, 0, 2);
  private lightBase = 0;
  private sun = new THREE.SpotLight('#fff0d4', 0, 0, 0.55, 0.65, 1.2);
  private sparkles: THREE.Points;
  private sparkleSeed: Float32Array;
  private anchor = new THREE.Vector3();
  private anchorGoal = new THREE.Vector3();
  private placed = false;
  private brass: THREE.MeshStandardMaterial;
  private env: () => THREE.Texture | null;

  constructor(env: () => THREE.Texture | null) {
    const mats = {
      wax: new THREE.MeshStandardMaterial({ color: '#efe4cc', roughness: 0.55, emissive: '#ff9a40', emissiveIntensity: 0.12 }),
      brass: new THREE.MeshStandardMaterial({ color: '#7d5a24', metalness: 0.85, roughness: 0.42 }),
      flame: new THREE.SpriteMaterial({ map: flameTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
      halo: new THREE.SpriteMaterial({ map: haloTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.32 }),
    };
    this.brass = mats.brass;
    this.env = env;
    this.candles = [new Candle(0.62, 0.11, mats), new Candle(0.4, 0.1, mats), new Candle(0.26, 0.09, mats)];
    for (const c of this.candles) this.group.add(c.group);
    this.group.add(this.light);

    this.sun.map = windowTexture();
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.bias = -0.0005;
    this.group.add(this.sun, this.sun.target);

    const N = 170;
    const pos = new Float32Array(N * 3);
    const phase = new Float32Array(N);
    this.sparkleSeed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.sparkleSeed.set([(Math.random() - 0.5) * 12, 0.2 + Math.random() * 2.6, (Math.random() - 0.5) * 10], i * 3);
      phase[i] = Math.random() * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    this.sparkles = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: SPARKLE_VERT,
        fragmentShader: SPARKLE_FRAG,
        uniforms: { time: { value: 0 }, size: { value: 0.2 }, color: { value: new THREE.Color('#e6ecff') } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.sparkles.frustumCulled = false;
    this.group.add(this.sparkles);
  }

  setTheme(t: Theme) {
    // brass needs something to reflect; the env map exists once the renderer is attached
    if (!this.brass.envMap && this.env()) {
      this.brass.envMap = this.env();
      this.brass.needsUpdate = true;
    }
    this.props = t.props ?? null;
    const n = this.props === 'candles' ? 3 : this.props === 'candle' ? 1 : 0;
    this.candles.forEach((c, i) => (c.group.visible = i < n));
    this.lightBase = this.props === 'candles' ? 4.5 : this.props === 'candle' ? 3 : 0;
    this.light.color.set(t.candle?.color ?? '#ffae5c');
    this.sun.intensity = this.props === 'window' ? 90 : 0;
    this.sun.visible = this.props === 'window';
    this.sparkles.visible = this.props === 'stars';
  }

  /** battery saver: the window light stops casting shadows, the star motes thin out */
  setLowPower(on: boolean) {
    this.sun.castShadow = !on;
    this.sparkles.geometry.setDrawRange(0, on ? 60 : Infinity);
  }

  get hasFlame() {
    return this.props === 'candles' || this.props === 'candle';
  }

  /** Where the candle cluster stands: just beyond the far-left corner of the spread. */
  anchorFor(layout: Box) {
    return new THREE.Vector3(layout.minX + 0.05, 0, layout.minZ - 0.62);
  }

  /** Keep the props near the spread without ever standing on it. */
  update(dt: number, t: number, layout: Box, look: THREE.Vector3) {
    // candles stand beyond the far-left corner of the spread
    this.anchorGoal.copy(this.anchorFor(layout));
    if (!this.placed) {
      this.anchor.copy(this.anchorGoal);
      this.placed = true;
    } else this.anchor.lerp(this.anchorGoal, 1 - Math.exp(-dt * 2.5));
    const offsets = [[0, 0], [0.34, -0.3], [-0.3, -0.36]];
    let n = 0;
    this.candles.forEach((c, i) => {
      if (!c.group.visible) return;
      c.group.position.set(this.anchor.x + offsets[i][0], 0, this.anchor.z + offsets[i][1]);
      n += c.flicker(t);
    });
    if (this.hasFlame) {
      const main = this.candles[0];
      this.flamePos.set(main.group.position.x, main.height + 0.18, main.group.position.z);
      // the light sits a little above the flames so nearby brass is lit, not blown out
      this.light.position.copy(this.flamePos).add(LIGHT_LIFT);
      this.light.intensity = this.lightBase * (0.88 + n * 0.06);
    } else this.light.intensity = 0;

    if (this.sun.visible) {
      this.sun.position.set(look.x - 4.5, 7.5, look.z - 3.5);
      this.sun.target.position.set(look.x + 0.6, 0, look.z + 0.4);
    }

    if (this.sparkles.visible) {
      const pos = this.sparkles.geometry.attributes.position as THREE.BufferAttribute;
      const s = this.sparkleSeed;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, look.x + s[i * 3] + Math.sin(t * 0.07 + i) * 0.3, s[i * 3 + 1] + Math.sin(t * 0.13 + i * 1.7) * 0.12, look.z + s[i * 3 + 2]);
      }
      pos.needsUpdate = true;
      (this.sparkles.material as THREE.ShaderMaterial).uniforms.time.value = t;
    }
  }
}
