import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthForm } from '../AuthForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AuthForm', () => {
  const { toast } = useToast();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both sign-in and sign-up tabs', () => {
    render(<AuthForm />);
    expect(screen.getByRole('tab', { name: 'Войти' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Регистрация' })).toBeInTheDocument();
  });

  it('allows typing in sign-in form', async () => {
    render(<AuthForm />);
    const emailInput = screen.getByLabelText('Электронная почта');
    const passwordInput = screen.getByLabelText('Пароль');

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls supabase.auth.signInWithPassword on sign-in submission', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ error: null } as any);
    render(<AuthForm />);

    const emailInput = screen.getAllByLabelText('Электронная почта')[0];
    const passwordInput = screen.getAllByLabelText('Пароль')[0];
    const signInButton = screen.getByRole('button', { name: 'Войти' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(signInButton);

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome back!' }));
  });

  it('shows an error toast on sign-in failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ error: new Error('Invalid credentials') } as any);
    render(<AuthForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      description: 'Invalid credentials',
      variant: 'destructive',
    }));
  });

  it('switches to sign-up tab and allows typing', async () => {
    render(<AuthForm />);
    await userEvent.click(screen.getByRole('tab', { name: 'Регистрация' }));

    const emailInput = screen.getAllByLabelText('Электронная почта')[1];
    const passwordInput = screen.getAllByLabelText('Пароль')[1];

    await userEvent.type(emailInput, 'newuser@example.com');
    await userEvent.type(passwordInput, 'Password123');

    expect(emailInput).toHaveValue('newuser@example.com');
    expect(passwordInput).toHaveValue('Password123');
  });

  it('calls supabase.auth.signUp on sign-up submission', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ error: null } as any);
    render(<AuthForm />);

    await userEvent.click(screen.getByRole('tab', { name: 'Регистрация' }));

    const emailInput = screen.getAllByLabelText('Электронная почта')[1];
    const passwordInput = screen.getAllByLabelText('Пароль')[1];
    const signUpButton = screen.getByRole('button', { name: 'Зарегистрироваться' });

    await userEvent.type(emailInput, 'newuser@example.com');
    await userEvent.type(passwordInput, 'ValidPassword123');
    await userEvent.click(signUpButton);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'ValidPassword123',
      options: {
        emailRedirectTo: expect.any(String),
      },
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success!' }));
  });

  it('shows validation error toast on invalid sign-up password', async () => {
    render(<AuthForm />);
    await userEvent.click(screen.getByRole('tab', { name: 'Регистрация' }));

    const signUpButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    const passwordInput = screen.getAllByLabelText('Пароль')[1];

    await userEvent.type(passwordInput, 'short');
    await userEvent.click(signUpButton);

    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Password must be at least 8 characters',
      variant: 'destructive',
    }));
  });

  it('shows loading state on button when submitting', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AuthForm />);

    const signInButton = screen.getByRole('button', { name: 'Войти' });
    await userEvent.click(signInButton);

    expect(screen.getByRole('button', { name: /Вход/i })).toBeDisabled();
    expect(screen.getByText(/Вход/i)).toBeInTheDocument();
  });
});
