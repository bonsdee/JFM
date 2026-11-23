import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Skeleton, EmptyState } from './Display'

/**
 * Data table with sortable headers, skeleton loading, empty state and pagination.
 * columns: [{ key, header, cell?: (row) => node, sortable?, align?: 'right'|'center', className? }]
 * sort: "field,dir" string (matches Spring Pageable sort param).
 */
export function DataTable({
  columns, rows, loading, sort, onSort, onRowClick, empty, page, onPageChange, rowKey = 'id', dense, footer,
}) {
  const [sortField, sortDir] = (sort || '').split(',')
  const toggleSort = (key) => {
    if (!onSort) return
    onSort(sortField === key && sortDir === 'asc' ? `${key},desc` : `${key},asc`)
  }

  return (
    <div className="card overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/80 bg-subtle/60">
              {columns.map((c) => {
                const active = sortField === c.key
                const SortIcon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.headerClassName)}
                  >
                    {c.sortable ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
                        {c.header}
                        <SortIcon className="h-3 w-3" aria-hidden />
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-line/50 last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5"><Skeleton className="h-4 w-full max-w-[160px]" /></td>
                    ))}
                  </tr>
                ))
              : rows?.map((row, i) => (
                  <tr
                    key={row[rowKey] ?? i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn('border-b border-line/50 transition last:border-0', onRowClick && 'cursor-pointer hover:bg-primary-50/40 focus:bg-primary-50/40 dark:hover:bg-primary/5')}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4', dense ? 'py-2.5' : 'py-3.5', c.align === 'right' && 'tabular text-right', c.align === 'center' && 'text-center', c.className)}>
                        {c.cell ? c.cell(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
          {footer && !loading && rows?.length > 0 && <tfoot className="border-t border-line bg-subtle/40 font-semibold">{footer}</tfoot>}
        </table>
      </div>
      {!loading && (!rows || rows.length === 0) && (empty || <EmptyState icon={Inbox} title="Nothing here yet" message="Try changing your filters." />)}
      {page && page.totalPages > 1 && <Pagination page={page} onPageChange={onPageChange} />}
    </div>
  )
}

export function Pagination({ page, onPageChange }) {
  const { page: current, totalPages, totalElements, size } = page
  const from = current * size + 1
  const to = Math.min((current + 1) * size, totalElements)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-4 py-3 text-sm text-muted">
      <span className="tabular">{from}–{to} of {totalElements}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page.first} onClick={() => onPageChange(current - 1)} className="rounded-full p-2 hover:bg-subtle disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular px-2 text-ink">Page {current + 1} of {totalPages}</span>
        <button type="button" disabled={page.last} onClick={() => onPageChange(current + 1)} className="rounded-full p-2 hover:bg-subtle disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
