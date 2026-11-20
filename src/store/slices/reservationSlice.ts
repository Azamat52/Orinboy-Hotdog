import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StoreShape } from "../types";
const initialState: StoreShape["reservation"] = {
  form: {
    name: "",
    phone: "",
    date: "",
    time: "",
    guests: 2,
    note: "",
    tableId: "",
    eventType: "regular",
    eventTitle: "",
    durationMinutes: 120,
  },
  sending: false,
  bookedTableName: null,
};
const slice = createSlice({
  name: "reservation",
  initialState,
  reducers: {
    patchReservation: (state, action: PayloadAction<Partial<StoreShape["reservation"]>>) =>
      Object.assign(state, action.payload),
  },
});
export const { patchReservation } = slice.actions;
export default slice.reducer;
