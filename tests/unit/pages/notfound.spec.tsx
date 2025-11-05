import { describe, it, expect, vi } from 'vitest';
// Явно подключаем jest-dom матчеры для совместимости редактора и типов
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../../../src/pages/NotFound';

// Локальный мок Supabase для контроля сессии
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
    },
  },
}));

describe('NotFound page', () => {
  it('показывает ссылку на Workspace при авторизации', async () => {
    render(
      <MemoryRouter initialEntries={["/nonexistent"]}>
        <NotFound />
      </MemoryRouter>
    );

    // Ожидаем появление ссылки "Go to Workspace"
    const link = await screen.findByText(/Go to Workspace/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/workspace/dashboard');
  });

  it('показывает ссылку на главную при отсутствии сессии', async () => {
    const { supabase } = await import('../../../src/integrations/supabase/client');
    // Меняем мок на отсутствие сессии
    // @ts-expect-error — тестовая замена
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    const link = await screen.findByText(/Return to Home/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});