export interface AdminSettings {
  theme: "dark" | "light" | "system";
  notifications: boolean;
  sound: boolean;
  volume: number;
  notificationDuration: 5 | 8 | 15;
  compact: boolean;
}

export const DEFAULT_SETTINGS: AdminSettings = Object.freeze({
  theme: "dark",
  notifications: true,
  sound: true,
  volume: 70,
  notificationDuration: 8,
  compact: false,
});

export function normalizeSettings(value: Partial<AdminSettings> | null | undefined): AdminSettings {
  const input = value && typeof value === "object" ? value : {};
  return {
    theme: ["dark", "light", "system"].includes(input.theme ?? "")
      ? input.theme!
      : DEFAULT_SETTINGS.theme,
    notifications:
      typeof input.notifications === "boolean"
        ? input.notifications
        : DEFAULT_SETTINGS.notifications,
    sound: typeof input.sound === "boolean" ? input.sound : DEFAULT_SETTINGS.sound,
    volume:
      typeof input.volume === "number" && Number.isFinite(input.volume)
        ? Math.min(100, Math.max(0, input.volume))
        : DEFAULT_SETTINGS.volume,
    notificationDuration: [5, 8, 15].includes(input.notificationDuration ?? 0)
      ? (input.notificationDuration as AdminSettings["notificationDuration"])
      : DEFAULT_SETTINGS.notificationDuration,
    compact: typeof input.compact === "boolean" ? input.compact : DEFAULT_SETTINGS.compact,
  };
}
