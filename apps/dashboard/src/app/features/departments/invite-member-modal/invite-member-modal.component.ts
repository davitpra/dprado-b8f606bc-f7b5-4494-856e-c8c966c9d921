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
  templateUrl: './invite-member-modal.component.html',
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
