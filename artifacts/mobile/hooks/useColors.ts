import { useSettings } from "@/contexts/SettingsContext";
import colors from "@/constants/colors";

export function useColors() {
  const { darkMode, isLoaded } = useSettings();

  // Default to dark mode at all times (including before settings load)
  // unless the user has explicitly opted into light mode in Settings.
  const isDark = isLoaded ? darkMode : true;
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, isDark };
}
