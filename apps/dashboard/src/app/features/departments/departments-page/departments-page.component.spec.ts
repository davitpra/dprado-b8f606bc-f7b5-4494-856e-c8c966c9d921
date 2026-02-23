import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DepartmentsPageComponent } from './departments-page.component';
import { DepartmentStore } from '../../../core/stores/department.store';
import { DepartmentService } from '../../../core/services/department.service';
import { createMockDepartmentStore } from '../../../testing/mock-stores';
import { makeDepartment } from '../../../testing/test-fixtures';

describe('DepartmentsPageComponent', () => {
  let fixture: ComponentFixture<DepartmentsPageComponent>;
  let component: DepartmentsPageComponent;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockDeptService: { loadDepartments: jest.Mock; deleteDepartment: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(DepartmentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockDeptStore = createMockDepartmentStore();
    mockDeptService = {
      loadDepartments: jest.fn().mockResolvedValue(undefined),
      deleteDepartment: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DepartmentsPageComponent],
      providers: [
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: DepartmentService, useValue: mockDeptService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DepartmentsPageComponent, { set: { imports: [] } })
      .compileComponents();
  });

  it('calls loadDepartments on init', () => {
    createFixture();
    expect(mockDeptService.loadDepartments).toHaveBeenCalled();
  });

  describe('openModal / closeModal', () => {
    it('openModal sets showModal to true', () => {
      createFixture();
      component.openModal();
      expect(component['showModal']()).toBe(true);
    });

    it('openModal with dept sets editingDept', () => {
      createFixture();
      const dept = makeDepartment();
      component.openModal(dept);
      expect(component['editingDept']()).toEqual(dept);
    });

    it('openModal without dept sets editingDept to null', () => {
      createFixture();
      component.openModal();
      expect(component['editingDept']()).toBeNull();
    });

    it('closeModal sets showModal to false and clears editingDept', () => {
      createFixture();
      component.openModal(makeDepartment());
      component.closeModal();
      expect(component['showModal']()).toBe(false);
      expect(component['editingDept']()).toBeNull();
    });
  });

  describe('confirmDelete / cancelDelete / onDeleteConfirmed', () => {
    it('confirmDelete sets deletingDept and showConfirmDialog', () => {
      createFixture();
      const dept = makeDepartment();
      component.confirmDelete(dept);
      expect(component['deletingDept']()).toEqual(dept);
      expect(component['showConfirmDialog']()).toBe(true);
    });

    it('cancelDelete clears deletingDept and hides confirm dialog', () => {
      createFixture();
      component.confirmDelete(makeDepartment());
      component.cancelDelete();
      expect(component['deletingDept']()).toBeNull();
      expect(component['showConfirmDialog']()).toBe(false);
    });

    it('onDeleteConfirmed calls departmentService.deleteDepartment', async () => {
      createFixture();
      const dept = makeDepartment({ id: 'dept-1' });
      component.confirmDelete(dept);
      await component.onDeleteConfirmed();
      expect(mockDeptService.deleteDepartment).toHaveBeenCalledWith('dept-1');
    });

    it('onDeleteConfirmed clears state before calling service', async () => {
      createFixture();
      const dept = makeDepartment({ id: 'dept-1' });
      component.confirmDelete(dept);
      await component.onDeleteConfirmed();
      expect(component['showConfirmDialog']()).toBe(false);
      expect(component['deletingDept']()).toBeNull();
    });

    it('onDeleteConfirmed does nothing when no deletingDept', async () => {
      createFixture();
      await component.onDeleteConfirmed();
      expect(mockDeptService.deleteDepartment).not.toHaveBeenCalled();
    });
  });
});
