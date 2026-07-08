let mockAlreadyAsked = false;

jest.mock("@/lib/notifications", () => ({
  hasRequestedPermission: jest.fn(() => Promise.resolve(mockAlreadyAsked)),
  markPermissionRequested: jest.fn(() => Promise.resolve()),
  requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
  scheduleDailyReminder: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/stores/notifications", () => ({
  useNotificationStore: () => ({
    dailyReminderHour: 21,
    dailyReminderMinute: 0,
    setDailyReminder: jest.fn(),
  }),
}));

import { act, renderHook } from "@testing-library/react-native";
import { useNotificationPermissionGate } from "../useNotificationPermissionGate";
import {
  hasRequestedPermission,
  markPermissionRequested,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/lib/notifications";

const mockHasAsked = hasRequestedPermission as jest.Mock;
const mockMarkAsked = markPermissionRequested as jest.Mock;
const mockRequestPermission = requestNotificationPermission as jest.Mock;
const mockSchedule = scheduleDailyReminder as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAlreadyAsked = false;
  mockHasAsked.mockImplementation(() => Promise.resolve(mockAlreadyAsked));
});

describe("useNotificationPermissionGate", () => {
  it("shows the sheet and does not call the OS permission API when never asked before", async () => {
    const { result } = await renderHook(() => useNotificationPermissionGate());

    let shown = false;
    await act(async () => {
      shown = await result.current.promptIfNeeded();
    });

    expect(shown).toBe(true);
    expect(result.current.sheetVisible).toBe(true);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("skips the sheet and returns false when already asked", async () => {
    mockAlreadyAsked = true;
    const { result } = await renderHook(() => useNotificationPermissionGate());

    let shown = true;
    await act(async () => {
      shown = await result.current.promptIfNeeded();
    });

    expect(shown).toBe(false);
    expect(result.current.sheetVisible).toBe(false);
  });

  it("only calls the OS permission API and schedules a reminder after acceptPermission", async () => {
    const { result } = await renderHook(() => useNotificationPermissionGate());

    await act(async () => {
      await result.current.promptIfNeeded();
    });
    expect(mockRequestPermission).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.acceptPermission();
    });

    expect(mockMarkAsked).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(21, 0);
    expect(result.current.sheetVisible).toBe(false);
  });

  it("marks as requested but never calls the OS permission API on decline", async () => {
    const { result } = await renderHook(() => useNotificationPermissionGate());

    await act(async () => {
      await result.current.promptIfNeeded();
    });

    await act(async () => {
      await result.current.declinePermission();
    });

    expect(mockMarkAsked).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(result.current.sheetVisible).toBe(false);
  });
});
