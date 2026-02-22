import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX, lucideKeyboard } from '@ng-icons/lucide';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';

@Component({
  selector: 'app-shortcuts-help',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideX, lucideKeyboard })],
  templateUrl: './shortcuts-help.component.html',
})
export class ShortcutsHelpComponent {
  protected shortcutsService = inject(KeyboardShortcutsService);

  protected shortcuts = [
    { key: 'N', description: 'New task' },
    { key: '/', description: 'Focus search' },
    { key: '?', description: 'Show / hide this panel' },
    { key: 'Esc', description: 'Close modal or this panel' },
  ];
}
