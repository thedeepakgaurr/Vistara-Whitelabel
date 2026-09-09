'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseRawCsvRows, type ParsedContact } from '@/lib/csv';
import { ColumnMappingModal } from '@/components/campaigns/ColumnMappingModal';
import { cn } from '@/lib/cn';

interface CsvUploadZoneProps {
  onContactsChange: (contacts: ParsedContact[]) => void;
  error?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPT =
  '.csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function CsvUploadZone({ onContactsChange, error }: CsvUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [mapped, setMapped] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  async function processFile(file: File) {
    const name = file.name.toLowerCase();
    setParseError(null);
    setMapped(false);
    setContacts([]);
    onContactsChange([]);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(ws, {
          header: 1,
          defval: '',
        });
        if (json.length === 0) {
          setParseError('The spreadsheet appears to be empty.');
          return;
        }
        headers = (json[0] as (string | number | boolean)[]).map((v) => String(v ?? '').trim());
        rows = json
          .slice(1)
          .map((r) => (r as (string | number | boolean)[]).map((v) => String(v ?? '').trim()));
      } else {
        const text = await file.text();
        const parsed = parseRawCsvRows(text);
        headers = parsed.headers;
        rows = parsed.rows;
      }

      if (headers.length === 0) {
        setParseError('No columns detected. Check that the file has a header row.');
        return;
      }
      if (rows.length === 0) {
        setParseError('The file has headers but no data rows.');
        return;
      }

      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setRawHeaders(headers);
      setRawRows(rows);
      setModalOpen(true);
    } catch {
      setParseError('Failed to read the file. Please ensure it is a valid CSV or Excel file.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleRemove() {
    setFileName(null);
    setFileSize(null);
    setRawHeaders([]);
    setRawRows([]);
    setContacts([]);
    setMapped(false);
    setParseError(null);
    onContactsChange([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleMappingConfirm(result: ParsedContact[]) {
    setContacts(result);
    setMapped(true);
    setModalOpen(false);
    onContactsChange(result);
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileChange}
        className="hidden"
      />

      {rawHeaders.length > 0 && (
        <ColumnMappingModal
          open={modalOpen}
          fileName={fileName ?? ''}
          headers={rawHeaders}
          rows={rawRows}
          onConfirm={handleMappingConfirm}
          onClose={() => {
            setModalOpen(false);
            if (!mapped) handleRemove();
          }}
        />
      )}

      {!fileName ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all',
            isDragging
              ? 'border-primary bg-primary-soft/40 scale-[0.99]'
              : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-hover',
            error && 'border-danger/60 bg-danger-soft/10'
          )}
        >
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
            <UploadCloud className="size-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">Click to upload or drag and drop</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports CSV and Excel (.xls, .xlsx) files
          </p>
          <p className="mt-3 text-xs text-muted-foreground/60">
            You&apos;ll be able to map columns after uploading
          </p>
          {parseError && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              {parseError}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{fileSize}</span>
                  <span>·</span>
                  {mapped && contacts.length > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {contacts.length} contact{contacts.length === 1 ? '' : 's'} ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <AlertCircle className="size-3" />
                      No valid contacts
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
              >
                Edit mapping
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                Change file
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          </div>

          {mapped && contacts.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview (first {Math.min(contacts.length, 5)} rows):</span>
                {contacts.length > 5 && <span>+{contacts.length - 5} more</span>}
              </div>
              <div className="max-h-40 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">#</th>
                      <th className="px-3 py-1.5 font-medium">Phone</th>
                      <th className="px-3 py-1.5 font-medium">Name</th>
                      {Object.keys(contacts[0]?.metadata ?? {})
                        .filter((k) => !k.endsWith('_description'))
                        .map((k) => {
                          const desc = contacts[0]?.metadata?.[`${k}_description`];
                          return (
                            <th key={k} className="px-3 py-1.5 font-medium">
                              <div>{k}</div>
                              {desc && (
                                <div className="text-[10px] font-normal text-muted-foreground italic truncate max-w-[120px]">
                                  {desc}
                                </div>
                              )}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.slice(0, 5).map((c, i) => (
                      <tr key={i} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-foreground">{c.phone}</td>
                        <td className="px-3 py-1.5 text-foreground">{c.name || '—'}</td>
                        {Object.keys(contacts[0]?.metadata ?? {})
                          .filter((k) => !k.endsWith('_description'))
                          .map((k) => (
                            <td key={k} className="px-3 py-1.5 text-foreground">
                              {c.metadata?.[k] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !parseError && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
