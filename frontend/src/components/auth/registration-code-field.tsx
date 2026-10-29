'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { sendRegistrationCode as requestRegistrationCode } from '@/api/auth';
import { isValidEmail } from '@/components/auth/register-form-model';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { displayError } from '@/lib/request-error';

const CODE_SLOTS = [0, 1, 2, 3, 4, 5] as const;

export function useRegistrationCode() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [acceptedEmail, setAcceptedEmail] = useState('');
  const [until, setUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    if (!until) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  async function send(email: string): Promise<boolean> {
    if (busy.current) return false;
    if (
      until > Date.now() &&
      acceptedEmail === email.trim() &&
      acceptedEmail !== ''
    ) {
      return false;
    }
    if (!isValidEmail(email.trim())) {
      setMessage('请先输入有效的邮箱地址。');
      return false;
    }
    busy.current = true;
    setSending(true);
    setMessage('');
    try {
      const result = await requestRegistrationCode({ email: email.trim() });
      if (!mounted.current) return false;
      if (!result.email_sent) {
        setMessage('邮件发送未能确认，请稍后重新获取验证码。');
        return false;
      }
      setSent(true);
      setAcceptedEmail(email.trim());
      setUntil(
        Date.now() + Math.max(0, result.retry_after_seconds ?? 0) * 1000,
      );
      const seconds = result.expires_in_seconds;
      const expiry =
        seconds && seconds > 0
          ? `有效期 ${new Intl.NumberFormat('zh-CN').format(seconds % 60 === 0 ? seconds / 60 : seconds)} ${seconds % 60 === 0 ? '分钟' : '秒'}。`
          : '有效期请查看邮件说明。';
      setMessage(`验证码已发送，${expiry}未收到时请检查垃圾邮件。`);
      return true;
    } catch (failure) {
      if (mounted.current) setMessage(displayError(failure));
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return {
    acceptedEmail,
    dismiss: () => setMessage(''),
    message,
    remaining,
    send,
    sending,
    sent,
  };
}

export function RegistrationCodeField({
  email,
  code,
  onCodeChange,
  onComplete,
  disabled,
  error,
  delivery,
  children,
}: {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled: boolean;
  error?: string;
  delivery: ReturnType<typeof useRegistrationCode>;
  children?: ReactNode;
}) {
  const describedBy = [
    'verification-code-status',
    error ? 'verificationCode-error' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-5">
      <FieldDescription id="verification-code-status" role="status">
        {delivery.message || '验证码会发送到上面的邮箱。'}
      </FieldDescription>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="register-verificationCode">邮箱验证码</FieldLabel>
        <InputOTP
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          autoComplete="one-time-code"
          containerClassName="w-full"
          disabled={disabled || delivery.sending}
          id="register-verificationCode"
          inputMode="numeric"
          maxLength={CODE_SLOTS.length}
          onChange={onCodeChange}
          onComplete={onComplete}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
        >
          <InputOTPGroup>
            {CODE_SLOTS.map((slot) => (
              <InputOTPSlot
                aria-invalid={error ? true : undefined}
                index={slot}
                key={slot}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldError id="verificationCode-error">{error}</FieldError>
      </Field>
      {children}
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || delivery.sending || delivery.remaining > 0}
          onClick={() => {
            void delivery.send(email).then((sent) => {
              if (sent) onCodeChange('');
            });
          }}
        >
          {delivery.sending ? (
            <Spinner aria-hidden data-icon="inline-start" />
          ) : null}
          {delivery.sending
            ? '正在发送…'
            : delivery.remaining > 0
              ? `${delivery.remaining} 秒后可重发`
              : delivery.sent
                ? '重新获取验证码'
                : '获取验证码'}
        </Button>
      </div>
    </div>
  );
}
