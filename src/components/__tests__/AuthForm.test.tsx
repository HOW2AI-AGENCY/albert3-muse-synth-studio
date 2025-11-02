import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '../AuthForm';

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  },
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in tab by default', () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('validates email format on sign in', async () => {
    render(<AuthForm />);
    
    const emailInputs = screen.getAllByPlaceholderText('you@example.com');
    const passwordInputs = screen.getAllByPlaceholderText(/введите пароль/i);
    
    fireEvent.change(emailInputs[0], { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'Test1234' } });
    
    const signInButton = screen.getByRole('button', { name: /войти/i });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });
  });

  it('switches to sign up tab', () => {
    render(<AuthForm />);
    
    const signUpTab = screen.getByRole('tab', { name: /регистрация/i });
    fireEvent.click(signUpTab);
    
    expect(screen.getAllByPlaceholderText('you@example.com')).toHaveLength(2);
  });
});
