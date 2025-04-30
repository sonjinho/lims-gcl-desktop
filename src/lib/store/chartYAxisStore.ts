import { type Writable, writable } from "svelte/store";

interface YAxis {
  index: number;
  name: string;
  min: number;
  max: number;
  positionLeft: boolean;
  color: number;
}

interface Series {
  header: string;
  yAxis: number;
}

export class ChartYAxisStore {
  yAxis: YAxis[] = [];
  series: Series[] =[];
}
export const chartYAxisStore: Writable<ChartYAxisStore> = writable({
  yAxis: [
    {
      index: 0,
      name: "Temperature",
      min: -30,
      max: 40,
      positionLeft: true,
      color: 0,
    },
    {
      index: 1,
      name: "Power",
      min: 0,
      max: 600,
      positionLeft: false,
      color: 1,
    },
  ],
  series: [],
});
