// libs/ui/src/lib/table.tsx
// Generic, accessible data table. The caller supplies column headers + cell renderers
// as copy/nodes; the component embeds no text of its own.
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface TableColumn<Row> {
  /** Stable key for the column. */
  key: string;
  /** Header copy (localized by the caller). */
  header: ReactNode;
  /** Cell renderer for a given row. */
  cell: (row: Row) => ReactNode;
  /** Right-align (typical for numeric columns). */
  numeric?: boolean;
}

export interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  /** Extracts a stable React key for each row. */
  rowKey: (row: Row) => string;
  /** Accessible caption for the table (localized). */
  caption?: ReactNode;
  /** Rendered in the body when `rows` is empty. */
  emptyState?: ReactNode;
  className?: string;
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  caption,
  emptyState,
  className,
}: TableProps<Row>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-3 py-2.5 font-mono text-eyebrow font-normal uppercase tracking-[0.16em] text-muted',
                  col.numeric ? 'text-right' : 'text-left',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyState ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-line/60 last:border-0 hover:bg-fg/[0.03]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-3 text-fg',
                      col.numeric ? 'text-right font-mono tabular-nums' : 'text-left',
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
