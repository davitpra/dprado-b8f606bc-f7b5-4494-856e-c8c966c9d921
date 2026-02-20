import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DepartmentStore } from '../../../core/stores/department.store';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-members-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="members-page">
      <div class="page-header">
        <a routerLink="/app/departments" class="back-link">← Departments</a>
        <h1>Members</h1>
        @if (canInvite()) {
          <button class="btn-primary" (click)="toggleInviteForm()">+ Invite Member</button>
        }
      </div>

      @if (showInviteForm()) {
        <div class="invite-form">
          <h3>Invite Member</h3>
          <form [formGroup]="form" (ngSubmit)="onInvite()">
            <div class="form-group">
              <label for="email">Email *</label>
              <input id="email" type="email" formControlName="email" placeholder="user@example.com" />
            </div>
            <div class="form-group">
              <label for="role">Role *</label>
              <select id="role" formControlName="role">
                <option value="viewer">Viewer</option>
                @if (authStore.isOwner()) {
                  <option value="admin">Admin</option>
                }
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="toggleInviteForm()">Cancel</button>
              <button type="submit" class="btn-submit" [disabled]="form.invalid">Invite</button>
            </div>
          </form>
        </div>
      }

      <div class="members-list">
        @for (member of departmentStore.members(); track member.user.id) {
          <div class="member-card">
            <div class="member-info">
              <strong>{{ member.user.firstName }} {{ member.user.lastName }}</strong>
              <span class="email">{{ member.user.email }}</span>
            </div>
            <div class="member-meta">
              <span class="role-badge role-{{ member.role }}">{{ member.role }}</span>
              @if (canRemove()) {
                <button class="btn-danger" (click)="removeMember(member.user.id)">Remove</button>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>No members in this department yet.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .members-page { }
    .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; flex: 1; }
    .back-link { color: #3b82f6; text-decoration: none; font-size: 0.875rem; white-space: nowrap; }
    .btn-primary { padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500; }
    .invite-form { background: white; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .invite-form h3 { margin: 0 0 1rem; font-size: 1rem; }
    .form-group { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
    label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
    input, select { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-cancel { padding: 0.375rem 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; }
    .btn-submit { padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.6; }
    .members-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .member-card { background: white; padding: 1rem 1.5rem; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .member-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .email { font-size: 0.875rem; color: #6b7280; }
    .member-meta { display: flex; gap: 0.75rem; align-items: center; }
    .role-badge { padding: 0.125rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; text-transform: capitalize; }
    .role-admin { background: #dbeafe; color: #1e40af; }
    .role-viewer { background: #f3f4f6; color: #374151; }
    .btn-danger { padding: 0.25rem 0.75rem; color: #dc2626; background: #fff5f5; border: 1px solid #fecaca; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .empty-state { text-align: center; padding: 2rem; color: #6b7280; background: white; border-radius: 0.5rem; }
  `],
})
export class MembersPageComponent implements OnInit {
  protected departmentStore = inject(DepartmentStore);
  protected authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  protected showInviteForm = signal(false);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['viewer', Validators.required],
  });

  protected canInvite = computed(() => {
    const deptId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.authStore.isOwner()) return true;
    return this.authStore.isAdminInDepartment(deptId);
  });

  protected canRemove = computed(() => {
    const deptId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.authStore.isOwner()) return true;
    return this.authStore.isAdminInDepartment(deptId);
  });

  ngOnInit(): void {
    const deptId = this.route.snapshot.paramMap.get('id');
    if (deptId) {
      this.departmentStore.setCurrentDepartment(deptId);
    }
  }

  toggleInviteForm(): void {
    this.showInviteForm.update((v) => !v);
    if (!this.showInviteForm()) {
      this.form.reset({ email: '', role: 'viewer' });
    }
  }

  onInvite(): void {
    if (this.form.invalid) return;
    // HTTP call wired when MembersService is implemented
    this.toggleInviteForm();
  }

  removeMember(userId: string): void {
    if (confirm('Remove this member from the department?')) {
      this.departmentStore.removeMember(userId);
    }
  }
}
