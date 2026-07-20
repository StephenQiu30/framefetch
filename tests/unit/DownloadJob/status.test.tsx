import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDownloadUrl, useDownloadJob } from '@/pages/DownloadJob/hooks';
import { videoApi } from '@/utils/videoApi';

const job = {
  id: 'job-1',
  status: 'queued',
  stage: null,
  progress_percent: null,
  downloaded_bytes: null,
  total_bytes: null,
  error: null,
  artifact: null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('DownloadJob polling and file navigation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('polls only active jobs at the two-second interval', async () => {
    const getDownload = vi
      .spyOn(videoApi, 'getDownload')
      .mockResolvedValue(job);
    const { result } = renderHook(() => useDownloadJob('job-1'), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe('queued'));
    expect(getDownload).toHaveBeenCalledTimes(1);
  });

  it('navigates to a signed URL only when explicitly requested', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    openDownloadUrl('https://minio.example.test/signed/path');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('a')).toBeNull();
  });
});
