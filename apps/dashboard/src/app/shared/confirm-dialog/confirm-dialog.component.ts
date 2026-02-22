import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  title = input('Confirm');
  message = input.required<string>();
  confirmLabel = input('Delete');

  confirmed = output<void>();
  cancelled = output<void>();
}
