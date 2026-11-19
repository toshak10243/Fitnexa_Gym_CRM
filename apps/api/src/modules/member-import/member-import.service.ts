import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MemberService } from '../member/member.service';
import { ImportRowStatus, ImportStatus, MemberStatus, Prisma } from '@prisma/client';
import { generateCsvString } from '../../common/utils/security.util';

export interface RawImportRow {
  fullName?: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  joiningDate?: string;
  [key: string]: unknown;
}

@Injectable()
export class MemberImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly memberService: MemberService,
  ) {}

  /**
   * Normalize arbitrary Excel/CSV header names to canonical field names
   */
  private normalizeHeaders(rawRow: Record<string, unknown>): RawImportRow {
    const normalized: RawImportRow = {};
    for (const [key, value] of Object.entries(rawRow)) {
      if (value === null || value === undefined || value === '') continue;
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (['name', 'fullname', 'membername'].includes(cleanKey)) {
        normalized.fullName = String(value).trim();
      } else if (['phone', 'mobile', 'contact', 'phonenumber', 'mobilenumber'].includes(cleanKey)) {
        normalized.phone = String(value).trim();
      } else if (['email', 'emailaddress'].includes(cleanKey)) {
        normalized.email = String(value).trim().toLowerCase();
      } else if (['dob', 'dateofbirth', 'birthdate'].includes(cleanKey)) {
        normalized.dob = String(value).trim();
      } else if (['gender', 'sex'].includes(cleanKey)) {
        normalized.gender = String(value).trim().toUpperCase();
      } else if (['address', 'addressline1', 'street'].includes(cleanKey)) {
        normalized.addressLine1 = String(value).trim();
      } else if (['city'].includes(cleanKey)) {
        normalized.city = String(value).trim();
      } else if (['state'].includes(cleanKey)) {
        normalized.state = String(value).trim();
      } else if (['pincode', 'pin', 'zip', 'zipcode'].includes(cleanKey)) {
        normalized.pincode = String(value).trim();
      } else if (['emergencyname', 'emergencycontactname'].includes(cleanKey)) {
        normalized.emergencyName = String(value).trim();
      } else if (['emergencyphone', 'emergencycontactphone'].includes(cleanKey)) {
        normalized.emergencyPhone = String(value).trim();
      } else if (['joiningdate', 'joindate', 'admissiondate'].includes(cleanKey)) {
        normalized.joiningDate = String(value).trim();
      }
    }
    return normalized;
  }

  /**
   * Process uploaded spreadsheet buffer, execute dry-run validation, and persist batch
   */
  async processDryRun(
    tenantId: string,
    branchId: string,
    currentUserId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file buffer is empty');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new BadRequestException('Target branch not found in your organization');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Failed to parse file. Please upload a valid .xlsx, .xls, or .csv document.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('The uploaded spreadsheet contains no sheets.');
    }

    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: '',
    });

    if (rawData.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    if (rawData.length > 1000) {
      throw new BadRequestException('Maximum file limit is 1,000 rows per migration batch.');
    }

    // Existing phone numbers in tenant to detect conflicts
    const existingMembers = await this.prisma.member.findMany({
      where: { tenantId },
      select: { phone: true, email: true },
    });
    const existingPhones = new Set(existingMembers.map((m) => m.phone.replace(/[^0-9]/g, '')));
    const existingEmails = new Set(
      existingMembers.filter((m) => m.email).map((m) => m.email!.toLowerCase()),
    );

    const batchPhoneSet = new Set<string>();

    const rowsToInsert: Prisma.MemberImportRowCreateManyBatchInput[] = [];

    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const rowNum = i + 2; // Accounting for 1-based index and header row
      const rawRow = rawData[i];
      const parsed = this.normalizeHeaders(rawRow);
      const errors: string[] = [];

      // Validate Name
      if (!parsed.fullName || parsed.fullName.trim().length === 0) {
        errors.push('Full name is required.');
      } else if (parsed.fullName.length > 100) {
        errors.push('Full name cannot exceed 100 characters.');
      }

      // Validate Phone
      if (!parsed.phone || parsed.phone.trim().length === 0) {
        errors.push('Phone number is required.');
      } else {
        const cleanPhone = parsed.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          errors.push('Phone number must have between 10 and 15 digits.');
        } else if (batchPhoneSet.has(cleanPhone)) {
          errors.push(`Duplicate phone number within file: ${parsed.phone}`);
        } else if (existingPhones.has(cleanPhone)) {
          errors.push(`Member with phone ${parsed.phone} already exists in database.`);
        } else {
          batchPhoneSet.add(cleanPhone);
        }
      }

      // Validate Email (if present)
      if (parsed.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parsed.email)) {
          errors.push('Invalid email format.');
        } else if (existingEmails.has(parsed.email.toLowerCase())) {
          errors.push(`Email ${parsed.email} is already in use by an existing member.`);
        }
      }

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      rowsToInsert.push({
        rowNumber: rowNum,
        rawData: rawRow as Prisma.InputJsonValue,
        parsedData: parsed as Prisma.InputJsonValue,
        status: isValid ? ImportRowStatus.VALID : ImportRowStatus.INVALID,
        errors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      });
    }

    const batch = await this.prisma.memberImportBatch.create({
      data: {
        tenantId,
        branchId,
        fileName: file.originalname,
        fileSize: file.size,
        totalRows: rawData.length,
        validRows: validCount,
        invalidRows: invalidCount,
        status: ImportStatus.PENDING,
        uploadedBy: currentUserId,
        rows: {
          createMany: {
            data: rowsToInsert,
          },
        },
      },
      include: {
        rows: {
          take: 50,
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    return {
      batchId: batch.id,
      fileName: batch.fileName,
      totalRows: batch.totalRows,
      validRows: batch.validRows,
      invalidRows: batch.invalidRows,
      status: batch.status,
      preview: batch.rows.map((r) => ({
        rowNumber: r.rowNumber,
        parsed: r.parsedData as RawImportRow,
        status: r.status,
        errors: (r.errors as string[]) || [],
      })),
    };
  }

  /**
   * Commit verified valid records in import batch to live member directory
   */
  async commitBatch(tenantId: string, batchId: string, currentUserId: string) {
    const batch = await this.prisma.memberImportBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        rows: {
          where: { status: ImportRowStatus.VALID },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }

    if (batch.status === ImportStatus.COMPLETED) {
      throw new BadRequestException('This batch has already been imported');
    }

    if (batch.validRows === 0) {
      throw new BadRequestException('No valid rows found in this batch to import');
    }

    let importedCount = 0;

    for (const row of batch.rows) {
      const data = row.parsedData as RawImportRow;
      if (!data) continue;

      try {
        const memberCode = await this.memberService.generateMemberCode(tenantId);
        const member = await this.prisma.member.create({
          data: {
            tenantId,
            branchId: batch.branchId,
            memberCode,
            fullName: data.fullName!,
            phone: data.phone!,
            email: data.email || null,
            dob: data.dob ? new Date(data.dob) : null,
            gender: data.gender === 'MALE' || data.gender === 'FEMALE' ? data.gender : null,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            status: MemberStatus.ACTIVE,
            createdBy: currentUserId,
          },
        });

        if (data.addressLine1 || data.city) {
          await this.prisma.memberAddress.create({
            data: {
              memberId: member.id,
              addressLine1: data.addressLine1 || 'Not Specified',
              city: data.city || 'Not Specified',
              state: data.state || 'Not Specified',
              pincode: data.pincode || '000000',
              country: 'India',
            },
          });
        }

        if (data.emergencyName && data.emergencyPhone) {
          await this.prisma.memberEmergencyContact.create({
            data: {
              memberId: member.id,
              name: data.emergencyName,
              relationship: 'Emergency Contact',
              phone: data.emergencyPhone,
            },
          });
        }

        await this.prisma.memberActivity.create({
          data: {
            memberId: member.id,
            tenantId,
            performedBy: currentUserId,
            action: 'MEMBER_MIGRATED_FROM_SPREADSHEET',
            details: { batchId: batch.id, fileName: batch.fileName },
          },
        });

        await this.prisma.memberImportRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.IMPORTED,
            memberId: member.id,
          },
        });

        importedCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error during import';
        await this.prisma.memberImportRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.INVALID,
            errors: [errorMsg],
          },
        });
      }
    }

    const updatedBatch = await this.prisma.memberImportBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.COMPLETED,
        importedRows: importedCount,
        completedAt: new Date(),
      },
    });

    await this.auditLogService.record({
      tenantId,
      userId: currentUserId,
      action: 'MEMBER_BATCH_IMPORTED',
      resource: 'MemberImportBatch',
      resourceId: batchId,
      details: {
        fileName: batch.fileName,
        totalRows: batch.totalRows,
        importedRows: importedCount,
      },
      ipAddress: 'internal',
      userAgent: 'Fitnexa-API',
    });

    return updatedBatch;
  }

  /**
   * Export CSV of invalid rows and specific reasons for user remediation
   */
  async exportErrorReport(tenantId: string, batchId: string): Promise<string> {
    const batch = await this.prisma.memberImportBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        rows: {
          where: { status: ImportRowStatus.INVALID },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }

    const headers = ['Row Number', 'Raw Data', 'Validation Errors'];
    const rows = batch.rows.map((r) => [
      r.rowNumber,
      JSON.stringify(r.rawData),
      ((r.errors as string[]) || []).join('; '),
    ]);

    return generateCsvString(headers, rows);
  }

  /**
   * List migration batches
   */
  async listBatches(tenantId: string) {
    return this.prisma.memberImportBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
