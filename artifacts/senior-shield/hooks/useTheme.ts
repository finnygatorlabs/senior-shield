import { usePreferences } from "@/context/PreferencesContext";
import { Colors } from "@/constants/colors";

export function useTheme() {
  const { prefs } = usePreferences();
  const isDark = prefs.color_scheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  return { theme, isDark, Colors };
}
