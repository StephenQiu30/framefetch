import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sendRegistrationCode as requestRegistrationCode } from '@/api/auth';
import {
  RegistrationCodeField,
  useRegistrationCode,
} from '@/components/auth/registration-code-field';
import { ApiError } from '@/lib/request-error';

function FieldProbe({ email }: { email: string }) {
  const delivery = useRegistrationCode();
  return (
    <RegistrationCodeField
      code=""
      delivery={delivery}
      disabled={false}
      email={email}
      onCodeChange={vi.fn()}
    />
  );
}

function field(email = 'member@example.com') {
  return render(<FieldProbe email={email} />);
}

describe('registration email proof', () => {
  it('confirms SMTP acceptance and disables resend during the server cooldown', async () => {
    vi.mocked(requestRegistrationCode).mockResolvedValue({
      email_sent: true,
      retry_after_seconds: 60,
      expires_in_seconds: 600,
    });
    field();
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('验证码已发送'),
    );
    expect(requestRegistrationCode).toHaveBeenCalledWith({
      email: 'member@example.com',
    });
    expect(
      await screen.findByRole('button', { name: /秒后可重发/ }),
    ).toBeDisabled();
  });
  it('shows a send failure without claiming success', async () => {
    vi.mocked(requestRegistrationCode).mockRejectedValue(
      new ApiError(503, 'email_send_failed', 'Failed', 'Failed'),
    );
    field();
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('邮件发送未能确认'),
    );
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeEnabled();
  });

  it.each([
    [180, '3 分钟'],
    [95, '95 秒'],
  ])('uses the server validity of %i seconds', async (expires, label) => {
    vi.mocked(requestRegistrationCode).mockResolvedValue({
      email_sent: true,
      retry_after_seconds: 35,
      expires_in_seconds: expires,
    });
    field();
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(`有效期 ${label}`),
    );
    expect(
      await screen.findByRole('button', { name: '35 秒后可重发' }),
    ).toBeDisabled();
  });

  it('does not invent expiry or cooldown when the server omits them', async () => {
    vi.mocked(requestRegistrationCode).mockResolvedValue({ email_sent: true });
    field();
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '有效期请查看邮件说明',
      ),
    );
    expect(
      screen.getByRole('button', { name: '重新获取验证码' }),
    ).toBeEnabled();
  });
  it('checks the email before sending', async () => {
    vi.mocked(requestRegistrationCode).mockClear();
    field('bad-email');
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '请先输入有效的邮箱地址',
    );
    expect(requestRegistrationCode).not.toHaveBeenCalled();
  });

  it('keeps the code field available before a message is sent', () => {
    field();
    expect(screen.getByLabelText('邮箱验证码')).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      '验证码会发送到上面的邮箱',
    );
    expect(
      screen.queryByRole('button', { name: '验证邮箱' }),
    ).not.toBeInTheDocument();
  });
});

vi.mock('@/api/auth', async (original) => ({
  ...(await original<typeof import('@/api/auth')>()),
  sendRegistrationCode: vi.fn(),
}));
