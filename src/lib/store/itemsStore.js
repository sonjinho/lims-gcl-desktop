import { loadAll } from "$lib/util/db.util";
import { writable } from "svelte/store";

export const itemsStore = writable([]);