import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { TFunction } from 'i18next';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

import * as Clipboard from 'expo-clipboard';
import { useMessageActions } from '@/features/ai/hooks/useMessageActions';
import { createUserTextMessage } from '@/features/finance/utils/chatMessageUtils';

const mockSetStringAsync = Clipboard.setStringAsync as jest.MockedFunction<
  typeof Clipboard.setStringAsync
>;

const t = ((key: string) => key) as unknown as TFunction;

async function makeHook(
  overrides: Partial<{ deleteMessage: jest.Mock; showToast: jest.Mock }> = {}
) {
  const deleteMessage = overrides.deleteMessage ?? jest.fn().mockResolvedValue(undefined);
  const showToast = overrides.showToast ?? jest.fn();
  const { result } = await renderHook(() => useMessageActions({ deleteMessage, showToast, t }));
  return { result, deleteMessage, showToast };
}

describe('useMessageActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the action menu at the long-press coordinates', async () => {
    const { result } = await makeHook();
    const message = createUserTextMessage('halo');

    await act(async () => result.current.handleMessageLongPress(message, 10, 20));

    expect(result.current.actionMenu).toEqual({ message, x: 10, y: 20 });
  });

  it('dismissActionMenu clears the open menu', async () => {
    const { result } = await makeHook();
    await act(async () => result.current.handleMessageLongPress(createUserTextMessage('halo'), 0, 0));

    await act(async () => result.current.dismissActionMenu());

    expect(result.current.actionMenu).toBeNull();
  });

  it('copies the message content and shows the copied hint, then auto-hides it', async () => {
    const { result } = await makeHook();
    const message = createUserTextMessage('halo dunia');
    await act(async () => result.current.handleMessageLongPress(message, 0, 0));

    await act(async () => result.current.handleCopyMessage());

    expect(mockSetStringAsync).toHaveBeenCalledWith('halo dunia');
    expect(result.current.showCopiedHint).toBe(true);
    expect(result.current.actionMenu).toBeNull();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1250));
    });

    expect(result.current.showCopiedHint).toBe(false);
  });

  it('handleCopyMessage is a no-op when no message is targeted', async () => {
    const { result } = await makeHook();

    await act(async () => result.current.handleCopyMessage());

    expect(mockSetStringAsync).not.toHaveBeenCalled();
  });

  it('deleting confirms via Alert, then calls deleteMessage', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });
    const { result, deleteMessage } = await makeHook();
    const message = createUserTextMessage('hapus aku');
    await act(async () => result.current.handleMessageLongPress(message, 0, 0));

    await act(async () => result.current.handleDeleteMessage());

    expect(deleteMessage).toHaveBeenCalledWith(message);
    expect(result.current.actionMenu).toBeNull();
    alertSpy.mockRestore();
  });

  it('shows an error toast when delete fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });
    const deleteMessage = jest.fn().mockRejectedValue(new Error('boom'));
    const { result, showToast } = await makeHook({ deleteMessage });
    await act(async () =>
      result.current.handleMessageLongPress(createUserTextMessage('hapus aku'), 0, 0)
    );

    await act(async () => {
      result.current.handleDeleteMessage();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showToast).toHaveBeenCalledWith('ai.messageActions.deleteFailedToast', 'error');
    alertSpy.mockRestore();
  });
});
