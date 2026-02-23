import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  const createFixture = (message = 'Are you sure?', title = 'Confirm', confirmLabel = 'Delete') => {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', message);
    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('confirmLabel', confirmLabel);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();
  });

  it('renders the message', () => {
    createFixture('Delete this item?');
    expect(fixture.nativeElement.textContent).toContain('Delete this item?');
  });

  it('renders the title', () => {
    createFixture('Are you sure?', 'Custom Title');
    expect(fixture.nativeElement.textContent).toContain('Custom Title');
  });

  it('renders custom confirmLabel', () => {
    createFixture('Confirm?', 'Confirm', 'Remove');
    const confirmBtn = fixture.nativeElement.querySelector('.bg-red-600');
    expect(confirmBtn?.textContent?.trim()).toBe('Remove');
  });

  it('renders default confirmLabel "Delete"', () => {
    createFixture();
    const confirmBtn = fixture.nativeElement.querySelector('.bg-red-600');
    expect(confirmBtn?.textContent?.trim()).toBe('Delete');
  });

  it('emits confirmed when confirm button is clicked', () => {
    createFixture();
    const confirmedSpy = jest.fn();
    component.confirmed.subscribe(confirmedSpy);

    const confirmBtn = fixture.nativeElement.querySelector('.bg-red-600');
    confirmBtn.click();
    expect(confirmedSpy).toHaveBeenCalled();
  });

  it('emits cancelled when cancel button is clicked', () => {
    createFixture();
    const cancelledSpy = jest.fn();
    component.cancelled.subscribe(cancelledSpy);

    const cancelBtn = fixture.nativeElement.querySelector('.bg-gray-100, .dark\\:bg-gray-700');
    cancelBtn?.click();
    expect(cancelledSpy).toHaveBeenCalled();
  });

  it('emits cancelled when cancel text button is clicked', () => {
    createFixture();
    const cancelledSpy = jest.fn();
    component.cancelled.subscribe(cancelledSpy);

    // Find the Cancel button by text
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find(
      (btn: Element) => (btn as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLElement;
    cancelBtn?.click();
    expect(cancelledSpy).toHaveBeenCalled();
  });

  it('has a dialog with role="dialog"', () => {
    createFixture();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });

  it('input signals work correctly', () => {
    createFixture('Test message', 'Test Title', 'Confirm Action');
    expect(component.message()).toBe('Test message');
    expect(component.title()).toBe('Test Title');
    expect(component.confirmLabel()).toBe('Confirm Action');
  });
});
