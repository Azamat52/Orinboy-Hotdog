import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StoreShape } from "../types";
const initialState: StoreShape["site"] = { hours: null, error: false, now: Date.now() };
const slice = createSlice({
  name: "site",
  initialState,
  reducers: {
    patchSite: (state, action: PayloadAction<Partial<StoreShape["site"]>>) =>
      Object.assign(state, action.payload),
  },
});
export const { patchSite } = slice.actions;
export default slice.reducer;
