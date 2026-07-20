import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInspectFlow } from '@/pages/Download/hooks';
import { videoApi } from '@/utils/videoApi';

const media = {
  id: 'source-1',
  title: '公开演示视频',
  platform: 'example',
  thumbnail_url: null,
  duration_seconds: 90,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  formats: [
    {
      id: 'format-1',
      label: '720p',
      width: 1280,
      height: 720,
      fps: 30,
      container: 'mp4',
      video_codec: 'h264',
      audio_codec: 'aac',
      estimated_size_bytes: null,
      requires_merge: false,
    },
  ],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Download inspect flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clears old result and sends one inspect request', async () => {
    const inspect = vi.spyOn(videoApi, 'inspect').mockResolvedValue(media);
    const { result } = renderHook(() => useInspectFlow(), { wrapper });

    await result.current.inspect('https://example.test/video');

    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledWith(
      { url: 'https://example.test/video' },
      expect.any(Object),
    );
    await waitFor(() => expect(result.current.state).toBe('inspected'));
    expect(result.current.media?.formats[0]?.label).toBe('720p');
  });

  it('sends only the three create contract fields and exposes the returned job id', async () => {
    vi.spyOn(videoApi, 'inspect').mockResolvedValue(media);
    const create = vi
      .spyOn(videoApi, 'createDownload')
      .mockResolvedValue({ id: 'job-1' });
    const { result } = renderHook(() => useInspectFlow(), { wrapper });
    await result.current.inspect('https://example.test/video');
    await waitFor(() => expect(result.current.media?.id).toBe('source-1'));
    const jobId = await result.current.createDownload(
      result.current.media?.formats[0] ?? null,
    );

    expect(jobId).toBe('job-1');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      source_id: 'source-1',
      format_id: 'format-1',
      client_request_id: expect.any(String),
    });
    expect(Object.keys(create.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
      'client_request_id',
      'format_id',
      'source_id',
    ]);
  });

  it('does not let a stale inspect response replace the newest request', async () => {
    let resolveFirst!: (value: unknown) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const second = Promise.resolve({ ...media, id: 'source-2' });
    vi.spyOn(videoApi, 'inspect')
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const { result } = renderHook(() => useInspectFlow(), { wrapper });
    const firstRequest = result.current.inspect('https://example.test/first');
    await result.current.inspect('https://example.test/second');
    resolveFirst({ ...media, id: 'source-1' });
    await firstRequest;

    await waitFor(() => expect(result.current.media?.id).toBe('source-2'));
  });
});
