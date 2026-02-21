import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="modal-overlay" (click)="cancelled.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancelled.emit()">Cancel</button>
          <button class="btn-confirm" (click)="confirmed.emit()">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      width: 100%;
      max-width: 400px;
    }
    h3 { margin: 0 0 0.75rem; font-size: 1.125rem; }
    p { margin: 0 0 1.5rem; color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .btn-cancel {
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
    }
    .btn-confirm {
      padding: 0.5rem 1rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
    }
  `],
})
export class ConfirmDialogComponent {
  title = input('Confirm');
  message = input.required<string>();
  confirmLabel = input('Delete');

  confirmed = output<void>();
  cancelled = output<void>();
}
