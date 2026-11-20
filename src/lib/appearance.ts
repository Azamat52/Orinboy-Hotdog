export function appearanceKey(userId) {
  return `xonqa-appearance:${userId || "guest"}`;
}
export function resolveTheme(theme, prefersDark) {
  return theme === "system"
    ? prefersDark
      ? "dark"
      : "light"
    : theme === "light"
      ? "light"
      : "dark";
}
export function applyTheme(
  theme: "dark" | "light" | "system",
  prefersDark: boolean,
  root: HTMLElement = document.documentElement,
): void {
  const resolved = resolveTheme(theme, prefersDark);
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.dataset.siteTheme = resolved;
  root.style.colorScheme = resolved;
}
