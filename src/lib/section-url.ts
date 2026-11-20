/** Keep list pagination attached to its section, and preserve URL grammar path?query#hash. */
export function sectionUrl(current: string, id: string) {
  const url = new URL(current, "http://localhost");
  if (id !== "menyu") url.searchParams.delete("page");
  if (id !== "aksiyalar") url.searchParams.delete("promoPage");
  url.hash = id;
  return `${url.pathname}${url.search}${url.hash}`;
}
