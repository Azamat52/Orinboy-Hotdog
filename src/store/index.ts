import { configureStore } from "@reduxjs/toolkit";
import { useCallback } from "react";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import adminReducer, { patchAdmin } from "./slices/adminSlice";
import settingsReducer, { patchSettings } from "./slices/settingsSlice";
import siteReducer, { patchSite } from "./slices/siteSlice";
import reservationReducer, { patchReservation } from "./slices/reservationSlice";
import type { StoreShape } from "./types";
export type { StoreShape, AppRecord, WorkHours, ReservationForm, EventType } from "./types";

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    admin: adminReducer,
    site: siteReducer,
    reservation: reservationReducer,
  },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const patchAction = {
  settings: patchSettings,
  admin: patchAdmin,
  site: patchSite,
  reservation: patchReservation,
};
/** Compatibility hook: migrate callers one module at a time, while all state lives in Redux slices. */
export function useStoreState<K extends keyof StoreShape, P extends keyof StoreShape[K]>(
  group: K,
  key: P,
): [
  StoreShape[K][P],
  (next: StoreShape[K][P] | ((current: StoreShape[K][P]) => StoreShape[K][P])) => void,
] {
  const value = useAppSelector((state) => state[group][key]) as StoreShape[K][P];
  const dispatch = useAppDispatch();
  const setValue = useCallback(
    (next: StoreShape[K][P] | ((current: StoreShape[K][P]) => StoreShape[K][P])) => {
      const current = store.getState()[group][key] as StoreShape[K][P];
      const resolved =
        typeof next === "function"
          ? (next as (current: StoreShape[K][P]) => StoreShape[K][P])(current)
          : next;
      // Discriminated dispatch bridges existing typed hooks to the new slice reducers.
      const patch = { [key]: resolved };
      switch (group) {
        case "admin":
          dispatch(patchAdmin(patch));
          break;
        case "settings":
          dispatch(patchSettings(patch));
          break;
        case "site":
          dispatch(patchSite(patch));
          break;
        case "reservation":
          dispatch(patchReservation(patch));
          break;
      }
    },
    [dispatch, group, key],
  );
  return [value, setValue];
}
