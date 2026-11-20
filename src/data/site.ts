export const CONTACT_CONFIG = { phone: "", instagramUrl: "" } as const;

export const money = (value: number): string =>
  new Intl.NumberFormat("uz-UZ").format(value) + " so‘m";
