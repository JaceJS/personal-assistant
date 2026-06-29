jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  hasRequestedPermission,
  markPermissionRequested,
} from "../notifications";

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockCancel = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("requestNotificationPermission", () => {
  it("returns true when permission already granted", async () => {
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    expect(await requestNotificationPermission()).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("requests permission when not yet granted", async () => {
    mockGetPermissions.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    expect(await requestNotificationPermission()).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });

  it("returns false when user denies permission", async () => {
    mockGetPermissions.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissions.mockResolvedValue({ status: "denied" });
    expect(await requestNotificationPermission()).toBe(false);
  });
});

describe("scheduleDailyReminder", () => {
  it("cancels existing and schedules new notification", async () => {
    await scheduleDailyReminder(21, 0);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it("uses correct hour and minute in trigger", async () => {
    await scheduleDailyReminder(20, 30);
    const call = mockSchedule.mock.calls[0][0] as { trigger: { hour: number; minute: number } };
    expect(call.trigger.hour).toBe(20);
    expect(call.trigger.minute).toBe(30);
  });
});

describe("cancelDailyReminder", () => {
  it("cancels all scheduled notifications", async () => {
    await cancelDailyReminder();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});

describe("hasRequestedPermission / markPermissionRequested", () => {
  it("returns false when key not in storage", async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await hasRequestedPermission()).toBe(false);
  });

  it("returns true when key present in storage", async () => {
    mockGetItem.mockResolvedValue("1");
    expect(await hasRequestedPermission()).toBe(true);
  });

  it("writes key to storage", async () => {
    await markPermissionRequested();
    expect(mockSetItem).toHaveBeenCalledWith("notif_permission_requested", "1");
  });
});
