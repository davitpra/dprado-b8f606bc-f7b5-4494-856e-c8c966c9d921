import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('success', () => {
    it('adds a toast with type=success and duration=3000', () => {
      service.success('Operation done');
      expect(service.toasts()).toHaveLength(1);
      expect(service.toasts()[0].type).toBe('success');
      expect(service.toasts()[0].message).toBe('Operation done');
      expect(service.toasts()[0].duration).toBe(3000);
    });
  });

  describe('error', () => {
    it('adds a toast with type=error and duration=5000', () => {
      service.error('Something went wrong');
      expect(service.toasts()).toHaveLength(1);
      expect(service.toasts()[0].type).toBe('error');
      expect(service.toasts()[0].message).toBe('Something went wrong');
      expect(service.toasts()[0].duration).toBe(5000);
    });
  });

  describe('warning', () => {
    it('adds a toast with type=warning and duration=4000', () => {
      service.warning('Be careful');
      expect(service.toasts()).toHaveLength(1);
      expect(service.toasts()[0].type).toBe('warning');
      expect(service.toasts()[0].message).toBe('Be careful');
      expect(service.toasts()[0].duration).toBe(4000);
    });
  });

  describe('dismiss', () => {
    it('removes the toast with the matching id', () => {
      service.success('First');
      service.success('Second');
      const id = service.toasts()[0].id;
      service.dismiss(id);
      expect(service.toasts()).toHaveLength(1);
      expect(service.toasts()[0].message).toBe('Second');
    });

    it('does nothing if id does not exist', () => {
      service.success('Test');
      service.dismiss(999);
      expect(service.toasts()).toHaveLength(1);
    });
  });

  describe('auto-dismiss', () => {
    it('removes success toast after 3000ms', () => {
      service.success('Hello');
      expect(service.toasts()).toHaveLength(1);
      jest.advanceTimersByTime(3000);
      expect(service.toasts()).toHaveLength(0);
    });

    it('removes error toast after 5000ms', () => {
      service.error('Error');
      jest.advanceTimersByTime(4999);
      expect(service.toasts()).toHaveLength(1);
      jest.advanceTimersByTime(1);
      expect(service.toasts()).toHaveLength(0);
    });

    it('removes warning toast after 4000ms', () => {
      service.warning('Warn');
      jest.advanceTimersByTime(4000);
      expect(service.toasts()).toHaveLength(0);
    });

    it('does not remove toast before duration', () => {
      service.success('Hello');
      jest.advanceTimersByTime(2999);
      expect(service.toasts()).toHaveLength(1);
    });
  });

  describe('multiple toasts', () => {
    it('can add multiple toasts with unique ids', () => {
      service.success('One');
      service.error('Two');
      service.warning('Three');
      expect(service.toasts()).toHaveLength(3);
      const ids = service.toasts().map((t) => t.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
