import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow, useFriendRequest, useSendMessage } from '../hooks/useSocialActions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase client
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
  },
}));

// Mock Toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSocialActions', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('useFollow calls social-follow edge function', async () => {
    const { result } = renderHook(() => useFollow(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ target_user_id: '123', action: 'follow' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('social-follow', {
      body: { target_user_id: '123', action: 'follow' },
    });
  });

  it('useFriendRequest calls social-friend-request edge function', async () => {
    const { result } = renderHook(() => useFriendRequest(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ target_user_id: '456', action: 'request' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('social-friend-request', {
      body: { target_user_id: '456', action: 'request' },
    });
  });

  it('useSendMessage calls social-send-message edge function', async () => {
    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ content: 'Hello', receiver_id: '789' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('social-send-message', {
      body: { content: 'Hello', receiver_id: '789' },
    });
  });
});
