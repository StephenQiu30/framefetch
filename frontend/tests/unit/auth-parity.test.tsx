import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from '@/components/auth/password-input';
import {
  isValidEmail,
  validateRegistration,
} from '@/components/auth/register-form-model';
import { InputGroup } from '@/components/ui/input-group';

describe('App and Web auth rules', () => {
  it('validates domain labels and reserved domains', () => {
    for (const value of ['member@example.com', 'name+tag@sub.example.cn'])
      expect(isValidEmail(value)).toBe(true);
    for (const value of [
      'a@bad.test',
      'a@-host.com',
      'a@host..com',
      'a@host.c',
      'a b@example.com',
      'a@@example.com',
    ])
      expect(isValidEmail(value)).toBe(false);
  });
  it('counts Unicode password characters like the API', () => {
    const errors = (password: string) =>
      validateRegistration({
        username: 'member',
        email: 'member@example.com',
        password,
        confirmPassword: password,
        verificationCode: '123456',
      });
    expect(errors('😀'.repeat(4)).password).toBe('密码至少需要 8 个字符');
    expect(errors('😀'.repeat(128))).toEqual({});
    expect(errors('a'.repeat(129)).password).toBe('密码不能超过 128 个字符');
  });
  it('reveals and hides the same password without losing its value', () => {
    render(
      <InputGroup>
        <PasswordInput aria-label="密码" defaultValue="secret-password" />
      </InputGroup>,
    );
    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: '显示密码' }));
    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('密码')).toHaveValue('secret-password');
    fireEvent.click(screen.getByRole('button', { name: '隐藏密码' }));
    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'password');
  });
});
