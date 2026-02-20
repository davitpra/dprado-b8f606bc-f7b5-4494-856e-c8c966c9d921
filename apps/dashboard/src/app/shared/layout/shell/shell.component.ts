import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UIStore } from '../../../core/stores/ui.store';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <div class="main-content">
        <app-header />
        <main class="page-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .main-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .page-content {
      flex: 1;
      overflow: auto;
      padding: 1.5rem;
      background: var(--page-bg, #f3f4f6);
    }
  `],
})
export class ShellComponent {
  private uiStore = inject(UIStore);

  constructor() {
    effect(() => {
      const isDark = this.uiStore.isDarkMode();
      document.documentElement.classList.toggle('dark', isDark);
    });
  }
}
