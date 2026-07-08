import { useCallback, useState } from "react";

import {
  hasRequestedPermission,
  markPermissionRequested,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { useNotificationStore } from "@/stores/notifications";

// OS-level decline can't be re-prompted without a Settings trip, so gate behind an in-app sheet first.
export function useNotificationPermissionGate() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const { dailyReminderHour, dailyReminderMinute, setDailyReminder } = useNotificationStore();

  const promptIfNeeded = useCallback(async (): Promise<boolean> => {
    const alreadyAsked = await hasRequestedPermission();
    if (alreadyAsked) return false;
    setSheetVisible(true);
    return true;
  }, []);

  const acceptPermission = useCallback(async () => {
    setSheetVisible(false);
    await markPermissionRequested();
    const granted = await requestNotificationPermission();
    if (granted) {
      setDailyReminder(true, dailyReminderHour, dailyReminderMinute);
      await scheduleDailyReminder(dailyReminderHour, dailyReminderMinute);
    }
  }, [dailyReminderHour, dailyReminderMinute, setDailyReminder]);

  const declinePermission = useCallback(async () => {
    setSheetVisible(false);
    await markPermissionRequested();
  }, []);

  return { sheetVisible, promptIfNeeded, acceptPermission, declinePermission };
}
