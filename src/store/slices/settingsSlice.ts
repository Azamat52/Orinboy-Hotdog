import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_SETTINGS } from "@/admin/lib/preferences";
import type { StoreShape } from "../types";
const initialState: StoreShape["settings"] = { settings: { ...DEFAULT_SETTINGS } };
const slice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    patchSettings: (state, action: PayloadAction<Partial<StoreShape["settings"]>>) =>
      Object.assign(state, action.payload),
  },
});
export const { patchSettings } = slice.actions;
export default slice.reducer;
