// Imperative three.js choreography for the reading table: 78 physical cards,
// shuffle / cut / fan / deal / flip animations, lights, camera framing.
import * as THREE from 'three';
import type { Spread } from '../data/spreads';
import type { Theme } from '../data/themes';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DECK_BY_ID, faceUrl, isDrawn, type DeckId } from '../data/decks';
import { cardBackTexture, dotTexture, glowTexture, tableTexture } from './textures';
import { renderBack, renderFace, type Rendered } from '../art/render';
import { Atmosphere } from './atmosphere';
import { sfx, haptic } from '../audio/sfx';

interface FaceMaps {
  map: THREE.Texture;
  metal?: THREE.Texture;
  rough?: THREE.Texture;
}

export const CARD_W = 1;
export const CARD_H = 1.75;
const CARD_T = 0.0065;
const STACK_STEP = 0.0062;
const TILT = 0.38; // camera angle from vertical, radians
const FOV = 36;

const DEG = Math.PI / 180;
/** how far the user may turn, tip and zoom the view */
export const VIEW_LIMIT = { yaw: 15 * DEG, pitchMin: -16 * DEG, pitchMax: 30 * DEG, zoomIn: 0.78, zoomOut: 1.22 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** how far past a limit a gesture may stretch before it stops, as a fraction of the limit */
const STRETCH = 0.12;

/**
 * Apply a gesture delta with rubber-band resistance. Moving toward the centre
 * is always free; moving outward slows smoothly over the outer part of the range
 * and stops a little past the limit.
 */
function resist(v: number, d: number, lo: number, hi: number): number {
  const limit = d > 0 ? hi : lo;
  if (limit === 0 || Math.sign(d) !== Math.sign(limit)) return clamp(v + d, lo * (1 + STRETCH), hi * (1 + STRETCH));
  const outer = limit * (1 + STRETCH);
  const t = clamp(v / outer, 0, 1); // 0 at the centre, 1 at the stretch edge
  const ease = Math.max(0, 1 - t * t) ** 1.5;
  return clamp(v + d * ease, lo * (1 + STRETCH), hi * (1 + STRETCH));
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Q_FLAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const Q_FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const Q_REV = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

/** yawDeg > 0 turns the card clockwise as seen from above */
export function cardQuat(faceUp: boolean, yawDeg = 0, reversed = false) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, (-yawDeg * Math.PI) / 180);
  q.multiply(Q_FLAT);
  if (!faceUp) q.multiply(Q_FLIP);
  if (reversed) q.multiply(Q_REV);
  return q;
}

const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};
type Ease = (t: number) => number;

interface Motion {
  fromP: THREE.Vector3;
  fromQ: THREE.Quaternion;
  toP: THREE.Vector3;
  toQ: THREE.Quaternion;
  start: number;
  dur: number;
  ease: Ease;
  arc: number;
  began: boolean;
  resolve: () => void;
}

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

class CardObj {
  group = new THREE.Group();
  front: THREE.Mesh;
  back: THREE.Mesh;
  body: THREE.Mesh;
  motion: Motion | null = null;
  follow: Pose | null = null;
  faceId: string | null = null;
  reversed = false;

  constructor(faceGeo: THREE.BufferGeometry, bodyGeo: THREE.BufferGeometry, backMat: THREE.Material, edgeMat: THREE.Material, blankMat: THREE.Material) {
    this.body = new THREE.Mesh(bodyGeo, edgeMat);
    this.body.castShadow = true;
    this.front = new THREE.Mesh(faceGeo, blankMat);
    this.front.position.z = CARD_T / 2 + 0.0008;
    this.back = new THREE.Mesh(faceGeo, backMat);
    this.back.rotation.y = Math.PI;
    this.back.position.z = -CARD_T / 2 - 0.0008;
    this.front.receiveShadow = this.back.receiveShadow = true;
    this.group.add(this.body, this.front, this.back);
    this.group.userData.card = this;
  }
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Focus = 'home' | 'deck' | 'pick' | 'deal' | 'layout';

export class TableRig {
  root = new THREE.Group();
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;

  cards: CardObj[] = [];
  stack: CardObj[] = [];
  fan: CardObj[] = [];
  slots: (CardObj | null)[] = [];
  spread: Spread | null = null;
  deckId: DeckId = 'rws';

  insets = { top: 0, bottom: 0, left: 0, right: 0 };
  viewport = { w: 1, h: 1 };
  focus: Focus = 'home';
  hoverFan = -1;
  glowSlot = -1;

  private now = 0;
  private deckPos = new THREE.Vector3();
  private faceGeo: THREE.BufferGeometry;
  private bodyGeo: THREE.BufferGeometry;
  private backMat = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  // the body sits behind the face planes; polygon offset keeps it from z-fighting at distance
  private edgeMat = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.6, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  private blankMat = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.8 });
  private faceCache = new Map<string, Promise<FaceMaps>>();
  private env: THREE.Texture | null = null;
  private loader = new THREE.TextureLoader();

  private table: THREE.Mesh;
  private hemi = new THREE.HemisphereLight();
  private key = new THREE.DirectionalLight();
  private candle = new THREE.PointLight('#ffa850', 0, 0, 2);
  private candleBase = 0;
  private glow: THREE.Mesh;
  private slotGroup = new THREE.Group();
  private slotTex: THREE.CanvasTexture;
  private slotMat: THREE.MeshBasicMaterial;
  private dust: THREE.Points;
  private dustSeed: Float32Array;
  private camPos = new THREE.Vector3(0, 12, 6);
  private camLook = new THREE.Vector3();
  private camGoalLook = new THREE.Vector3();
  private camGoalDist = 14;
  /** lens shift in pixels that centres the spread in the area the panels leave free */
  private shiftGoal = { x: 0, y: 0 };
  private shift = { x: 0, y: 0 };
  private camDist = 14;
  /** where the user wants the view (radians, factor) and where it currently is */
  view = { yaw: 0, pitch: 0, zoom: 1 };
  private viewNow = { yaw: 0, pitch: 0, zoom: 1 };
  onViewChange?: () => void;

  constructor() {
    const shape = roundedRectShape(CARD_W, CARD_H, 0.065);
    this.faceGeo = new THREE.ShapeGeometry(shape, 8);
    const pos = this.faceGeo.attributes.position;
    const uv = this.faceGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + CARD_W / 2) / CARD_W, (pos.getY(i) + CARD_H / 2) / CARD_H);
    }
    this.bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: CARD_T, bevelEnabled: false, curveSegments: 8 });
    this.bodyGeo.translate(0, 0, -CARD_T / 2);

    for (let i = 0; i < 78; i++) {
      const c = new CardObj(this.faceGeo, this.bodyGeo, this.backMat, this.edgeMat, this.blankMat);
      this.cards.push(c);
      this.root.add(c.group);
    }
    this.stack = [...this.cards];
    this.stack.forEach((c, i) => this.place(c, this.stackPose(i)));

    // table
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial());
    this.table.rotation.x = -Math.PI / 2;
    this.table.receiveShadow = true;
    this.root.add(this.table);

    // lights
    this.key.position.set(3.5, 10, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 30;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 4;
    this.root.add(this.hemi, this.key, this.key.target, this.candle);
    this.candle.position.set(-3.6, 2.6, -2.2);

    // glow under the next card to reveal
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W * 2.1, CARD_H * 1.7),
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.002;
    this.glow.renderOrder = 1;
    this.root.add(this.glow);

    // slot outlines
    this.slotTex = this.makeSlotTexture('#d8b66a');
    this.slotMat = new THREE.MeshBasicMaterial({ map: this.slotTex, transparent: true, depthWrite: false, opacity: 0 });
    this.root.add(this.slotGroup);

    // dust motes
    const N = 170;
    const dpos = new Float32Array(N * 3);
    this.dustSeed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      this.dustSeed.set([(Math.random() - 0.5) * 14, 0.3 + Math.random() * 4, (Math.random() - 0.5) * 12, Math.random() * 100], i * 4);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    this.dust = new THREE.Points(
      dg,
      new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, color: '#ffd9a0' }),
    );
    this.dust.frustumCulled = false;
    this.root.add(this.dust);
    this.root.add(this.atmo.group);
  }

  /** candles, star motes or window light, depending on the table */
  private atmo = new Atmosphere(() => this.env);

  attach(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    const aniso = renderer.capabilities.getMaxAnisotropy();
    this.backMat.map && (this.backMat.map.anisotropy = aniso);
    // a soft studio environment, used only by gold-foil cards so the gold has something to reflect
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    if (Math.min(window.innerWidth, window.innerHeight) < 700) this.key.shadow.mapSize.set(1024, 1024);
  }

  // ───────────────────────── appearance ─────────────────────────

  applyTheme(t: Theme) {
    const map = tableTexture(t.table.pattern, t.table.base, t.table.accent);
    const old = this.table.material as THREE.Material;
    if (t.table.sheen) {
      this.table.material = new THREE.MeshPhysicalMaterial({
        map, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color(t.table.sheen), sheenRoughness: 0.45,
      });
    } else {
      this.table.material = new THREE.MeshStandardMaterial({ map, roughness: t.table.pattern === 'stone' ? 0.55 : 0.88 });
    }
    old.dispose();
    this.hemi.color.set(t.hemi.sky);
    this.hemi.groundColor.set(t.hemi.ground);
    this.hemi.intensity = t.hemi.intensity;
    this.key.color.set(t.key.color);
    this.key.intensity = t.key.intensity;
    this.candle.color.set(t.candle?.color ?? '#ffffff');
    this.atmo.setTheme(t);
    // with real candles on the table the distant warm light becomes a soft fill
    this.candleBase = (t.candle?.intensity ?? 0) * (this.atmo.hasFlame ? 0.35 : 1);
    (this.dust.material as THREE.PointsMaterial).color.set(t.dust);
    (this.dust.material as THREE.PointsMaterial).opacity = t.dark ? 0.55 : 0.35;
    if (this.scene) {
      this.scene.background = new THREE.Color(t.fog);
      this.scene.fog = new THREE.Fog(t.fog, 10, 30);
    }
    this.slotTex.dispose();
    this.slotTex = this.makeSlotTexture(t.ui['--accent']);
    this.slotMat.map = this.slotTex;
    this.slotMat.needsUpdate = true;
  }

  async applyDeck(id: DeckId) {
    this.deckId = id;
    this.edgeMat.color.set(DECK_BY_ID[id].edge);
    this.blankMat.color.set(DECK_BY_ID[id].edge);
    for (const c of this.cards) if (c.faceId) void this.setFace(c, c.faceId);
    let maps: FaceMaps;
    if (isDrawn(id)) {
      try {
        maps = this.mapsFrom(await renderBack(id));
      } catch {
        maps = { map: cardBackTexture('rws') };
      }
    } else maps = { map: cardBackTexture(id) };
    if (this.deckId !== id) return; // the deck changed again meanwhile
    const m = this.backMat;
    const old = [m.map, m.metalnessMap, m.roughnessMap];
    this.applyMaps(m, maps, 0.55);
    for (const t of old) if (t && t !== m.map && t !== m.metalnessMap && t !== m.roughnessMap) t.dispose();
  }

  /** Configure a card material for plain or gold-foil maps. */
  private applyMaps(m: THREE.MeshPhysicalMaterial, maps: FaceMaps, roughness: number) {
    m.map = maps.map;
    if (maps.metal && maps.rough) {
      m.metalnessMap = maps.metal;
      m.roughnessMap = maps.rough;
      m.metalness = 1;
      m.roughness = 1;
      m.envMap = this.env;
      m.envMapIntensity = 1.35;
      m.clearcoat = 0.15;
      m.clearcoatRoughness = 0.3;
    } else {
      m.metalnessMap = null;
      m.roughnessMap = null;
      m.metalness = 0;
      m.roughness = roughness;
      m.envMap = null;
      m.clearcoat = 0.3;
      m.clearcoatRoughness = 0.4;
    }
    m.needsUpdate = true;
  }

  private canvasTex(c: HTMLCanvasElement, srgb: boolean) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 8;
    t.needsUpdate = true;
    return t;
  }

  private mapsFrom(r: Rendered): FaceMaps {
    return {
      map: this.canvasTex(r.color, true),
      metal: r.metal ? this.canvasTex(r.metal, false) : undefined,
      rough: r.rough ? this.canvasTex(r.rough, false) : undefined,
    };
  }

  private makeSlotTexture(color: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 420;
    const g = c.getContext('2d')!;
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.roundRect(14, 14, 228, 392, 18);
    g.stroke();
    g.lineWidth = 1;
    g.globalAlpha = 0.5;
    g.beginPath();
    g.roundRect(26, 26, 204, 368, 12);
    g.stroke();
    g.globalAlpha = 0.8;
    g.fillStyle = color;
    for (const [x, y] of [[128, 14], [128, 406], [14, 210], [242, 210]]) {
      g.beginPath();
      g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private loadFace(cardId: string): Promise<FaceMaps> {
    const deck = this.deckId;
    const key = `${deck}:${cardId}`;
    let p = this.faceCache.get(key);
    if (!p) {
      p = isDrawn(deck)
        ? renderFace(deck, cardId).then((r) => this.mapsFrom(r))
        : this.loader.loadAsync(faceUrl(deck, cardId)).then((t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 8;
            return { map: t };
          });
      this.faceCache.set(key, p);
    }
    return p;
  }

  async setFace(card: CardObj, cardId: string) {
    card.faceId = cardId;
    const deck = this.deckId;
    let maps: FaceMaps;
    try {
      maps = await this.loadFace(cardId);
    } catch {
      // missing art: keep the plain face and let the reading continue
      this.faceCache.delete(`${deck}:${cardId}`);
      return;
    }
    if (card.faceId !== cardId || this.deckId !== deck) return;
    const prev = card.front.material as THREE.Material;
    const m = new THREE.MeshPhysicalMaterial();
    this.applyMaps(m, maps, 0.6);
    card.front.material = m;
    if (prev !== this.blankMat) prev.dispose();
  }

  private clearFace(card: CardObj) {
    card.faceId = null;
    card.reversed = false;
    const prev = card.front.material as THREE.Material;
    if (prev !== this.blankMat) prev.dispose();
    card.front.material = this.blankMat;
  }

  // ───────────────────────── layout ─────────────────────────

  setSpread(spread: Spread) {
    this.spread = spread;
    this.slotGroup.clear();
    for (const p of spread.positions) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.12, CARD_H * 1.08), this.slotMat);
      m.rotation.set(-Math.PI / 2, 0, (-(p.rot ?? 0) * Math.PI) / 180);
      m.position.set(p.x, 0.001 + (p.over != null ? 0.0005 : 0), p.z);
      this.slotGroup.add(m);
    }
    this.slots = spread.positions.map(() => null);
    this.deckPos.copy(this.homeDeckPos());
  }

  layoutBox(): Box {
    const b: Box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const p of this.spread?.positions ?? [{ x: 0, z: 0 }]) {
      const r = (((p as { rot?: number }).rot ?? 0) * Math.PI) / 180;
      const hx = Math.abs(Math.cos(r)) * CARD_W * 0.5 + Math.abs(Math.sin(r)) * CARD_H * 0.5;
      const hz = Math.abs(Math.sin(r)) * CARD_W * 0.5 + Math.abs(Math.cos(r)) * CARD_H * 0.5;
      b.minX = Math.min(b.minX, p.x - hx);
      b.maxX = Math.max(b.maxX, p.x + hx);
      b.minZ = Math.min(b.minZ, p.z - hz);
      b.maxZ = Math.max(b.maxZ, p.z + hz);
    }
    return b;
  }

  private homeDeckPos() {
    const b = this.layoutBox();
    return new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  }

  private dealDeckPos() {
    const b = this.layoutBox();
    return new THREE.Vector3((b.minX + b.maxX) / 2, 0, b.maxZ + 0.55 + CARD_H / 2);
  }

  private stackPose(i: number, at = this.deckPos, yaw = 0): Pose {
    // tiny jitter makes the pile look hand-stacked
    const j = Math.sin(i * 12.9898) * 0.012;
    return {
      p: new THREE.Vector3(at.x + j, CARD_T / 2 + i * STACK_STEP, at.z + Math.cos(i * 7.233) * 0.01),
      q: cardQuat(false, yaw + j * 40),
    };
  }

  private slotPose(i: number, faceUp: boolean, reversed = false): Pose {
    const p = this.spread!.positions[i];
    return {
      p: new THREE.Vector3(p.x, CARD_T / 2 + 0.002 + (p.over != null ? 0.03 : 0), p.z),
      q: cardQuat(faceUp, p.rot ?? 0, reversed),
    };
  }

  private fanGeometry() {
    const b = this.layoutBox();
    const width = Math.max(b.maxX - b.minX, 5.2);
    const R = width * 1.05;
    const span = width / R;
    const top = b.maxZ + 0.45 + CARD_H / 2;
    return { cx: (b.minX + b.maxX) / 2, top, R, span };
  }

  private fanPose(i: number, n: number, hovered: number): Pose {
    const { cx, top, R, span } = this.fanGeometry();
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const a = (t - 0.5) * span;
    const p = new THREE.Vector3(cx + Math.sin(a) * R, CARD_T / 2 + i * 0.0045, top + R * (1 - Math.cos(a)));
    const d = hovered < 0 ? 99 : Math.abs(i - hovered);
    const lift = d === 0 ? 1 : d === 1 ? 0.35 : d === 2 ? 0.12 : 0;
    if (lift) {
      p.x += Math.sin(a) * 0.5 * lift;
      p.z -= Math.cos(a) * 0.55 * lift;
      p.y += 0.12 * lift;
    }
    return { p, q: cardQuat(false, (a * 180) / Math.PI) };
  }

  fanBox(): Box {
    const { cx, top, R, span } = this.fanGeometry();
    const half = Math.sin(span / 2) * R;
    return {
      minX: cx - half - 0.7, maxX: cx + half + 0.7,
      minZ: top - CARD_H / 2 - 0.6, maxZ: top + R * (1 - Math.cos(span / 2)) + CARD_H / 2 + 0.1,
    };
  }

  // ───────────────────────── motion ─────────────────────────

  private place(c: CardObj, pose: Pose) {
    c.group.position.copy(pose.p);
    c.group.quaternion.copy(pose.q);
  }

  move(c: CardObj, to: Pose, o: { dur?: number; delay?: number; ease?: Ease; arc?: number } = {}): Promise<void> {
    c.motion?.resolve();
    c.follow = null;
    return new Promise((resolve) => {
      c.motion = {
        fromP: new THREE.Vector3(), fromQ: new THREE.Quaternion(),
        toP: to.p.clone(), toQ: to.q.clone(),
        start: this.now + (o.delay ?? 0), dur: o.dur ?? 0.5, ease: o.ease ?? ease.inOutCubic,
        arc: o.arc ?? 0, began: false, resolve,
      };
    });
  }

  private wait(s: number) {
    return new Promise<void>((r) => setTimeout(r, s * 1000));
  }

  setFocus(f: Focus) {
    this.focus = f;
  }

  // ───────────────────────── choreography ─────────────────────────

  /** Return every card to a face-down pile at the centre. */
  async gather() {
    this.fan = [];
    this.glowSlot = -1;
    this.hoverFan = -1;
    this.deckPos.copy(this.homeDeckPos());
    const order = [...this.cards].sort(() => Math.random() - 0.5);
    // cards already on the table travel last so the pile builds from the bottom
    const onTable = order.filter((c) => c.faceId);
    const rest = order.filter((c) => !c.faceId);
    this.stack = [...rest, ...onTable];
    this.slots = this.slots.map(() => null);
    const ps = this.stack.map((c, i) =>
      this.move(c, this.stackPose(i), { dur: 0.55, delay: c.faceId ? 0.25 + (i - rest.length) * 0.06 : i * 0.002, arc: c.faceId ? 0.5 : 0.05 }),
    );
    if (onTable.length) sfx.slide();
    await Promise.all(ps);
    for (const c of this.cards) this.clearFace(c);
  }

  async riffle() {
    const n = this.stack.length;
    const c = this.deckPos;
    const half = Math.floor(n / 2) + Math.round((Math.random() - 0.5) * 6);
    const L = this.stack.slice(0, half);
    const R = this.stack.slice(half);
    const split = [
      ...L.map((card, i) => this.move(card, { p: new THREE.Vector3(c.x - 0.64, CARD_T / 2 + i * STACK_STEP, c.z + 0.08), q: cardQuat(false, 9) }, { dur: 0.24, ease: ease.outCubic, arc: 0.1 })),
      ...R.map((card, i) => this.move(card, { p: new THREE.Vector3(c.x + 0.64, CARD_T / 2 + i * STACK_STEP, c.z + 0.08), q: cardQuat(false, -9) }, { dur: 0.24, ease: ease.outCubic, arc: 0.1 })),
    ];
    sfx.slide();
    await Promise.all(split);
    // interleave from the bottom of each half, in small random clumps
    const order: CardObj[] = [];
    let li = 0, ri = 0, fromL = Math.random() < 0.5;
    while (li < L.length || ri < R.length) {
      const clump = 1 + Math.floor(Math.random() * 2.2);
      for (let k = 0; k < clump; k++) {
        if (fromL && li < L.length) order.push(L[li++]);
        else if (!fromL && ri < R.length) order.push(R[ri++]);
      }
      fromL = !fromL;
      if (li >= L.length) fromL = false;
      if (ri >= R.length) fromL = true;
    }
    const gap = 0.0055;
    sfx.riffle(28, n * gap);
    haptic([5, 40, 5, 40, 5, 40, 5]);
    const land = order.map((card, j) =>
      this.move(card, this.stackPose(j), { dur: 0.2, delay: j * gap, ease: ease.outCubic, arc: 0.06 }),
    );
    await Promise.all(land);
    this.stack = order;
  }

  /** Cut the deck into three piles and restack them. */
  async cut() {
    const n = this.stack.length;
    const a = Math.floor(n * (0.28 + Math.random() * 0.1));
    const b = Math.floor(n * (0.62 + Math.random() * 0.1));
    const piles = [this.stack.slice(0, a), this.stack.slice(a, b), this.stack.slice(b)];
    const c = this.deckPos;
    const xs = [0, -1.35, 1.35];
    sfx.slide();
    await Promise.all(
      piles.flatMap((pile, k) =>
        pile.map((card, i) => this.move(card, this.stackPose(i, new THREE.Vector3(c.x + xs[k], 0, c.z + (k ? 0.25 : 0)), k === 1 ? 6 : k === 2 ? -6 : 0), { dur: 0.42, delay: k * 0.12, arc: 0.18 })),
      ),
    );
    haptic(10);
    await this.wait(0.15);
    // restack: right pile, then bottom, then left on top
    const order = [...piles[2], ...piles[0], ...piles[1]];
    let delay = 0;
    const ps: Promise<void>[] = [];
    for (const [k, pile] of [[2, piles[2]], [0, piles[0]], [1, piles[1]]] as const) {
      const base = order.indexOf(pile[0]);
      pile.forEach((card, i) => ps.push(this.move(card, this.stackPose(base + i), { dur: 0.4, delay, arc: 0.3 + k * 0.02 })));
      delay += 0.22;
    }
    setTimeout(() => sfx.slide(), 220);
    await Promise.all(ps);
    haptic(10);
    this.stack = order;
  }

  /** Slide the pile to the dealing position below the spread. */
  async moveDeckToDeal() {
    this.deckPos.copy(this.dealDeckPos());
    sfx.slide();
    await Promise.all(this.stack.map((c, i) => this.move(c, this.stackPose(i), { dur: 0.55, delay: (this.stack.length - i) * 0.0015, arc: 0.12 })));
  }

  async dealTop(slot: number, cardId: string, reversed: boolean) {
    const c = this.stack.pop()!;
    c.reversed = reversed;
    this.slots[slot] = c;
    void this.setFace(c, cardId);
    sfx.deal();
    haptic(6);
    await this.move(c, this.slotPose(slot, false), { dur: 0.55, arc: 0.55, ease: ease.inOutCubic });
  }

  async fanOut() {
    this.fan = [...this.stack];
    this.stack = [];
    this.hoverFan = -1;
    const n = this.fan.length;
    sfx.riffle(18, 0.5);
    await Promise.all(
      this.fan.map((c, i) => this.move(c, this.fanPose(i, n, -1), { dur: 0.6, delay: i * 0.006, ease: ease.outCubic, arc: 0.12 })),
    );
    this.fan.forEach((c, i) => (c.follow = this.fanPose(i, n, -1)));
  }

  setHover(i: number) {
    if (i === this.hoverFan) return;
    if (i >= 0) sfx.tick();
    this.hoverFan = i;
    const n = this.fan.length;
    this.fan.forEach((c, k) => {
      if (!c.motion) c.follow = this.fanPose(k, n, i);
    });
  }

  async takeFromFan(k: number, slot: number, cardId: string, reversed: boolean) {
    const c = this.fan.splice(k, 1)[0];
    if (!c) return;
    c.reversed = reversed;
    this.slots[slot] = c;
    void this.setFace(c, cardId);
    this.hoverFan = -1;
    const n = this.fan.length;
    this.fan.forEach((fc, i) => {
      if (!fc.motion) fc.follow = this.fanPose(i, n, -1);
    });
    sfx.deal();
    haptic(14);
    await this.move(c, this.slotPose(slot, false), { dur: 0.65, arc: 0.9, ease: ease.inOutCubic });
  }

  async collectFan() {
    this.deckPos.copy(this.dealDeckPos());
    this.stack = this.fan;
    this.fan = [];
    sfx.slide();
    await Promise.all(this.stack.map((c, i) => this.move(c, this.stackPose(i), { dur: 0.6, delay: i * 0.004, arc: 0.08 })));
  }

  /** Deal a known set of cards straight to their slots, face up. */
  async layOut(drawn: { cardId: string; reversed: boolean }[]) {
    await Promise.all(drawn.map((d) => this.loadFace(d.cardId).catch(() => null)));
    const ps = drawn.map((d, i) => {
      const c = this.stack.pop()!;
      c.reversed = d.reversed;
      this.slots[i] = c;
      void this.setFace(c, d.cardId);
      setTimeout(() => sfx.deal(), i * 110);
      return this.move(c, this.slotPose(i, true, d.reversed), { dur: 0.7, delay: i * 0.11, arc: 0.8, ease: ease.inOutCubic });
    });
    await Promise.all(ps);
    await this.stowDeck();
  }

  /** Slide the unused pile out of frame once the spread is laid. */
  async stowDeck() {
    const b = this.layoutBox();
    this.deckPos.set((b.minX + b.maxX) / 2, 0, b.maxZ + 8);
    await Promise.all(this.stack.map((c, i) => this.move(c, this.stackPose(i), { dur: 0.8, delay: i * 0.001, ease: ease.inOutCubic })));
  }

  async flip(slot: number) {
    const c = this.slots[slot];
    if (!c || !c.faceId) return;
    await this.setFace(c, c.faceId);
    // a card lying across this one lifts out of the way
    const crossing = this.spread!.positions.findIndex((p) => p.over === slot);
    const over = crossing >= 0 ? this.slots[crossing] : null;
    if (over) {
      const pose = { p: over.group.position.clone().add(new THREE.Vector3(0, 0.9, -0.2)), q: over.group.quaternion.clone() };
      void this.move(over, pose, { dur: 0.3, ease: ease.outCubic });
    }
    sfx.flip();
    haptic(16);
    await this.move(c, this.slotPose(slot, true, c.reversed), { dur: 0.85, arc: 1.25, ease: ease.inOutCubic });
    if (over) {
      const faceUp = !!over.faceId && this.isFaceUp(over);
      await this.move(over, this.slotPose(crossing, faceUp, over.reversed), { dur: 0.35, ease: ease.outBack });
    }
  }

  private isFaceUp(c: CardObj) {
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(c.group.quaternion);
    return n.y > 0;
  }

  // ───────────────────────── picking ─────────────────────────

  private tmp = new THREE.Vector3();

  /** Index of the fan card nearest to the pointer, or -1. */
  fanIndexAt(ndcX: number, ndcY: number): number {
    if (!this.camera || !this.fan.length) return -1;
    let best = -1, bestD = Infinity, bestY = 0;
    const n = this.fan.length;
    for (let i = 0; i < n; i++) {
      this.tmp.copy(this.fanPose(i, n, -1).p).project(this.camera);
      const d = Math.abs(this.tmp.x - ndcX);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestY = this.tmp.y;
      }
    }
    // stay within a generous vertical band around the fan
    return Math.abs(bestY - ndcY) < 0.38 && bestD < 0.12 ? best : -1;
  }

  private ray = new THREE.Raycaster();

  private labelV = new THREE.Vector3();

  /**
   * Screen positions (CSS pixels) for each position's name: just beyond the
   * lower edge of its slot, so the label never covers the card's own title.
   */
  labelPoints(): { x: number; y: number; on: boolean }[] {
    const cam = this.camera;
    if (!cam || !this.spread) return [];
    const { w, h } = this.viewport;
    return this.spread.positions.map((p) => {
      const r = -(p.rot ?? 0) * DEG;
      const reach = CARD_H / 2 + 0.07;
      this.labelV.set(p.x + Math.sin(r) * reach, 0.01, p.z + Math.cos(r) * reach).project(cam);
      return { x: ((this.labelV.x + 1) / 2) * w, y: ((1 - this.labelV.y) / 2) * h, on: this.labelV.z < 1 };
    });
  }

  slotsAt(ndcX: number, ndcY: number): number[] {
    if (!this.camera) return [];
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const objs = this.slots.flatMap((c) => (c ? [c.group] : []));
    const hits = this.ray.intersectObjects(objs, true);
    const out: number[] = [];
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.card) o = o.parent;
      const idx = this.slots.indexOf(o?.userData.card ?? null);
      if (idx >= 0 && !out.includes(idx)) out.push(idx);
    }
    return out;
  }

  // ───────────────────────── frame loop ─────────────────────────

  private fitBox(): Box {
    const L = this.layoutBox();
    const union = (a: Box, b: Box): Box => ({
      minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
      minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ),
    });
    const around = (p: THREE.Vector3, hx: number, hz: number): Box => ({ minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz });
    switch (this.focus) {
      case 'deck':
        return around(this.deckPos, 1.75, 1.45);
      case 'pick':
        return union(L, this.fanBox());
      case 'deal':
        return union(L, around(this.dealDeckPos(), 1.6, CARD_H / 2 + 0.2));
      case 'home':
        return union(L, around(this.homeDeckPos(), 2.2, 1.6));
      default:
        return L;
    }
  }

  private updateCameraGoal() {
    const cam = this.camera;
    if (!cam) return;
    const { w, h } = this.viewport;
    const ins = this.insets;
    const b = this.fitBox();
    const pad = 0.35;
    const W = b.maxX - b.minX + pad * 2;
    const D = (b.maxZ - b.minZ) * Math.cos(TILT) + pad * 2 + 0.3;
    const fy = Math.max(0.25, (h - ins.top - ins.bottom) / h);
    const fx = Math.max(0.25, (w - ins.left - ins.right) / w);
    const tanV = Math.tan(((FOV * Math.PI) / 180) / 2);
    const aspect = w / h;
    const dist = Math.max(D / (2 * tanV * fy), W / (2 * tanV * aspect * fx), 4.2);
    // Aim at the true centre of the spread, so turning the view pivots around it.
    // The panels are allowed for with a lens shift instead of by moving the aim.
    this.camGoalLook.set((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    this.camGoalDist = dist;
    this.shiftGoal.x = (ins.left - ins.right) / 2;
    this.shiftGoal.y = (ins.top - ins.bottom) / 2;
  }

  snapCamera() {
    this.updateCameraGoal();
    this.camLook.copy(this.camGoalLook);
    this.camDist = this.camGoalDist;
    this.shift.x = this.shiftGoal.x;
    this.shift.y = this.shiftGoal.y;
  }

  // ───────────────────────── user view ─────────────────────────

  /**
   * Nudge the view by a drag, in radians. Moving toward a limit meets growing
   * resistance and may stretch slightly past it; `settleView` springs it back.
   */
  orbit(dYaw: number, dPitch: number) {
    this.view.yaw = resist(this.view.yaw, dYaw, -VIEW_LIMIT.yaw, VIEW_LIMIT.yaw);
    this.view.pitch = resist(this.view.pitch, dPitch, VIEW_LIMIT.pitchMin, VIEW_LIMIT.pitchMax);
    this.onViewChange?.();
  }

  /** Zoom by a factor (>1 moves away), with the same soft limits. */
  zoomBy(factor: number) {
    const lz = resist(Math.log(this.view.zoom), Math.log(factor), Math.log(VIEW_LIMIT.zoomIn), Math.log(VIEW_LIMIT.zoomOut));
    this.view.zoom = Math.exp(lz);
    this.onViewChange?.();
  }

  /** At the end of a gesture, spring anything past a limit back inside it. */
  settleView() {
    const v = this.view;
    v.yaw = clamp(v.yaw, -VIEW_LIMIT.yaw, VIEW_LIMIT.yaw);
    v.pitch = clamp(v.pitch, VIEW_LIMIT.pitchMin, VIEW_LIMIT.pitchMax);
    v.zoom = clamp(v.zoom, VIEW_LIMIT.zoomIn, VIEW_LIMIT.zoomOut);
    this.onViewChange?.();
  }

  resetView() {
    this.view = { yaw: 0, pitch: 0, zoom: 1 };
    this.onViewChange?.();
  }

  get viewMoved() {
    const v = this.view;
    return Math.abs(v.yaw) > 0.02 || Math.abs(v.pitch) > 0.02 || Math.abs(v.zoom - 1) > 0.02;
  }

  // ───────────────────────── graphics quality ─────────────────────────

  lowPower = false;
  /** sample frame times and report when the device struggles (Auto quality) */
  autoQuality = true;
  onSlow?: () => void;
  private frameSamples: number[] = [];

  /** Battery saver: no shadows, no floating dust. (Resolution is handled by the canvas.) */
  setLowPower(on: boolean) {
    this.lowPower = on;
    this.key.castShadow = !on;
    this.dust.visible = !on;
    this.atmo.setLowPower(on);
  }

  private sampleFrame(rawDt: number) {
    if (!this.autoQuality || this.lowPower || !this.onSlow) return;
    // a hidden or throttled tab is not a slow device: ignore long pauses
    if (document.hidden || rawDt > 0.2) return;
    this.frameSamples.push(rawDt);
    if (this.frameSamples.length < 150) return;
    const steady = this.frameSamples.slice(30); // skip warm-up (shader compiles, texture uploads)
    const avg = steady.reduce((a, b) => a + b, 0) / steady.length;
    this.frameSamples = [];
    if (avg > 1 / 36) {
      this.autoQuality = false; // decide once per session
      this.onSlow();
    }
  }

  update(dt: number) {
    this.sampleFrame(dt);
    dt = Math.min(dt, 0.05);
    this.now += dt;
    const t = this.now;

    for (const c of this.cards) {
      const m = c.motion;
      if (m) {
        if (t < m.start) continue;
        if (!m.began) {
          m.began = true;
          m.fromP.copy(c.group.position);
          m.fromQ.copy(c.group.quaternion);
        }
        const k = Math.min(1, (t - m.start) / m.dur);
        const e = m.ease(k);
        c.group.position.lerpVectors(m.fromP, m.toP, e);
        c.group.position.y += Math.sin(Math.PI * k) * m.arc;
        c.group.quaternion.slerpQuaternions(m.fromQ, m.toQ, e);
        if (k >= 1) {
          c.motion = null;
          m.resolve();
        }
      } else if (c.follow) {
        const a = 1 - Math.exp(-dt * 16);
        c.group.position.lerp(c.follow.p, a);
        c.group.quaternion.slerp(c.follow.q, a);
      }
    }

    // camera
    const cam = this.camera;
    if (cam) {
      // user offsets follow quickly, so dragging feels direct
      const v = 1 - Math.exp(-dt * 12);
      this.viewNow.yaw += (this.view.yaw - this.viewNow.yaw) * v;
      this.viewNow.pitch += (this.view.pitch - this.viewNow.pitch) * v;
      this.viewNow.zoom += (this.view.zoom - this.viewNow.zoom) * v;
      // automatic framing eases slowly between phases
      this.updateCameraGoal();
      const a = 1 - Math.exp(-dt * 2.6);
      this.camLook.lerp(this.camGoalLook, a);
      this.camDist += (this.camGoalDist - this.camDist) * a;
      const tilt = TILT + this.viewNow.pitch;
      const d = this.camDist * this.viewNow.zoom;
      const yaw = this.viewNow.yaw + Math.sin(t * 0.21) * 0.006;
      this.camPos.set(
        this.camLook.x + Math.sin(yaw) * Math.sin(tilt) * d,
        Math.cos(tilt) * d + Math.sin(t * 0.17) * 0.04,
        this.camLook.z + Math.cos(yaw) * Math.sin(tilt) * d,
      );
      cam.position.copy(this.camPos);
      cam.lookAt(this.camLook);
      // lens shift: move the image centre to the middle of the free area
      this.shift.x += (this.shiftGoal.x - this.shift.x) * a;
      this.shift.y += (this.shiftGoal.y - this.shift.y) * a;
      const { w, h } = this.viewport;
      if (w > 1 && h > 1) cam.setViewOffset(w, h, -this.shift.x, -this.shift.y, w, h);
      const dist = cam.position.distanceTo(this.camLook);
      if (this.scene?.fog instanceof THREE.Fog) {
        this.scene.fog.near = dist * 1.05;
        this.scene.fog.far = dist * 2.6;
      }
      this.key.target.position.copy(this.camLook);
      this.key.position.set(this.camLook.x + 3.5, 10, this.camLook.z + 5);
      this.candle.position.set(this.camLook.x - 3.8, 2.6, this.camLook.z - 2.4);
    }

    this.atmo.update(dt, t, this.layoutBox(), this.camLook);

    // candle flicker
    if (this.candleBase) {
      const f = 0.86 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1 + 1.3) * 0.04 + Math.sin(t * 23.7) * 0.03;
      this.candle.intensity = this.candleBase * f;
    } else this.candle.intensity = 0;

    // glow under the next card
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    if (this.glowSlot >= 0 && this.spread) {
      const p = this.spread.positions[this.glowSlot];
      this.glow.position.x = p.x;
      this.glow.position.z = p.z;
      this.glow.rotation.z = (-(p.rot ?? 0) * Math.PI) / 180;
      gm.opacity += (0.55 + Math.sin(t * 3) * 0.25 - gm.opacity) * Math.min(1, dt * 6);
    } else gm.opacity += (0 - gm.opacity) * Math.min(1, dt * 6);

    // slot outlines fade in/out
    const wantSlots = this.focus !== 'deck' ? 0.55 : 0.25;
    this.slotMat.opacity += (wantSlots - this.slotMat.opacity) * Math.min(1, dt * 3);

    // dust
    const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    const s = this.dustSeed;
    for (let i = 0; i < pos.count; i++) {
      const ph = s[i * 4 + 3];
      pos.setXYZ(
        i,
        this.camLook.x + s[i * 4] + Math.sin(t * 0.13 + ph) * 0.6,
        s[i * 4 + 1] + Math.sin(t * 0.21 + ph * 1.7) * 0.25,
        this.camLook.z + s[i * 4 + 2] + Math.cos(t * 0.11 + ph) * 0.6,
      );
    }
    pos.needsUpdate = true;
  }
}

export const rig = new TableRig();
if (import.meta.env.DEV) (window as unknown as { rig: TableRig }).rig = rig;
