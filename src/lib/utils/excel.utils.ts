import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";

export type ExcelData = (string | number | null | Date)[][]; // Date 타입 추가

export default async function openExcelFile(): Promise<ExcelData | null> {
  try {
    const selected = await open({
      title: "Excel File (xlsx, xls, xlsb)",
      filters: [{ name: "Excel 파일", extensions: ["xlsx", "xls", "xlsb"] }],
      multiple: false,
      directory: false,
    });

    if (!selected) {
      console.log("파일이 선택되지 않았습니다.");
      return null;
    }

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
    console.log("Finish Default Parse: " + (new Date().getTime() - start.getTime()) + "ms");
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
    console.log(optimizedData)
    console.log("Duration: " + (end.getTime() - start.getTime()) + "ms");

    return optimizedData;
  } catch (error) {
    console.error("Read Excel File Error:", error);
    return null;
  }
}
