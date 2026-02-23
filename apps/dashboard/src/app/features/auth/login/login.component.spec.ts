import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let mockAuthStore: { error: jest.Mock; isLoading: jest.Mock };
  let mockAuthService: { login: jest.Mock };
  let router: Router;

  const createFixture = () => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockAuthStore = {
      error: jest.fn().mockReturnValue(null),
      isLoading: jest.fn().mockReturnValue(false),
    };
    mockAuthService = { login: jest.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should render email and password inputs', () => {
    createFixture();
    expect(fixture.nativeElement.querySelector('#email')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password')).toBeTruthy();
  });

  it('should render a submit button', () => {
    createFixture();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn).toBeTruthy();
  });

  it('should NOT call authService.login when form is empty', async () => {
    createFixture();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    btn.click();
    await fixture.whenStable();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('form is invalid with empty fields', () => {
    createFixture();
    expect(component['form'].invalid).toBe(true);
  });

  it('form is invalid with invalid email', () => {
    createFixture();
    component['form'].patchValue({ email: 'not-an-email', password: 'Password123!' });
    expect(component['form'].invalid).toBe(true);
  });

  it('form is valid with correct email and password', () => {
    createFixture();
    component['form'].patchValue({ email: 'test@example.com', password: 'Password123!' });
    expect(component['form'].valid).toBe(true);
  });

  it('calls authService.login and navigates to /app/tasks on valid submit', async () => {
    createFixture();
    component['form'].patchValue({ email: 'test@example.com', password: 'Password123!' });
    fixture.detectChanges();
    await component['onSubmit']();
    expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'Password123!');
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);
  });

  it('does not navigate when authService.login throws', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Login failed'));
    createFixture();
    component['form'].patchValue({ email: 'test@example.com', password: 'wrong' });
    await component['onSubmit']();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows error message when authStore.error() is set', () => {
    mockAuthStore.error.mockReturnValue('Invalid credentials');
    createFixture();
    const errorEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(errorEl?.textContent).toContain('Invalid credentials');
  });

  it('toggles password visibility on eye button click', () => {
    createFixture();
    const passwordInput = fixture.nativeElement.querySelector('#password');
    expect(passwordInput.type).toBe('password');

    const eyeBtn = fixture.nativeElement.querySelector('button[type="button"]');
    eyeBtn.click();
    fixture.detectChanges();

    expect(passwordInput.type).toBe('text');
  });
});
