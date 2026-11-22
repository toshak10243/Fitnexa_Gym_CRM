import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { ImportRowStatus, ImportStatus } from '@fitnexa/shared';

interface BatchSummary {
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

interface PreviewRow {
  rowNumber: number;
  parsed: {
    fullName?: string;
    phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    city?: string;
  };
  status: ImportRowStatus;
  errors: string[];
}

export function ImportsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [activeBatch, setActiveBatch] = useState<{
    batchId: string;
    fileName: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    preview: PreviewRow[];
  } | null>(null);

  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const res = await apiClient.get('/imports/batches');
      setBatches(res.data.data || []);
    } catch {
      setBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    apiClient
      .get('/tenant/branches')
      .then((res) => {
        const branchList = res.data.data || [];
        setBranches(branchList);
        if (branchList.length > 0) setSelectedBranchId(branchList[0].id);
      })
      .catch(() => {});
  }, []);

  const handleDownloadSampleTemplate = () => {
    const csvContent =
      'Full Name,Phone,Email,Gender,Date of Birth,Joining Date,Address,City,State,Pincode,Emergency Name,Emergency Phone\n' +
      'Amit Verma,9876543210,amit.verma@example.com,MALE,1995-04-12,2024-01-15,Flat 204 Sunshine Apts,Bengaluru,Karnataka,560038,Sunita Verma,9876543211\n' +
      'Pooja Sharma,9811223344,pooja.s@example.com,FEMALE,1998-09-25,2024-02-01,12 MG Road Indiranagar,Bengaluru,Karnataka,560001,Rajesh Sharma,9811223345\n' +
      'Vikram Rao,9822334455,vikram.rao@example.com,MALE,1992-11-30,2024-02-10,78 Ring Road,Bengaluru,Karnataka,560040,Anjali Rao,9822334456\n' +
      'Neha Kapoor,9833445566,neha.kapoor@example.com,FEMALE,1996-06-18,2024-03-05,21 Koramangala 5th Block,Bengaluru,Karnataka,560095,Rohit Kapoor,9833445567\n' +
      'Rahul Mehta,9844556677,rahul.mehta@example.com,MALE,1990-02-14,2024-03-18,44 HSR Layout Sector 2,Bengaluru,Karnataka,560102,Meena Mehta,9844556678\n' +
      'Kavya Iyer,9855667788,kavya.iyer@example.com,FEMALE,1999-12-03,2024-04-02,9 Jayanagar 4th Block,Bengaluru,Karnataka,560011,Suresh Iyer,9855667789\n' +
      'Arjun Nair,9866778899,arjun.nair@example.com,MALE,1994-08-27,2024-04-22,16 Whitefield Main Road,Bengaluru,Karnataka,560066,Divya Nair,9866778890\n' +
      'Sneha Reddy,9877889900,sneha.reddy@example.com,FEMALE,1997-01-21,2024-05-10,32 Banashankari 3rd Stage,Bengaluru,Karnataka,560085,Prakash Reddy,9877889901\n' +
      'Manish Gupta,9888990011,manish.gupta@example.com,MALE,1989-10-09,2024-05-28,8 Malleshwaram 8th Cross,Bengaluru,Karnataka,560003,Anita Gupta,9888990012\n' +
      'Ishita Sen,9899001122,ishita.sen@example.com,FEMALE,1993-03-16,2024-06-12,27 Indiranagar 12th Main,Bengaluru,Karnataka,560038,Amit Sen,9899001123\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'trifit_member_migration_template.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setActiveBatch(null);
      setStatusMessage(null);
    }
  };

  const handleDryRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select an Excel or CSV file to upload.');
      return;
    }
    if (!selectedBranchId) {
      alert('Please select a target facility branch.');
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('branchId', selectedBranchId);

    try {
      const res = await apiClient.post(
        `/imports/upload?branchId=${encodeURIComponent(selectedBranchId)}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setActiveBatch(res.data.data);
      fetchBatches();
    } catch (err: any) {
      let msg = err?.response?.data?.message || err?.message || 'Validation failed';
      if (
        String(err?.message || err).includes('ERR_UPLOAD_FILE_CHANGED') ||
        String(err?.code || '').includes('ERR_UPLOAD_FILE_CHANGED')
      ) {
        msg =
          'File was modified or open in another program (like Excel). Please close Excel, re-select the file, and click Validate again.';
      } else if (msg === 'The uploaded file is empty.') {
        msg =
          'The uploaded file is empty or has no member data rows below the header row. Please make sure there are member rows in your file.';
      }
      alert(`Dry run failed: ${msg}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!activeBatch) return;
    if (activeBatch.validRows === 0) {
      alert('There are no valid records in this batch to import.');
      return;
    }

    if (
      !confirm(
        `Confirm migration of ${activeBatch.validRows} verified member records into your live directory?`,
      )
    ) {
      return;
    }

    setIsCommitting(true);
    try {
      await apiClient.post('/imports/commit', { batchId: activeBatch.batchId });
      setStatusMessage(
        `Successfully migrated ${activeBatch.validRows} members into the active member directory.`,
      );
      setActiveBatch(null);
      setSelectedFile(null);
      fetchBatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Commit failed';
      alert(`Import commit failed: ${msg}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadErrors = async (batchId: string) => {
    try {
      const response = await apiClient.get(`/imports/${batchId}/errors`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import-errors-${batchId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      alert(msg);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            Legacy Data Migration (Excel / CSV)
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Dry-run validation, duplicate mobile phone detection, and safe batch ingestion for legacy fitness software.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            className="text-xs border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FBFBF9] rounded-none h-9 font-semibold"
            onClick={handleDownloadSampleTemplate}
          >
            Download Sample CSV Template
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
          {statusMessage}
        </div>
      )}

      {/* Upload & Dry-Run Section */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Step 1: Upload Spreadsheet for Dry-Run Validation
          </h2>
          <span className="text-[11px] text-[#6B7280]">
            Make sure to save & close your file in Excel before selecting it.
          </span>
        </div>
        <form onSubmit={handleDryRun} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Target Facility Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Choose File (.xlsx, .xls, .csv) *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="w-full text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-1.5 rounded-none"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 font-semibold"
            >
              {isUploading ? 'Validating Batch...' : 'Run Dry-Run Validation'}
            </Button>
          </div>
        </form>
      </div>

      {/* Dry Run Preview Table */}
      {activeBatch && (
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
                Dry-Run Validation Summary: {activeBatch.fileName}
              </h2>
              <div className="flex items-center gap-4 text-xs mt-1">
                <span>
                  Total Rows: <strong className="font-mono">{activeBatch.totalRows}</strong>
                </span>
                <span className="text-emerald-700">
                  Valid Records: <strong className="font-mono">{activeBatch.validRows}</strong>
                </span>
                <span className="text-red-700">
                  Invalid / Conflicts: <strong className="font-mono">{activeBatch.invalidRows}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeBatch.invalidRows > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadErrors(activeBatch.batchId)}
                  className="rounded-none text-xs h-8 border-red-300 text-red-700 hover:bg-red-50"
                >
                  Download Error Report (CSV)
                </Button>
              )}
              <Button
                onClick={handleCommit}
                disabled={isCommitting || activeBatch.validRows === 0}
                className="bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] rounded-none text-xs h-8 px-6 font-semibold tracking-wider"
              >
                {isCommitting
                  ? 'Migrating Records...'
                  : `Commit ${activeBatch.validRows} Members to Directory`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E7EB]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Row #</th>
                  <th className="py-2.5 px-3">Parsed Full Name</th>
                  <th className="py-2.5 px-3">Parsed Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Validation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {activeBatch.preview.map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-[#F5F5F0]">
                    <td className="py-2.5 px-3 font-mono">{row.rowNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#111827]">
                      {row.parsed.fullName || <span className="text-red-600 italic">Missing</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {row.parsed.phone || <span className="text-red-600 italic">Missing</span>}
                    </td>
                    <td className="py-2.5 px-3 text-[#6B7280]">{row.parsed.email || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                          row.status === 'VALID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.errors.length > 0 ? (
                        <span className="text-red-700 font-medium">{row.errors.join('; ')}</span>
                      ) : (
                        <span className="text-emerald-700">Ready for admission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Migration History */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
        <div className="p-4 border-b border-[#E5E7EB]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Migration Batches History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">File Name</th>
                <th className="py-2.5 px-4">Total Rows</th>
                <th className="py-2.5 px-4">Valid</th>
                <th className="py-2.5 px-4">Invalid</th>
                <th className="py-2.5 px-4">Imported</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Created At</th>
                <th className="py-2.5 px-4 text-right">Error Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoadingBatches ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                    No past data migration batches found.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F5F5F0]">
                    <td className="py-3 px-4 font-semibold text-[#0A192F]">{b.fileName}</td>
                    <td className="py-3 px-4 font-mono">{b.totalRows}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700">{b.validRows}</td>
                    <td className="py-3 px-4 font-mono text-red-700">{b.invalidRows}</td>
                    <td className="py-3 px-4 font-mono font-bold">{b.importedRows}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.invalidRows > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadErrors(b.id)}
                          className="rounded-none text-[10px] h-6 border-[#E5E7EB]"
                        >
                          Download CSV
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


