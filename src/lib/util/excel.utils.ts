import { excelDataStore } from "$lib/store/excelDataStore";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";

export type ExcelData = (string | number | null | Date)[][]; // Date 타입 추가

//Elapsed Time	Date Time	Room DB	Room RH	Volt	Current	Power	Frequency	Integ. Power	TC_1	TC_2	TC_3	TC_4	TC_5	TC_6	TC_7	TC_8	TC_9	TC_10	TC_11	TC_12	TC_13	TC_14	TC_15	TC_16	TC_17	TC_18	TC_19	TC_20	Power Factor
// make enum from 0 ~ N
export enum ExcelColumn {
  ElapsedTime = 0,
  DateTime,
  RoomDB,
  RoomRH,
  Volt,
  Current,
  Power,
  Frequency,
  IntegPower,
  TC_1,
  TC_2,
  TC_3,
  TC_4,
  TC_5,
  TC_6,
  TC_7,
  TC_8,
  TC_9,
  TC_10,
  TC_11,
  TC_12,
  TC_13,
  TC_14,
  TC_15,
  TC_16,
  TC_17,
  TC_18,
  TC_19,
  TC_20,
  PowerFactor,
}

export async function findExcelFile(): Promise<string | null> {
  const selected = await open({
    title: "Excel File (xlsx, xls, xlsb)",
    filters: [{ name: "Excel 파일", extensions: ["xlsx", "xls", "xlsb"] }],
    multiple: false,
    directory: false,
  });
  return selected;
}

export default async function openExcelFile(selected: string): Promise<ExcelData | null> {
  try {
    // const selected = await open({
    //   title: "Excel File (xlsx, xls, xlsb)",
    //   filters: [{ name: "Excel 파일", extensions: ["xlsx", "xls", "xlsb"] }],
    //   multiple: false,
    //   directory: false,
    // });

    // if (!selected) {
    //   console.log("파일이 선택되지 않았습니다.");
    //   return null;
    // }

    console.log(selected);
    let start = new Date();
    const fileData = await readFile(selected);
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: false, // 날짜를 Date 객체로 반환
      dense: true,
      sheets: 0,
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    //@ts-ignore
    let jsonData: ExcelData = XLSX.utils
      .sheet_to_json(worksheet, {
        header: 1,
        raw: true, // 날짜를 시리얼 넘버 대신 변환된 값으로 반환
        defval: null,
      })
      //@ts-ignore
      .filter((row) => row.some((cell) => cell !== null && cell !== ""));
    console.log(
      "Finish Default Parse: " + (new Date().getTime() - start.getTime()) + "ms"
    );
    jsonData = jsonData.map((row) => {
      let trimmedRow = [...row]; // 행 복사
      while (
        trimmedRow.length > 0 &&
        trimmedRow[trimmedRow.length - 1] === null
      ) {
        trimmedRow.pop(); // 맨 뒤가 null이면 제거
      }
      return trimmedRow;
    });

    const optimizedData = jsonData.map((row) =>
      row.map((cell) => {
        if (typeof cell === "number" && cell > 25569) {
          // Excel 날짜 시리얼 넘버 체크
          const date = new Date((cell - 25569) * 86400 * 1000);
          return date.toISOString().replace("T", " ").slice(0, 19); // "YYYY-MM-DD HH:MM:SS"
        }
        return cell;
      })
    );
    let end = new Date();
    // console.log(optimizedData)
    console.log("Duration: " + (end.getTime() - start.getTime()) + "ms");

    excelDataStore.set(optimizedData);
    return optimizedData;
  } catch (error) {
    console.error("Read Excel File Error:", error);
    return null;
  }
}

export function exportToExcel(data: any, fileName = "export.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName);
}
