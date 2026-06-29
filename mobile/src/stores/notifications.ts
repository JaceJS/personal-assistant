import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface NotificationState {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  setDailyReminder: (enabled: boolean, hour?: number, minute?: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      dailyReminderEnabled: false,
      dailyReminderHour: 21,
      dailyReminderMinute: 0,
      setDailyReminder: (enabled, hour, minute) =>
        set((s) => ({
          dailyReminderEnabled: enabled,
          dailyReminderHour: hour ?? s.dailyReminderHour,
          dailyReminderMinute: minute ?? s.dailyReminderMinute,
        })),
    }),
    {
      name: "notification-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
