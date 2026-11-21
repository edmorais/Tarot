export interface ToastAction {
  label: string;
  run: () => void;
}

class Ui {
  settingsOpen = $state(false);
  journalOpen = $state(false);
  /** journal entry shown in detail view, or null for the list */
  journalEntry = $state<string | null>(null);
  toast = $state<{ text: string; id: number; action?: ToastAction } | null>(null);
  /** the user has turned, tipped or zoomed the table away from the default view */
  viewMoved = $state(false);
  /** Auto graphics found this device slow and turned the battery saver on */
  autoSaver = $state(false);
  private timer = 0;

  openJournal(entryId: string | null = null) {
    this.journalEntry = entryId;
    this.journalOpen = true;
  }

  /** Show a short message, optionally with one action button (e.g. Undo). */
  say(text: string, ms = 2600, action?: ToastAction) {
    clearTimeout(this.timer);
    this.toast = { text, id: Date.now(), action };
    this.timer = window.setTimeout(() => (this.toast = null), action ? Math.max(ms, 6000) : ms);
  }

  runToastAction() {
    const a = this.toast?.action;
    clearTimeout(this.timer);
    this.toast = null;
    a?.run();
  }
}

export const ui = new Ui();
