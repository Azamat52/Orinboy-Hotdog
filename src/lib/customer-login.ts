import { toast } from "sonner";

export const LOGIN_REQUIRED_MESSAGE =
  "Savatdan foydalanish uchun avval tizimga kiring yoki ro‘yxatdan o‘ting.";

/** Only internal customer URLs are accepted as a post-authentication destination. */
export function safeReturnPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  if (next.startsWith("/admin") || next.startsWith("/profil")) return "/";
  return next;
}

export function loginUrl(returnTo: string): string {
  return `/profil/login?next=${encodeURIComponent(safeReturnPath(returnTo))}&reason=cart`;
}

export function requireCustomerLogin(navigate: (to: string) => void, returnTo: string) {
  toast.info(LOGIN_REQUIRED_MESSAGE, { duration: 3500 });
  navigate(loginUrl(returnTo));
}
