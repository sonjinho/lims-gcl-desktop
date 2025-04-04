// store.js
import { writable } from "svelte/store";

export const selectedFields = writable({
  xAxis: [],
  power: [],
  ambient: [],
  unfrozen: [],
  frozen: []
});
