import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from '../AuthForm';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sign In', () => {
    it('renders sign in form by default', () => {
      render(<AuthForm />);
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('validates email format on sign in', async () => {
      const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);
      render(<AuthForm />);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    it('calls signInWithPassword with valid credentials', async () => {
      const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);
      render(<AuthForm />);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
        });
      });
    });
  });

  describe('Sign Up', () => {
    it('switches to sign up form when tab is clicked', async () => {
      render(<AuthForm />);
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await userEvent.click(signUpTab);

      // Wait for the sign-up button to be visible, confirming the tab switch
      const signUpButton = await screen.findByRole('button', { name: /sign up/i, type: 'submit' });
      expect(signUpButton).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      render(<AuthForm />);
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await userEvent.click(signUpTab);

      const submitButton = await screen.findByRole('button', { name: /sign up/i, type: 'submit' });
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');

      const mockSignUp = vi.mocked(supabase.auth.signUp);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'weak');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it('calls signUp with valid credentials', async () => {
      render(<AuthForm />);
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await userEvent.click(signUpTab);

      const submitButton = await screen.findByRole('button', { name: /sign up/i, type: 'submit' });
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');

      const mockSignUp = vi.mocked(supabase.auth.signUp);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'ValidPass123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'ValidPass123',
          options: {
            emailRedirectTo: expect.any(String),
          },
        });
      });
    });

    it('disables form inputs while loading', async () => {
      render(<AuthForm />);
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      await userEvent.click(signUpTab);

      const submitButton = await screen.findByRole('button', { name: /sign up/i, type: 'submit' });
      const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;

      const mockSignUp = vi.mocked(supabase.auth.signUp);
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'ValidPass123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // After loading, the button should be re-enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      }, { timeout: 200 });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AuthForm />);
      
      const emailInputs = screen.getAllByPlaceholderText('Email');
      const passwordInputs = screen.getAllByPlaceholderText('Password');

      emailInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveAttribute('required');
      });

      passwordInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'password');
        expect(input).toHaveAttribute('required');
      });
    });
  });
});
