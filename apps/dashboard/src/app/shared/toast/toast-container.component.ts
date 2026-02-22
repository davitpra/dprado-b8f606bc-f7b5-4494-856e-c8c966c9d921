import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle,
  lucideXCircle,
  lucideAlertTriangle,
  lucideX,
} from '@ng-icons/lucide';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheckCircle, lucideXCircle, lucideAlertTriangle, lucideX })],
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected toastService = inject(ToastService);

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }

  toastClasses(type: Toast['type']): string {
    const base = 'text-white ';
    return base + {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-amber-500',
    }[type];
  }

  toastIcon(type: Toast['type']): string {
    return {
      success: 'lucideCheckCircle',
      error: 'lucideXCircle',
      warning: 'lucideAlertTriangle',
    }[type];
  }
}
