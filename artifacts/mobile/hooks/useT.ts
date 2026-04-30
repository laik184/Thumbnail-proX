import { useSettings } from "@/contexts/SettingsContext";
import { getString } from "@/constants/i18n";

export function useT() {
  const { language } = useSettings();
  return (key: Parameters<typeof getString>[1]) => getString(language, key);
}
