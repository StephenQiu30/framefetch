import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DownloadState, {
  DownloadTaskActions,
} from '@/components/downloads/download-state';
import { job } from '../fixtures/download-fixtures';

describe('server artifact readiness is not device delivery', () => {
  it.each(['video', 'image_gallery', 'video_collection'] as const)(
    'does not claim a %s was saved when the browser download has no completion signal',
    (media_kind) => {
      const onDownload = vi.fn();
      render(
        <>
          <DownloadState job={{ ...job('succeeded'), media_kind }} />
          <DownloadTaskActions
            action={null}
            job={{ ...job('succeeded'), media_kind }}
            onDownload={onDownload}
            onRetry={vi.fn()}
          />
        </>,
      );

      expect(
        screen.getByRole('region', { name: '下载进度与执行' }),
      ).toHaveTextContent('服务端已完成');
      expect(screen.getByText(/文件已在服务器完成校验/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /获取|保存到本机/ }));
      expect(onDownload).toHaveBeenCalledOnce();
      expect(
        screen.queryByText(/已保存到设备|下载已完成/),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/保存结果请查看浏览器下载记录/),
      ).toBeInTheDocument();
    },
  );
});

it('requires manual recovery for a terminal validation failure and reserves auto retry for retry_wait', () => {
  const failed = {
    ...job('failed'),
    error_code: 'media_validation_failed' as const,
  };
  const { rerender } = render(<DownloadState job={failed} />);
  expect(
    screen.queryByText(/系统会重新下载并再次验证/),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/重新获取|重新解析|手动/)).toBeInTheDocument();
  rerender(<DownloadState job={{ ...failed, status: 'retry_wait' }} />);
  expect(screen.getByText(/自动继续/)).toBeInTheDocument();
});

it('shows the safe validation reason while hiding unrelated raw provider errors', () => {
  const failure = {
    ...job('failed'),
    error_code: 'media_validation_failed' as const,
    error_message:
      '文件校验未通过：帧率档位与确认规格不一致（期望 fps_30，实测 fps_60）',
  };
  const { rerender } = render(<DownloadState job={failure} />);
  expect(screen.getByText(/期望 fps_30，实测 fps_60/)).toBeInTheDocument();
  rerender(
    <DownloadState
      job={{ ...failure, error_message: 'raw private provider stderr' }}
    />,
  );
  expect(screen.queryByText(/raw private/)).not.toBeInTheDocument();
});
