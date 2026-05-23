export interface Certificate {
  id: string;
  certificateNumber: string;
  country: string;
  pdfFilename: string;
  pdfOriginalName: string;
  createdAt: string;
}

export type Country = "Chile" | "Ecuador" | "Paraguay" | "Honduras" | "Salvador";

export const COUNTRIES: Country[] = ["Chile", "Ecuador", "Paraguay", "Honduras", "Salvador"];
