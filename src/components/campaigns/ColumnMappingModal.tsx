'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, Label } from '@/components/ui/Input';
import { buildContactsFromMapping, type ParsedContact } from '@/lib/csv';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ColumnMappingModalProps {
  open: boolean;
  fileName: string;
  headers: string[];
  rows: string[][];
  onConfirm: (contacts: ParsedContact[]) => void;
  onClose: () => void;
}

const NONE_VALUE = '__none__';

export function ColumnMappingModal({
  open,
  fileName,
  headers,
  rows,
  onConfirm,
  onClose,
}: ColumnMappingModalProps) {
  // Auto-detect sensible defaults from header names
  function guessIdx(keywords: string[]): string {
    const idx = headers.findIndex((h) =>
      keywords.some((k) => h.toLowerCase().includes(k))
    );
    return idx !== -1 ? String(idx) : NONE_VALUE;
  }

  const [phoneCol, setPhoneCol] = useState(() => guessIdx(['phone', 'mobile', 'number', 'contact']));
  const [nameCol, setNameCol] = useState(() => guessIdx(['name', 'customer', 'lead', 'person']));

  // Additional context columns: checked map and descriptions
  const [checkedCols, setCheckedCols] = useState<Record<number, boolean>>({});
  const [colDescriptions, setColDescriptions] = useState<Record<number, string>>({});

  const isPhoneSelected = phoneCol !== NONE_VALUE;

  // Selected additional columns
  const selectedExtraCols = useMemo(() => {
    return headers
      .map((header, idx) => ({
        header: header || `Column ${idx + 1}`,
        colIndex: idx,
        description: colDescriptions[idx]?.trim() || '',
        checked: !!checkedCols[idx],
      }))
      .filter((c) => c.checked);
  }, [headers, checkedCols, colDescriptions]);

  // Build preview contacts based on current mapping
  const previewContacts = useMemo(() => {
    if (!isPhoneSelected) return [];
    return buildContactsFromMapping(
      rows.slice(0, 5),
      Number(phoneCol),
      nameCol !== NONE_VALUE ? Number(nameCol) : null,
      selectedExtraCols
    );
  }, [phoneCol, nameCol, selectedExtraCols, rows, isPhoneSelected]);

  function handleConfirm() {
    if (!isPhoneSelected) return;
    const contacts = buildContactsFromMapping(
      rows,
      Number(phoneCol),
      nameCol !== NONE_VALUE ? Number(nameCol) : null,
      selectedExtraCols
    );
    onConfirm(contacts);
  }

  const headerOptions = [
    <option key={NONE_VALUE} value={NONE_VALUE}>— Not mapped —</option>,
    ...headers.map((h, i) => (
      <option key={i} value={String(i)}>
        {h || `Column ${i + 1}`}
      </option>
    )),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Map columns" widthClassName="max-w-xl">
      <div className="space-y-5">
        {/* File name pill */}
        <div className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground truncate">{fileName}</span>
          <span>·</span>
          <span>{rows.length} rows detected</span>
        </div>

        {/* Required mappings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required</p>

          <div>
            <Label htmlFor="phoneCol">
              Mobile / Phone Number <span className="text-danger">*</span>
            </Label>
            <Select
              id="phoneCol"
              value={phoneCol}
              onChange={(e) => setPhoneCol(e.target.value)}
              className={cn(!isPhoneSelected && 'border-danger/60')}
            >
              <option value={NONE_VALUE}>— Select column —</option>
              {headers.map((h, i) => (
                <option key={i} value={String(i)}>
                  {h || `Column ${i + 1}`}
                </option>
              ))}
            </Select>
            {!isPhoneSelected && (
              <p className="mt-1 text-xs text-danger">You must map a phone number column to continue.</p>
            )}
          </div>
        </div>

        {/* Optional mappings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional</p>

          <div>
            <Label htmlFor="nameCol">Contact Name</Label>
            <Select id="nameCol" value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
              {headerOptions}
            </Select>
          </div>
        </div>

        {/* Additional context columns */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Context Columns
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select columns to pass as context variables. When checked, enter a description so the AI agent understands what the data represents.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-surface/40">
            {headers.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No columns detected in the file.
              </div>
            ) : (
              headers.map((header, idx) => {
                const isPhone = phoneCol !== NONE_VALUE && Number(phoneCol) === idx;
                const isName = nameCol !== NONE_VALUE && Number(nameCol) === idx;
                const isChecked = !!checkedCols[idx];
                const desc = colDescriptions[idx] || '';

                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 transition-colors',
                      isChecked ? 'bg-primary-soft/15' : 'hover:bg-surface-hover/40'
                    )}
                  >
                    <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCheckedCols((prev) => ({ ...prev, [idx]: checked }));
                          }}
                          className="size-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                        />
                        <span className="text-sm font-medium text-foreground truncate">
                          {header || `Column ${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPhone && (
                          <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Phone
                          </span>
                        )}
                        {isName && (
                          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Name
                          </span>
                        )}
                      </div>
                    </label>

                    {isChecked && (
                      <div className="mt-2.5 pl-6.5">
                        <input
                          type="text"
                          value={desc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColDescriptions((prev) => ({ ...prev, [idx]: val }));
                          }}
                          placeholder={`Description for "${header || `Column ${idx + 1}`}" (e.g. what this value means for the AI)`}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Preview */}
        {previewContacts.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-hover/30 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Preview (first {previewContacts.length} rows)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-1.5 pr-3 font-medium">Phone</th>
                    <th className="pb-1.5 pr-3 font-medium">Name</th>
                    {selectedExtraCols.map((col) => (
                      <th key={col.colIndex} className="pb-1.5 pr-3 font-medium">
                        <div>{col.header}</div>
                        {col.description && (
                          <div className="text-[10px] font-normal text-muted-foreground italic">
                            {col.description}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewContacts.map((c, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 font-mono text-foreground">{c.phone}</td>
                      <td className="py-1.5 pr-3 text-foreground">{c.name || '—'}</td>
                      {selectedExtraCols.map((col) => (
                        <td key={col.colIndex} className="py-1.5 pr-3 text-foreground">
                          {c.metadata?.[col.header] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isPhoneSelected}
          >
            <CheckCircle2 className="size-3.5" />
            Confirm &amp; Import {rows.length} contacts
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
