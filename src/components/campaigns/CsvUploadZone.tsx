'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { parseContactsCsv, type ParsedContact } from '@/lib/csv';
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

export function CsvUploadZone({ onContactsChange, error }: CsvUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  async function processFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'text/plain') {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseContactsCsv(text);
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setContacts(parsed);
      setParseError(parsed.length === 0 ? 'No valid contacts found in the file. Ensure phone numbers are present.' : null);
      onContactsChange(parsed);
    } catch {
      setParseError('Failed to read the CSV file. Please check the file formatting.');
      onContactsChange([]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
    if (file) {
      processFile(file);
    }
  }

  function handleRemove() {
    setFileName(null);
    setFileSize(null);
    setContacts([]);
    setParseError(null);
    onContactsChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleDownloadSample(e: React.MouseEvent) {
    e.stopPropagation();
    const csvContent = 'phone,name\n+14155552671,John Doe\n+14155552672,Jane Smith\n+919876543210,Rahul Sharma\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

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

          <h4 className="text-sm font-semibold text-foreground">
            Click to upload or drag and drop your CSV
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Supported format: CSV with phone numbers and optional contact names
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:text-primary"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Download Sample CSV
            </button>
          </div>
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
                  <span>•</span>
                  {contacts.length > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {contacts.length} contact{contacts.length === 1 ? '' : 's'} parsed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <AlertCircle className="size-3" />
                      0 valid contacts
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

          {parseError && (
            <div className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              {parseError}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview (first {Math.min(contacts.length, 5)} rows):</span>
                {contacts.length > 5 && <span>+{contacts.length - 5} more in file</span>}
              </div>
              <div className="max-h-40 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">#</th>
                      <th className="px-3 py-1.5 font-medium">Phone</th>
                      <th className="px-3 py-1.5 font-medium">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contacts.slice(0, 5).map((c, i) => (
                      <tr key={i} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-foreground">{c.phone}</td>
                        <td className="px-3 py-1.5 text-foreground">{c.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !parseError && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
