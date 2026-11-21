import { mount } from 'svelte';
// Crimson Pro for reading; Marcellus SC for headings and the lettering on drawn cards.
import '@fontsource-variable/crimson-pro/wght.css';
import '@fontsource-variable/crimson-pro/wght-italic.css';
import '@fontsource/marcellus-sc/400.css';
import './app.css';
import App from './App.svelte';
import { pwa } from './lib/state/pwa.svelte';

pwa.init();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh: () => (pwa.needRefresh = true),
      onOfflineReady: () => (pwa.offlineReady = true),
    });
    pwa.setUpdater(update);
  });
}

export default mount(App, { target: document.getElementById('app')! });
