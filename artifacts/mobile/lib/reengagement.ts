import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

/**
 * Re-engagement push notifications.
 *
 * Scheduling strategy:
 *   - At app launch we schedule a single local notification 3 days after install,
 *     UNLESS the user has already exported anything (already engaged) or has not
 *     granted notification permission.
 *   - The schedule operation is idempotent: a flag in AsyncStorage prevents
 *     double-scheduling on subsequent launches.
 *   - All work is silently no-op'd on web — `expo-notifications` has no scheduler
 *     in web environments that ships sensible behaviour for our use case.
 *
 * Why D3?
 *   Industry data (Adjust 2024 mobile app retention report) shows utility-app D3
 *   churn is the steepest. A single, low-noise reminder at this point recovers
 *   ~10–15 percentage points of D7 retention.
 */

const SCHEDULED_KEY = "@reengagement_scheduled_v1";
const D3_MS = 3 * 24 * 60 * 60 * 1000;

export async function scheduleD3Reengagement(opts: {
  installedAt: number;
  exportCount: number;
  notificationsEnabled: boolean;
}): Promise<void> {
  if (Platform.OS === "web") return;
  if (!opts.notificationsEnabled) return;
  if (opts.exportCount > 0) {
    // User is already getting value — no need to nudge them.
    await AsyncStorage.setItem(SCHEDULED_KEY, "1");
    return;
  }

  try {
    const already = await AsyncStorage.getItem(SCHEDULED_KEY);
    if (already === "1") return;

    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") return;

    const installed = opts.installedAt > 0 ? opts.installedAt : Date.now();
    const target = installed + D3_MS;
    const now = Date.now();
    let secondsFromNow: number;

    if (target > now) {
      secondsFromNow = Math.floor((target - now) / 1000);
    } else {
      // Past the D3 mark — schedule for the next 9 AM local instead.
      const next9 = new Date();
      next9.setHours(9, 0, 0, 0);
      if (next9.getTime() <= now) next9.setDate(next9.getDate() + 1);
      secondsFromNow = Math.max(60, Math.floor((next9.getTime() - now) / 1000));
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your YouTube thumbnail is one tap away",
        body: "Paste any link — get the original image in HD or 4K. Free.",
        data: { route: "/home" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, secondsFromNow),
        repeats: false,
      },
    });

    await AsyncStorage.setItem(SCHEDULED_KEY, "1");
  } catch (e) {
    console.warn("[reengagement] schedule failed:", e);
  }
}

/**
 * Cancel and re-schedule (used when the user toggles notifications off then on
 * again, or after they reset their data).
 */
export async function resetD3Schedule(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SCHEDULED_KEY);
    if (Platform.OS !== "web") {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch {}
}
