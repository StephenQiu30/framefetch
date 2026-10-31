'use client';

import {
  ArrowRightIcon,
  CheckIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { registerUser as register, verifyRegistrationCode } from '@/api/auth';
import { AuthField, AuthPageFrame } from '@/components/auth/auth-page-frame';
import { useAuth } from '@/components/auth/auth-provider';
import { PasswordInput } from '@/components/auth/password-input';
import {
  type FieldErrors,
  isValidEmail,
  validateRegistration,
} from '@/components/auth/register-form-model';
import {
  RegistrationCodeField,
  useRegistrationCode,
} from '@/components/auth/registration-code-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldGroup } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { InputGroupInput } from '@/components/ui/input-group';
import { ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { authRedirect } from '@/lib/auth-redirect';
import { useT } from '@/lib/i18n/i18n-provider';
import { displayError } from '@/lib/request-error';
import { withWebSessionMutation } from '@/lib/session-events';
import { normalizeUsername, USERNAME_HELP } from '@/lib/username';

const steps = ['email', 'code', 'account'] as const;

type Step = (typeof steps)[number];

const stepLabel = {
  email: 'auth.stepEmail',
  code: 'auth.stepCode',
  account: 'auth.stepAccount',
} as const;

const stepDescription = {
  email: 'auth.registerEmail',
  code: 'auth.registerCode',
  account: 'auth.registerAccount',
} as const;

export function RegisterView() {
  const { user, loading, setUser } = useAuth();
  const delivery = useRegistrationCode();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
  const [redirect, setRedirect] = useState('/');
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const verifyingRef = useRef(false);
  const stepRef = useRef(step);
  const router = useRouter();
  const t = useT();
  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    const currentSearch = window.location.search;
    const destination = authRedirect(currentSearch);
    setRedirect(destination);
    setSearch(currentSearch);
    if (!loading && user) router.replace(destination);
  }, [loading, router, user]);
  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);
  useEffect(() => {
    if (stepRef.current === step) return;
    stepRef.current = step;
    const fieldId =
      step === 'code'
        ? 'register-verificationCode'
        : step === 'account'
          ? 'register-username'
          : 'register-email';
    document.getElementById(fieldId)?.focus();
  }, [step]);

  function showEmail() {
    setErrorMessage(undefined);
    setErrors({});
    setStep('email');
  }

  async function submitEmail() {
    const value = email.trim();
    if (!value) {
      setErrors({ email: '请输入邮箱地址' });
      return;
    }
    if (!isValidEmail(value)) {
      setErrors({ email: '请输入有效的邮箱地址' });
      return;
    }
    setErrors({});
    if (delivery.sent && delivery.acceptedEmail === value) {
      setStep('code');
      return;
    }
    if (await delivery.send(value)) {
      setVerificationCode('');
      setVerifiedCode('');
      setStep('code');
    }
  }

  async function submitCode(code: string) {
    if (!/^[0-9]{6}$/.test(code)) {
      setErrors({ verificationCode: '请输入邮件中的 6 位验证码' });
      return;
    }
    if (verifiedCode === code) {
      setErrors({});
      setStep('account');
      return;
    }
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setErrors({});
    setErrorMessage(undefined);
    try {
      await verifyRegistrationCode({
        email: email.trim(),
        verification_code: code,
      });
      setVerifiedCode(code);
      setStep('account');
    } catch (error) {
      setErrorMessage(displayError(error));
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const values = {
      username: normalizeUsername(String(data.get('username') ?? '')),
      email: email.trim(),
      password: String(data.get('password') ?? ''),
      confirmPassword: String(data.get('confirmPassword') ?? ''),
      verificationCode,
    };
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await withWebSessionMutation(async () => {
        const currentUser = await register({
          username: values.username,
          email: values.email,
          password: values.password,
          verification_code: values.verificationCode,
        });
        setUser(currentUser);
      });
      router.replace(redirect);
    } catch (error) {
      setErrorMessage(displayError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || submitting || delivery.sending || verifying) return;
    if (step === 'email') void submitEmail();
    else if (step === 'code') void submitCode(verificationCode);
    else void submitAccount(event);
  }

  return (
    <AuthPageFrame
      description={t(stepDescription[step])}
      title={t('auth.registerTitle')}
      titleId="register-title"
    >
      <ol
        aria-label={t('auth.registerSteps')}
        className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        {steps.map((id, index) => {
          const current = id === step;
          const done = index < stepIndex;
          return (
            <li
              aria-current={current ? 'step' : undefined}
              className="flex items-center gap-2"
              key={id}
            >
              <Badge variant={current || done ? 'default' : 'secondary'}>
                {done ? <CheckIcon aria-hidden /> : index + 1}
              </Badge>
              <ItemTitle>{t(stepLabel[id])}</ItemTitle>
            </li>
          );
        })}
      </ol>
      <Form
        aria-busy={submitting || verifying || delivery.sending}
        className="flex flex-col gap-7"
        noValidate
        onSubmit={handleSubmit}
      >
        {errorMessage ? (
          <Alert ref={errorRef} tabIndex={-1} variant="destructive">
            <WarningCircleIcon aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {step === 'email' ? (
          <FieldGroup className="gap-5">
            <AuthField
              error={errors.email}
              idPrefix="register"
              label="邮箱地址"
              name="email"
            >
              <InputGroupInput
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                disabled={delivery.sending}
                id="register-email"
                name="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setVerificationCode('');
                  setVerifiedCode('');
                  delivery.dismiss();
                  setErrors((current) =>
                    current.email ? { ...current, email: undefined } : current,
                  );
                }}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </AuthField>
            {delivery.message ? (
              <FieldDescription role="status">
                {delivery.message}
              </FieldDescription>
            ) : null}
            <Button
              className="w-full"
              disabled={loading || delivery.sending}
              type="submit"
            >
              {delivery.sending ? (
                <Spinner aria-hidden data-icon="inline-start" />
              ) : null}
              {delivery.sending ? '正在发送…' : '获取验证码'}
              {!delivery.sending ? (
                <ArrowRightIcon aria-hidden data-icon="inline-end" />
              ) : null}
            </Button>
          </FieldGroup>
        ) : null}
        {step === 'code' ? (
          <div className="flex flex-col gap-5">
            <FieldDescription>
              验证码已发送到 {email.trim()}。{' '}
              <Button type="button" variant="link" onClick={showEmail}>
                修改邮箱
              </Button>
            </FieldDescription>
            <RegistrationCodeField
              code={verificationCode}
              delivery={delivery}
              disabled={verifying}
              email={email}
              error={errors.verificationCode}
              onCodeChange={(value) => {
                setVerificationCode(value);
                if (value !== verifiedCode) setVerifiedCode('');
                setErrors((current) =>
                  current.verificationCode
                    ? { ...current, verificationCode: undefined }
                    : current,
                );
              }}
              onComplete={(value) => void submitCode(value)}
            >
              <Button
                className="w-full"
                disabled={
                  loading || verifying || !/^[0-9]{6}$/.test(verificationCode)
                }
                type="submit"
              >
                {verifying ? (
                  <Spinner aria-hidden data-icon="inline-start" />
                ) : null}
                {verifying ? '正在验证…' : '继续'}
                {!verifying ? (
                  <ArrowRightIcon aria-hidden data-icon="inline-end" />
                ) : null}
              </Button>
            </RegistrationCodeField>
          </div>
        ) : null}
        {step === 'account' ? (
          <FieldGroup className="gap-5">
            <FieldDescription>
              正在为 {email.trim()} 创建账户。{' '}
              <Button
                type="button"
                variant="link"
                onClick={() => setStep('code')}
              >
                返回验证码
              </Button>
            </FieldDescription>
            <AuthField
              description={USERNAME_HELP}
              error={errors.username}
              idPrefix="register"
              label="用户名"
              name="username"
            >
              <InputGroupInput
                aria-describedby={
                  errors.username
                    ? 'username-description username-error'
                    : 'username-description'
                }
                aria-invalid={Boolean(errors.username)}
                autoComplete="username"
                id="register-username"
                name="username"
                placeholder="2–32 个字符"
              />
            </AuthField>
            <AuthField
              description="至少 8 个字符"
              error={errors.password}
              idPrefix="register"
              label="密码"
              name="password"
            >
              <PasswordInput
                aria-describedby={
                  errors.password
                    ? 'password-description password-error'
                    : 'password-description'
                }
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                id="register-password"
                minLength={8}
                name="password"
                placeholder="设置密码"
                type="password"
              />
            </AuthField>
            <AuthField
              error={errors.confirmPassword}
              idPrefix="register"
              label="确认密码"
              name="confirmPassword"
            >
              <PasswordInput
                aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                }
                aria-invalid={Boolean(errors.confirmPassword)}
                autoComplete="new-password"
                id="register-confirmPassword"
                name="confirmPassword"
                placeholder="再次输入密码"
                type="password"
              />
            </AuthField>
            <Button
              className="w-full"
              disabled={loading || submitting}
              type="submit"
            >
              {submitting ? (
                <Spinner aria-hidden data-icon="inline-start" />
              ) : null}
              {submitting ? '正在创建…' : '注册并登录'}
              {!submitting ? (
                <ArrowRightIcon aria-hidden data-icon="inline-end" />
              ) : null}
            </Button>
          </FieldGroup>
        ) : null}
      </Form>
      <FieldDescription className="mt-7">
        已有账户？{' '}
        <Button asChild variant="link">
          <Link href={`/user/login${search}`}>返回登录</Link>
        </Button>
      </FieldDescription>
    </AuthPageFrame>
  );
}
