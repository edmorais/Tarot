// Install prompt, service-worker updates and offline deck caching.
import { CARDS } from '../data/cards';
import { faceUrl, type DeckId } from '../data/decks';

const DECK_CACHE = 'arcana-decks';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class Pwa {
  canInstall = $state(false);
  installed = $state(false);
  isIos = false;
  needRefresh = $state(false);
  offlineReady = $state(false);
  supported = typeof caches !== 'undefined' && 'serviceWorker' in navigator;
  /** deck id → number of cached faces */
  cached = $state<Record<string, number>>({});
  downloading = $state<{ deck: DeckId; done: number; total: number } | null>(null);

  private deferred: BeforeInstallPromptEvent | null = null;
  private applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

  init() {
    const standalone =
      matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    this.installed = standalone;
    this.isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.canInstall = true;
    });
    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.canInstall = false;
      this.deferred = null;
    });
  }

  setUpdater(fn: (reload?: boolean) => Promise<void>) {
    this.applyUpdate = fn;
  }

  async update() {
    await this.applyUpdate?.(true);
  }

  async install() {
    if (!this.deferred) return false;
    await this.deferred.prompt();
    const { outcome } = await this.deferred.userChoice;
    this.deferred = null;
    this.canInstall = false;
    return outcome === 'accepted';
  }

  /** photo decks only; drawn decks need no download */
  private urls(deck: DeckId) {
    return CARDS.map((c) => new URL(faceUrl(deck, c.id), location.href).href);
  }

  async countCached(deck: DeckId) {
    if (!this.supported) return 0;
    try {
      const cache = await caches.open(DECK_CACHE);
      const keys = new Set((await cache.keys()).map((r) => r.url));
      const n = this.urls(deck).filter((u) => keys.has(u)).length;
      this.cached = { ...this.cached, [deck]: n };
      return n;
    } catch {
      return 0;
    }
  }

  /** Fetch every face of a deck into the offline cache. */
  async cacheDeck(deck: DeckId) {
    if (!this.supported || this.downloading) return;
    const cache = await caches.open(DECK_CACHE);
    const have = new Set((await cache.keys()).map((r) => r.url));
    const todo = this.urls(deck).filter((u) => !have.has(u));
    const total = CARDS.length;
    let done = total - todo.length;
    this.downloading = { deck, done, total };
    let failed = 0;
    const worker = async () => {
      while (todo.length) {
        const url = todo.shift()!;
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
          else failed++;
        } catch {
          failed++;
        }
        this.downloading = { deck, done: ++done, total };
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    this.downloading = null;
    await this.countCached(deck);
    return failed;
  }
}

export const pwa = new Pwa();
