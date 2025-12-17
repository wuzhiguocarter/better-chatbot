import { Buffer } from "node:buffer";

export type CsvPreview = {
  header: string[];
  rows: string[][]; // limited by maxRows/maxCols
  columns: number;
  totalRows: number;
  markdownTable: string; // simple markdown table for the chat
};

const parseCsvRows = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let i = 0;
  let field = "";
  let inQuotes = false;
  let row: string[] = [];

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i++];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        pushField();
      } else if (ch === "\n") {
        pushField();
        pushRow();
      } else if (ch === "\r") {
        // ignore CR (handle CRLF)
      } else {
        field += ch;
      }
    }
  }
  // flush last field/row
  pushField();
  if (row.some((cell) => cell !== "")) pushRow();

  return rows;
};

export function parseCsvPreview(
  content: Buffer,
  opts: { maxRows?: number; maxCols?: number } = {},
): CsvPreview {
  const maxRows = Math.max(1, opts.maxRows ?? 50);
  const maxCols = Math.max(1, opts.maxCols ?? 12);
  const text = content.toString("utf8");

  const rows = parseCsvRows(text, ",");

  const totalRows = rows.length;
  const header = rows[0] ?? [];
  const limitedHeader = header.slice(0, maxCols);
  const dataRows = rows.slice(1);
  const limitedRows = dataRows
    .slice(0, maxRows)
    .map((r) => r.slice(0, maxCols));
  const columns = limitedHeader.length;

  const mdHeader = `| ${limitedHeader.join(" | ")} |`;
  const mdSep = `| ${limitedHeader.map(() => "---").join(" | ")} |`;
  const mdBody = limitedRows
    .map(
      (r) => `| ${r.map((c) => (c ?? "").replace(/\|/g, "\\|")).join(" | ")} |`,
    )
    .join("\n");
  const markdownTable = [mdHeader, mdSep, mdBody].join("\n");

  return {
    header: limitedHeader,
    rows: limitedRows,
    columns,
    totalRows,
    markdownTable,
  };
}

export interface ParsedCsvDataset {
  columns: string[];
  rows: Record<string, string>[];
}

export async function parseCsvDataset({
  buffer,
  delimiter = ",",
  encoding = "utf-8",
}: {
  buffer: Buffer;
  delimiter?: string;
  encoding?: BufferEncoding;
}): Promise<ParsedCsvDataset> {
  const text = buffer.toString(encoding);
  const rows = parseCsvRows(text, delimiter);

  if (rows.length === 0) {
    return { columns: [], rows: [] };
  }

  const header = rows[0] ?? [];
  const dataRows = rows.slice(1);

  const mappedRows = dataRows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = row[idx] ?? "";
    });
    return record;
  });

  return { columns: header, rows: mappedRows };
}

export const formatCsvPreviewText = (
  name: string,
  preview: CsvPreview,
): string => {
  return `Here is a preview of ${name} (rows: ${preview.totalRows}, cols: ${preview.columns}). Summarize or analyze as needed.\n
${preview.markdownTable}`;
};
