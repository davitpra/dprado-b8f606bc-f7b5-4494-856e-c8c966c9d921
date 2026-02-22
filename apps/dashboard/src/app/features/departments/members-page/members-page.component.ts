import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideUserPlus,
  lucideTrash2,
  lucideUsers,
  lucideArrowLeft,
  lucideLoader,
} from '@ng-icons/lucide';
import { UserRole } from '@task-management/data';
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
    provideIcons({ lucideUserPlus, lucideTrash2, lucideUsers, lucideArrowLeft, lucideLoader }),
  ],
  templateUrl: './members-page.component.html',
})
export class MembersPageComponent implements OnInit {
  protected departmentStore = inject(DepartmentStore);
  protected authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);
  private departmentService = inject(DepartmentService);

  protected readonly UserRole = UserRole;
  protected deptId = '';

  protected showInviteModal = signal(false);
  protected showConfirmDialog = signal(false);
  protected removingMember = signal<MemberView | null>(null);
  protected updatingMemberId = signal<string | null>(null);

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

  canEditRole(): boolean {
    return this.authStore.isOwner();
  }

  async updateRole(member: MemberView, newRole: UserRole.ADMIN | UserRole.VIEWER): Promise<void> {
    if (newRole === member.role.toUpperCase() || this.updatingMemberId() !== null) return;

    this.updatingMemberId.set(member.user.id);
    try {
      await this.departmentService.updateMemberRole(this.deptId, member.user.id, newRole);
    } catch {
      // Error is displayed via departmentStore.error()
    } finally {
      this.updatingMemberId.set(null);
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
