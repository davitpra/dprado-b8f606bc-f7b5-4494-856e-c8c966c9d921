import { Component, computed, inject, input, output, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IUser, UserRole } from '@task-management/data';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentStore } from '../../../core/stores/department.store';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-invite-member-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" (click)="onClose()">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-[480px]" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-5">
          <h2 class="m-0 text-lg text-gray-900 dark:text-gray-100">Invite Member</h2>
          <button class="bg-transparent border-none text-base cursor-pointer text-gray-500 dark:text-gray-400" (click)="onClose()" aria-label="Close">&#10005;</button>
        </div>

        @if (departmentStore.error()) {
          <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-md text-sm mb-4">
            {{ departmentStore.error() }}
          </div>
        }

        @if (loadingUsers()) {
          <p class="text-gray-500 dark:text-gray-400 text-sm m-0 mb-4">Loading users...</p>
        } @else if (availableUsers().length === 0) {
          <p class="text-gray-500 dark:text-gray-400 text-sm m-0 mb-4">All organization members are already in this department.</p>
          <div class="flex justify-end gap-3 mt-6">
            <button type="button"
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer text-gray-700 dark:text-gray-300"
              (click)="onClose()">Close</button>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="flex flex-col mb-4">
              <label for="invite-user" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">User *</label>
              <select id="invite-user" formControlName="userId"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500">
                <option value="" disabled>Select a user</option>
                @for (user of availableUsers(); track user.id) {
                  <option [value]="user.id">
                    {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
                  </option>
                }
              </select>
            </div>
            <div class="flex flex-col mb-4">
              <label for="invite-role" class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role *</label>
              <select id="invite-role" formControlName="role"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500">
                <option value="VIEWER">Viewer</option>
                @if (authStore.isOwner()) {
                  <option value="ADMIN">Admin</option>
                }
              </select>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button"
                class="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer text-gray-700 dark:text-gray-300"
                (click)="onClose()">Cancel</button>
              <button type="submit"
                class="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                [disabled]="form.invalid || departmentStore.isLoading()">
                Invite
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class InviteMemberModalComponent implements OnInit {
  departmentId = input.required<string>();
  closed = output<void>();

  protected departmentStore = inject(DepartmentStore);
  protected authStore = inject(AuthStore);
  private departmentService = inject(DepartmentService);
  private fb = inject(FormBuilder);

  protected orgUsers = signal<IUser[]>([]);
  protected loadingUsers = signal(true);

  protected availableUsers = computed(() => {
    const members = this.departmentStore.members();
    const memberIds = new Set(members.map((m) => m.user.id));
    return this.orgUsers().filter(
      (u) => !u.isOwner && !memberIds.has(u.id),
    );
  });

  protected form = this.fb.group({
    userId: ['', Validators.required],
    role: [UserRole.VIEWER as string, Validators.required],
  });

  async ngOnInit(): Promise<void> {
    try {
      const users = await this.departmentService.loadOrgUsers();
      this.orgUsers.set(users);
    } catch {
      // Error handled silently — empty list shown
    } finally {
      this.loadingUsers.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { userId, role } = this.form.getRawValue();

    try {
      await this.departmentService.inviteMember(this.departmentId(), {
        userId: userId!,
        role: role!,
      });
      this.closed.emit();
    } catch {
      // Error is displayed via departmentStore.error()
    }
  }

  onClose(): void {
    this.departmentStore.setError(null);
    this.closed.emit();
  }
}
