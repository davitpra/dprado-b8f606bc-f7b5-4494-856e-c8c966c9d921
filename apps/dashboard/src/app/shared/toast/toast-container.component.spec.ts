import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService, Toast } from '../../core/services/toast.service';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let component: ToastContainerComponent;
  let mockToastService: { toasts: jest.Mock; dismiss: jest.Mock };

  const createFixture = () => {
    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockToastService = {
      toasts: jest.fn().mockReturnValue([]),
      dismiss: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [
        { provide: ToastService, useValue: mockToastService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ToastContainerComponent, { set: { imports: [] } })
      .compileComponents();
  });

  it('renders no toasts when list is empty', () => {
    createFixture();
    const toasts = fixture.nativeElement.querySelectorAll('[class*="rounded-lg"]');
    expect(toasts).toHaveLength(0);
  });

  describe('toastClasses()', () => {
    it('returns bg-green-600 for success', () => {
      createFixture();
      expect(component.toastClasses('success')).toContain('bg-green-600');
    });

    it('returns bg-red-600 for error', () => {
      createFixture();
      expect(component.toastClasses('error')).toContain('bg-red-600');
    });

    it('returns bg-amber-500 for warning', () => {
      createFixture();
      expect(component.toastClasses('warning')).toContain('bg-amber-500');
    });

    it('includes text-white for all types', () => {
      createFixture();
      expect(component.toastClasses('success')).toContain('text-white');
      expect(component.toastClasses('error')).toContain('text-white');
      expect(component.toastClasses('warning')).toContain('text-white');
    });
  });

  describe('toastIcon()', () => {
    it('returns lucideCheckCircle for success', () => {
      createFixture();
      expect(component.toastIcon('success')).toBe('lucideCheckCircle');
    });

    it('returns lucideXCircle for error', () => {
      createFixture();
      expect(component.toastIcon('error')).toBe('lucideXCircle');
    });

    it('returns lucideAlertTriangle for warning', () => {
      createFixture();
      expect(component.toastIcon('warning')).toBe('lucideAlertTriangle');
    });
  });

  describe('trackById()', () => {
    it('returns the toast id', () => {
      createFixture();
      const toast: Toast = { id: 42, message: 'test', type: 'success', duration: 3000 };
      expect(component.trackById(0, toast)).toBe(42);
    });
  });
});
