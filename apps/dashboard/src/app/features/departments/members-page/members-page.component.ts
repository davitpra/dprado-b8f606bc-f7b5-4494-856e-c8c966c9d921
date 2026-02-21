import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideUserPlus,
  lucideTrash2,
  lucideUsers,
  lucideArrowLeft,
} from '@ng-icons/lucide';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { InviteMemberModalComponent } from '../invite-member-modal/invite-member-modal.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

interface MemberView {
  user: { id: string; firstName: string; lastName: string; email: string };
  role: 'admin' | 'viewer';
}

@Component({
  selector: 'app-members-page',
  standalone: true,
  imports: [
    RouterLink,
    NgIcon,
    InviteMemberModalComponent,
    ConfirmDialogComponent,
  ],
  providers: [
    provideIcons({ lucideUserPlus, lucideTrash2, lucideUsers, lucideArrowLeft }),
  ],
  template: `
    <div>
      <div class="flex flex-wrap items-center gap-4 mb-6">
        <a routerLink="/app/departments"
           class="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline whitespace-nowrap">
          <ng-icon name="lucideArrowLeft" size="16" />
          Departments
        </a>
        <h1 class="m-0 text-2xl font-bold flex-1 text-gray-900 dark:text-gray-100">Members</h1>
        @if (canInvite()) {
          <button
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md cursor-pointer font-medium"
            (click)="openInviteModal()">
            <ng-icon name="lucideUserPlus" size="16" />
            Invite Member
          </button>
        }
      </div>

      @if (departmentStore.isLoading() && !departmentStore.members().length) {
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">Loading members...</div>
      }

      @if (departmentStore.error() && !showInviteModal()) {
        <div class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm mb-4">
          {{ departmentStore.error() }}
        </div>
      }

      <div class="flex flex-col gap-3">
        @for (member of departmentStore.members(); track member.user.id) {
          <div class="bg-white dark:bg-gray-800 px-6 py-4 rounded-lg flex justify-between items-center shadow-sm">
            <div class="flex flex-col gap-1">
              <strong class="text-gray-900 dark:text-gray-100">{{ member.user.firstName }} {{ member.user.lastName }}</strong>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ member.user.email }}</span>
            </div>
            <div class="flex gap-3 items-center">
              @if (member.role === 'admin') {
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {{ member.role }}
                </span>
              } @else {
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ member.role }}
                </span>
              }
              @if (canRemoveMember(member)) {
                <button
                  class="inline-flex items-center justify-center p-1.5 bg-transparent border border-red-200 dark:border-red-800 rounded-md cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  (click)="confirmRemove(member)"
                  title="Remove member">
                  <ng-icon name="lucideTrash2" size="16" />
                </button>
              }
            </div>
          </div>
        } @empty {
          @if (!departmentStore.isLoading()) {
            <div class="text-center py-12 px-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
              <ng-icon name="lucideUsers" size="40" class="mb-3" />
              <p class="m-0 mb-1 font-medium text-base text-gray-700 dark:text-gray-200">No members yet</p>
              <span class="text-sm">Invite members to this department to get started.</span>
            </div>
          }
        }
      </div>
    </div>

    @if (showInviteModal()) {
      <app-invite-member-modal
        [departmentId]="deptId"
        (closed)="closeInviteModal()"
      />
    }

    @if (showConfirmDialog()) {
      <app-confirm-dialog
        title="Remove Member"
        [message]="'Remove ' + removingMember()!.user.firstName + ' ' + removingMember()!.user.lastName + ' from this department?'"
        confirmLabel="Remove"
        (confirmed)="onRemoveConfirmed()"
        (cancelled)="cancelRemove()"
      />
    }
  `,
})
export class MembersPageComponent implements OnInit {
  protected departmentStore = inject(DepartmentStore);
  protected authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);
  private departmentService = inject(DepartmentService);

  protected deptId = '';

  protected showInviteModal = signal(false);
  protected showConfirmDialog = signal(false);
  protected removingMember = signal<MemberView | null>(null);

  protected canInvite = computed(() => {
    if (this.authStore.isOwner()) return true;
    return this.authStore.isAdminInDepartment(this.deptId);
  });

  ngOnInit(): void {
    this.deptId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.deptId) {
      this.departmentStore.setCurrentDepartment(this.deptId);
      this.departmentService.loadMembers(this.deptId);
    }
  }

  canRemoveMember(member: MemberView): boolean {
    if (this.authStore.isOwner()) return true;
    if (this.authStore.isAdminInDepartment(this.deptId)) {
      return member.role === 'viewer';
    }
    return false;
  }

  openInviteModal(): void {
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  confirmRemove(member: MemberView): void {
    this.removingMember.set(member);
    this.showConfirmDialog.set(true);
  }

  cancelRemove(): void {
    this.showConfirmDialog.set(false);
    this.removingMember.set(null);
  }

  async onRemoveConfirmed(): Promise<void> {
    const member = this.removingMember();
    if (!member) return;

    this.showConfirmDialog.set(false);
    this.removingMember.set(null);

    try {
      await this.departmentService.removeMember(this.deptId, member.user.id);
    } catch {
      // Error is displayed via departmentStore.error()
    }
  }
}
