import type { AdminSettings } from "@/admin/lib/preferences";

export type EventType = "regular" | "birthday" | "celebration" | "business" | "other";
export interface ReservationForm {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number | string;
  note: string;
  tableId: string;
  eventType: EventType;
  eventTitle: string;
  durationMinutes: number | string;
}
export interface AppRecord {
  id: string;
  [key: string]: any;
}
export interface WorkHours {
  enabled: boolean;
  open: string;
  close: string;
}
export interface StoreShape {
  settings: { settings: AdminSettings };
  admin: {
    products: AppRecord[];
    orders: AppRecord[];
    categories: AppRecord[];
    promotions: AppRecord[];
    customers: AppRecord[];
    reservations: AppRecord[];
    venueTables: AppRecord[];
    loading: boolean;
    liveUsers: number;
    live: boolean;
    busy: number;
  };
  site: { hours: WorkHours | null; error: boolean; now: number };
  reservation: { form: ReservationForm; sending: boolean; bookedTableName: string | null };
}
