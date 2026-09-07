import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicHome } from '@/components/intake/public-home';

describe('PublicHome', () => {
  it('keeps the public conversion and documentation paths available', () => {
    render(<PublicHome />);

    expect(screen.getByRole('link', { name: /创建本地账户/ })).toHaveAttribute(
      'href',
      '/user/register',
    );
    expect(screen.getByRole('link', { name: /查看源代码/ })).toHaveAttribute(
      'href',
      'https://github.com/StephenQiu30/video-server',
    );
    expect(screen.getByRole('link', { name: /阅读部署说明/ })).toHaveAttribute(
      'href',
      'https://github.com/StephenQiu30/video-server/blob/main/README.md#快速开始',
    );
  });
});
