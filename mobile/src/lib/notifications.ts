import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERMISSION_REQUESTED_KEY = "notif_permission_requested";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function hasRequestedPermission(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
  return val !== null;
}

export async function markPermissionRequested(): Promise<void> {
  await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "1");
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sudah catat hari ini?",
      body: "Jangan lupa catat pengeluaranmu hari ini 📝",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
