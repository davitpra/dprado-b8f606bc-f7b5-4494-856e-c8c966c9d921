import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  /** Incremented each time the user presses N outside an input. */
  readonly newTaskTrigger = signal(0);

  /** Incremented each time Escape is pressed (globally, including inside inputs). */
  readonly escTrigger = signal(0);

  /** Whether the shortcuts help panel is visible. */
  readonly showHelp = signal(false);

  constructor() {
    // Use capture phase so we receive events even if stopPropagation() is called
    // by child elements (e.g. the modal's inner div).
    const handler = (event: KeyboardEvent) => this.handleKey(event);
    this.document.addEventListener('keydown', handler, true);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('keydown', handler, true),
    );
  }

  toggleHelp(): void {
    this.showHelp.update((v) => !v);
  }

  closeHelp(): void {
    this.showHelp.set(false);
  }

  private handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isEditing =
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable;

    // Escape always works — closes help panel and notifies consumers.
    if (event.key === 'Escape') {
      this.showHelp.set(false);
      this.escTrigger.update((v) => v + 1);
      return;
    }

    // All other shortcuts are suppressed while the user is typing.
    if (isEditing) return;

    switch (event.key) {
      case 'n':
      case 'N':
        event.preventDefault();
        this.newTaskTrigger.update((v) => v + 1);
        break;
      case '/':
        event.preventDefault();
        this.document
          .querySelector<HTMLInputElement>('input[aria-label="Search tasks"]')
          ?.focus();
        break;
      case '?':
        event.preventDefault();
        this.showHelp.update((v) => !v);
        break;
    }
  }
}
