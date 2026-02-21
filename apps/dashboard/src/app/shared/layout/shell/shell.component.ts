import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UIStore } from '../../../core/stores/ui.store';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, BreadcrumbComponent],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected uiStore = inject(UIStore);

  constructor() {
    effect(() => {
      const isDark = this.uiStore.isDarkMode();
      document.documentElement.classList.toggle('dark', isDark);
    });
  }
}
