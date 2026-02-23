import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DepartmentFormModalComponent } from './department-form-modal.component';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentStore } from '../../../core/stores/department.store';
import { createMockDepartmentStore } from '../../../testing/mock-stores';
import { makeDepartment } from '../../../testing/test-fixtures';

describe('DepartmentFormModalComponent', () => {
  let fixture: ComponentFixture<DepartmentFormModalComponent>;
  let component: DepartmentFormModalComponent;
  let mockDeptStore: ReturnType<typeof createMockDepartmentStore>;
  let mockDeptService: { createDepartment: jest.Mock; updateDepartment: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(DepartmentFormModalComponent);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    mockDeptStore = createMockDepartmentStore();
    mockDeptService = {
      createDepartment: jest.fn().mockResolvedValue(makeDepartment()),
      updateDepartment: jest.fn().mockResolvedValue(makeDepartment()),
    };

    await TestBed.configureTestingModule({
      imports: [DepartmentFormModalComponent],
      providers: [
        { provide: DepartmentStore, useValue: mockDeptStore },
        { provide: DepartmentService, useValue: mockDeptService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DepartmentFormModalComponent, { set: { imports: [] } })
      .compileComponents();
  });

  describe('create mode (editDept = null)', () => {
    it('form starts empty', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      expect(component['form'].getRawValue().name).toBe('');
    });

    it('form is invalid with empty name', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      expect(component['form'].invalid).toBe(true);
    });

    it('form is valid with a name', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      component['form'].patchValue({ name: 'Engineering' });
      expect(component['form'].valid).toBe(true);
    });

    it('name is invalid if longer than 100 chars', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      component['form'].patchValue({ name: 'a'.repeat(101) });
      expect(component['form'].get('name')?.invalid).toBe(true);
    });

    it('does not submit when form is invalid', async () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      await component.onSubmit();
      expect(mockDeptService.createDepartment).not.toHaveBeenCalled();
    });

    it('calls createDepartment on valid submit', async () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      component['form'].patchValue({ name: 'Engineering' });
      await component.onSubmit();
      expect(mockDeptService.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Engineering' }),
      );
    });

    it('emits closed after successful create', async () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);

      component['form'].patchValue({ name: 'Engineering' });
      await component.onSubmit();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('edit mode (editDept = dept)', () => {
    const existingDept = makeDepartment({ id: 'dept-1', name: 'Marketing', description: 'Marketing team' });

    it('patches form with existing dept name and description', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', existingDept);
      component.ngOnInit();
      fixture.detectChanges();

      const raw = component['form'].getRawValue();
      expect(raw.name).toBe('Marketing');
      expect(raw.description).toBe('Marketing team');
    });

    it('calls updateDepartment on submit', async () => {
      createFixture();
      fixture.componentRef.setInput('editDept', existingDept);
      component.ngOnInit();
      fixture.detectChanges();

      component['form'].patchValue({ name: 'Marketing Renamed' });
      await component.onSubmit();
      expect(mockDeptService.updateDepartment).toHaveBeenCalledWith(
        'dept-1',
        expect.objectContaining({ name: 'Marketing Renamed' }),
      );
    });

    it('emits closed after successful update', async () => {
      createFixture();
      fixture.componentRef.setInput('editDept', existingDept);
      component.ngOnInit();
      fixture.detectChanges();

      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);

      await component.onSubmit();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('onClose()', () => {
    it('clears store error and emits closed', () => {
      createFixture();
      fixture.componentRef.setInput('editDept', null);
      component.ngOnInit();
      fixture.detectChanges();

      const closedSpy = jest.fn();
      component.closed.subscribe(closedSpy);

      component.onClose();
      expect(mockDeptStore.setError).toHaveBeenCalledWith(null);
      expect(closedSpy).toHaveBeenCalled();
    });
  });
});
