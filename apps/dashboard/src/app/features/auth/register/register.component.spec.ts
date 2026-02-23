import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let mockAuthStore: { error: jest.Mock; isLoading: jest.Mock };
  let mockAuthService: { register: jest.Mock };
  let router: Router;

  const validFormValues = {
    firstName: 'John',
    lastName: 'Doe',
    organizationName: 'Acme Corp',
    email: 'john@example.com',
    password: 'Password123!',
  };

  const createFixture = () => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = {
      error: jest.fn().mockReturnValue(null),
      isLoading: jest.fn().mockReturnValue(false),
    };
    mockAuthService = { register: jest.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should render all form fields', () => {
    createFixture();
    expect(fixture.nativeElement.querySelector('#firstName')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#lastName')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#organizationName')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#email')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password')).toBeTruthy();
  });

  it('form is invalid when empty', () => {
    createFixture();
    expect(component['form'].invalid).toBe(true);
  });

  it('password is invalid if too short (< 8 chars)', () => {
    createFixture();
    component['form'].patchValue({ ...validFormValues, password: 'Ab1!' });
    expect(component['form'].get('password')?.invalid).toBe(true);
  });

  it('password is invalid if missing uppercase', () => {
    createFixture();
    component['form'].patchValue({ ...validFormValues, password: 'password123!' });
    expect(component['form'].get('password')?.invalid).toBe(true);
  });

  it('password is invalid if missing lowercase', () => {
    createFixture();
    component['form'].patchValue({ ...validFormValues, password: 'PASSWORD123!' });
    expect(component['form'].get('password')?.invalid).toBe(true);
  });

  it('password is invalid if missing digit', () => {
    createFixture();
    component['form'].patchValue({ ...validFormValues, password: 'PasswordNoDigit!' });
    expect(component['form'].get('password')?.invalid).toBe(true);
  });

  it('form is valid with all valid values', () => {
    createFixture();
    component['form'].patchValue(validFormValues);
    expect(component['form'].valid).toBe(true);
  });

  it('does NOT call authService.register when form is invalid', async () => {
    createFixture();
    await component['onSubmit']();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('calls authService.register with correct payload on valid submit', async () => {
    createFixture();
    component['form'].patchValue(validFormValues);
    await component['onSubmit']();
    expect(mockAuthService.register).toHaveBeenCalledWith(validFormValues);
  });

  it('navigates to /app/tasks after successful registration', async () => {
    createFixture();
    component['form'].patchValue(validFormValues);
    await component['onSubmit']();
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('does not navigate when register throws', async () => {
    mockAuthService.register.mockRejectedValue(new Error('Registration failed'));
    createFixture();
    component['form'].patchValue(validFormValues);
    await component['onSubmit']();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows error message when authStore.error() is set', () => {
    mockAuthStore.error.mockReturnValue('Email already in use');
    createFixture();
    const errorEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(errorEl?.textContent).toContain('Email already in use');
  });
});
