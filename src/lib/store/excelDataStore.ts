import type { ExcelData } from '$lib/util/excel.utils';
import { writable } from "svelte/store";

export const excelDataStore = writable<ExcelData>([]);