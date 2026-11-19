import { ImportRowStatus, ImportStatus } from '../constants/index';

export interface ImportPreviewRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  gender?: string;
  addressLine1?: string;
  city?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  joiningDate?: string;
  status: ImportRowStatus;
  errors: string[];
}

export interface ImportBatchSummary {
  id: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  status: ImportStatus;
  createdAt: string;
  completedAt?: string;
}

export interface CommitImportDto {
  batchId: string;
}
