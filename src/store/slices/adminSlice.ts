import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StoreShape } from "../types";
const initialState: StoreShape["admin"] = {
  products: [],
  orders: [],
  categories: [],
  promotions: [],
  customers: [],
  reservations: [],
  venueTables: [],
  loading: true,
  liveUsers: 0,
  live: false,
  busy: 0,
};
const slice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    patchAdmin: (state, action: PayloadAction<Partial<StoreShape["admin"]>>) =>
      Object.assign(state, action.payload),
  },
});
export const { patchAdmin } = slice.actions;
export default slice.reducer;
