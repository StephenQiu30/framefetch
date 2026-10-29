import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerUser,
  sendRegistrationCode,
  verifyRegistrationCode,
} from '@/api/auth';
import { RegisterView } from '@/components/auth/register-view';

const runtime = vi.hoisted(() => ({
  replace: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    loading: false,
    setUser: runtime.setUser,
    user: undefined,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: runtime.replace }),
}));

vi.mock('@/api/auth', async (original) => ({
  ...(await original<typeof import('@/api/auth')>()),
  registerUser: vi.fn(),
  sendRegistrationCode: vi.fn(),
  verifyRegistrationCode: vi.fn(),
}));

describe('registration submit', () => {
  beforeEach(() => {
    runtime.replace.mockReset();
    runtime.setUser.mockReset();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, _options: unknown, callback: () => unknown) =>
          Promise.resolve(callback()),
      },
    });
  });

  it('registers only after the email code is complete and the account fields are submitted', async () => {
    vi.mocked(sendRegistrationCode).mockResolvedValue({
      email_sent: true,
      expires_in_seconds: 600,
      retry_after_seconds: 60,
    });
    vi.mocked(verifyRegistrationCode).mockResolvedValue({ verified: true });
    vi.mocked(registerUser).mockResolvedValue({
      avatar_version: null,
      created_at: '2026-01-01T00:00:00Z',
      email: 'member@example.com',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'user',
      updated_at: '2026-01-01T00:00:00Z',
      username: 'member',
    });
    render(<RegisterView />);
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('邮箱地址'), {
      target: { value: 'member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await screen.findByLabelText('邮箱验证码');
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();

    fireEvent.input(screen.getByLabelText('邮箱验证码'), {
      target: { value: '123456' },
    });
    await screen.findByLabelText('用户名');
    expect(verifyRegistrationCode).toHaveBeenCalledWith({
      email: 'member@example.com',
      verification_code: '123456',
    });

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'member' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'strong-password' },
    });
    fireEvent.change(screen.getByLabelText('确认密码'), {
      target: { value: 'strong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: '注册并登录' }));

    await waitFor(() =>
      expect(registerUser).toHaveBeenCalledWith({
        email: 'member@example.com',
        password: 'strong-password',
        username: 'member',
        verification_code: '123456',
      }),
    );
    expect(runtime.setUser).toHaveBeenCalledOnce();
    expect(runtime.replace).toHaveBeenCalledWith('/');
  });
});
