import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { AuthForm } from '../AuthForm';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

// Mock toast hook
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
      mockSignIn.mockResolvedValue({ data: null, error: null } as any);

      render(<AuthForm />);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    it('calls signInWithPassword with valid credentials', async () => {
      const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);
      mockSignIn.mockResolvedValue({ data: { user: {}, session: {} }, error: null } as any);

      render(<AuthForm />);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
        });
      });
    });
  });

  describe('Sign Up', () => {
    it('switches to sign up form when tab is clicked', () => {
      render(<AuthForm />);
      
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      fireEvent.click(signUpTab);

      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      const mockSignUp = vi.mocked(supabase.auth.signUp);
      
      render(<AuthForm />);
      
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      // Test weak password
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it('calls signUp with valid credentials', async () => {
      const mockSignUp = vi.mocked(supabase.auth.signUp);
      mockSignUp.mockResolvedValue({ data: { user: {}, session: {} }, error: null } as any);

      render(<AuthForm />);
      
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
      fireEvent.click(submitButton);

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
      const mockSignUp = vi.mocked(supabase.auth.signUp);
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<AuthForm />);
      
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      expect(emailInput.disabled).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AuthForm />);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });
  });
});
