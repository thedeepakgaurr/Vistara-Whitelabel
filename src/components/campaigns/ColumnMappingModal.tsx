'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, Label } from '@/components/ui/Input';
import { buildContactsFromMapping, type ParsedContact } from '@/lib/csv';
import { Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
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
  // Additional context columns: [{header, colIndex}]
  const [extraCols, setExtraCols] = useState<{ id: number; colIndex: string }[]>([]);
  const [nextId, setNextId] = useState(0);

  const isPhoneSelected = phoneCol !== NONE_VALUE;

  // Build preview contacts based on current mapping
  const previewContacts = useMemo(() => {
    if (!isPhoneSelected) return [];
    const metadataCols = extraCols
      .filter((e) => e.colIndex !== NONE_VALUE)
      .map((e) => ({ header: headers[Number(e.colIndex)], colIndex: Number(e.colIndex) }));
    return buildContactsFromMapping(
      rows.slice(0, 5),
      Number(phoneCol),
      nameCol !== NONE_VALUE ? Number(nameCol) : null,
      metadataCols
    );
  }, [phoneCol, nameCol, extraCols, rows, headers, isPhoneSelected]);

  function addExtraCol() {
    // Find first header not already mapped
    const usedIndices = new Set([
      phoneCol !== NONE_VALUE ? phoneCol : null,
      nameCol !== NONE_VALUE ? nameCol : null,
      ...extraCols.map((e) => e.colIndex),
    ]);
    const firstFree = headers.findIndex((_, i) => !usedIndices.has(String(i)));
    setExtraCols((prev) => [...prev, { id: nextId, colIndex: firstFree !== -1 ? String(firstFree) : NONE_VALUE }]);
    setNextId((n) => n + 1);
  }

  function removeExtraCol(id: number) {
    setExtraCols((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExtraCol(id: number, colIndex: string) {
    setExtraCols((prev) => prev.map((e) => (e.id === id ? { ...e, colIndex } : e)));
  }

  function handleConfirm() {
    if (!isPhoneSelected) return;
    const metadataCols = extraCols
      .filter((e) => e.colIndex !== NONE_VALUE)
      .map((e) => ({ header: headers[Number(e.colIndex)], colIndex: Number(e.colIndex) }));
    const contacts = buildContactsFromMapping(
      rows,
      Number(phoneCol),
      nameCol !== NONE_VALUE ? Number(nameCol) : null,
      metadataCols
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Context
            </p>
            <button
              type="button"
              onClick={addExtraCol}
              disabled={headers.length === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-40"
            >
              <Plus className="size-3.5" />
              Add column
            </button>
          </div>

          {extraCols.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Map additional spreadsheet columns to be sent as metadata with each call (e.g. lead source, product interest).
            </p>
          )}

          {extraCols.map((ec) => (
            <div key={ec.id} className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={ec.colIndex}
                  onChange={(e) => updateExtraCol(ec.id, e.target.value)}
                >
                  {headerOptions}
                </Select>
              </div>
              <button
                type="button"
                onClick={() => removeExtraCol(ec.id)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
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
                    {extraCols
                      .filter((e) => e.colIndex !== NONE_VALUE)
                      .map((e) => (
                        <th key={e.id} className="pb-1.5 pr-3 font-medium">
                          {headers[Number(e.colIndex)] || `Col ${Number(e.colIndex) + 1}`}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewContacts.map((c, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 font-mono text-foreground">{c.phone}</td>
                      <td className="py-1.5 pr-3 text-foreground">{c.name || '—'}</td>
                      {extraCols
                        .filter((e) => e.colIndex !== NONE_VALUE)
                        .map((e) => (
                          <td key={e.id} className="py-1.5 pr-3 text-foreground">
                            {c.metadata?.[headers[Number(e.colIndex)]] || '—'}
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
