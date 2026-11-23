import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts'
import { useUiStore } from '@/stores/uiStore'
import { num, peso, pesoShort } from '@/lib/format'

/**
 * Categorical palette — brand-led (indigo first), fixed order, validated with the dataviz validator:
 * light vs #FFFFFF and dark vs #131929 both pass lightness, chroma, adjacent CVD (≥17 / ≥19 ΔE) and
 * normal-vision floors. Light amber is < 3:1 on white, so every categorical chart ships visible labels/legend values.
 */
const LIGHT = ['#6366F1', '#EB6834', '#0891B2', '#EDA100', '#D946EF', '#0CA30C']
const DARK = ['#7C83F5', '#D95926', '#1595B5', '#C07E00', '#BD4BD1', '#139B13']

export function useChartTheme() {
  const dark = useUiStore((s) => s.theme) === 'dark'
  return {
    series: dark ? DARK : LIGHT,
    grid: dark ? '#29334A' : '#EEF2F7',
    axis: dark ? '#94A3B8' : '#64748B',
    surface: dark ? '#131929' : '#FFFFFF',
  }
}

/** Fixed colors per payment method — color follows the entity, never its rank. */
export const METHOD_SLOT = { CASH: 0, GCASH: 2, MAYA: 5, BANK_TRANSFER: 1 }

/** Folds anything past `max` slices into "Other" so no hue is ever generated. */
export function foldOther(rows, max = 5, key = 'value', label = 'name') {
  if (!rows || rows.length <= max + 1) return rows || []
  const head = rows.slice(0, max)
  const rest = rows.slice(max).reduce((s, r) => s + Number(r[key] || 0), 0)
  return [...head, { [label]: 'Other', [key]: rest }]
}

function TooltipBox({ active, payload, label, money = true, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[160px] rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      {label !== undefined && <p className="mb-1.5 text-xs font-semibold text-muted">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color || p.payload?.fill }} aria-hidden />
            {p.name}
          </span>
          <span className="tabular font-semibold text-ink">{money ? peso(p.value) : num(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

const axisProps = (t) => ({ tick: { fill: t.axis, fontSize: 11 }, axisLine: false, tickLine: false })

/** One or more ₱ series over time on a single axis (2px lines, crosshair tooltip). */
export function TrendChart({ data, xKey = 'label', series, height = 280, area = true }) {
  const t = useChartTheme()
  const Chart = area ? AreaChart : LineChart
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.series[s.slot ?? i]} stopOpacity={0.18} />
                <stop offset="100%" stopColor={t.series[s.slot ?? i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey={xKey} {...axisProps(t)} minTickGap={18} />
          <YAxis {...axisProps(t)} width={56} tickFormatter={pesoShort} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: t.axis, strokeDasharray: '3 3' }} />
          {series.map((s, i) =>
            area ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={t.series[s.slot ?? i]} strokeWidth={2}
                fill={`url(#trend-${s.key})`} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={t.series[s.slot ?? i]} strokeWidth={2}
                dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

/** Stacked bars (e.g. products vs services). 2px surface gap between segments, rounded top. */
export function StackedBarChart({ data, xKey = 'label', series, height = 260, money = true }) {
  const t = useChartTheme()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey={xKey} {...axisProps(t)} minTickGap={12} />
          <YAxis {...axisProps(t)} width={56} tickFormatter={money ? pesoShort : num} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: t.grid, opacity: 0.6 }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={t.series[s.slot ?? i]} stroke={t.surface} strokeWidth={2}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Grouped (side-by-side) bars on one ₱ axis. */
export function GroupedBarChart({ data, xKey = 'label', series, height = 280, money = true }) {
  const t = useChartTheme()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey={xKey} {...axisProps(t)} minTickGap={8} />
          <YAxis {...axisProps(t)} width={56} tickFormatter={money ? pesoShort : num} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: t.grid, opacity: 0.6 }} />
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={t.series[s.slot ?? i]} radius={[4, 4, 0, 0]} maxBarSize={28} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Ranked horizontal bars with direct value labels (single series). */
export function HBarChart({ data, labelKey = 'name', valueKey = 'value', money = true, height, slot = 0 }) {
  const t = useChartTheme()
  const h = height || Math.max(180, data.length * 40 + 20)
  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }} barCategoryGap="28%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={labelKey} width={128} {...axisProps(t)} tick={{ fill: t.axis, fontSize: 12 }} />
          <Tooltip content={<TooltipBox money={money} />} cursor={{ fill: t.grid, opacity: 0.6 }} />
          <Bar dataKey={valueKey} name={money ? 'Revenue' : 'Value'} fill={t.series[slot]} radius={[0, 4, 4, 0]}>
            <LabelList dataKey={valueKey} position="right" formatter={money ? pesoShort : num} style={{ fill: t.axis, fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Donut with a legend that doubles as a value table (relief for the low-contrast amber slot).
 * colorFor(row, index) lets callers pin entity colors (e.g. payment methods).
 */
export function DonutChart({ data, labelKey = 'name', valueKey = 'value', money = true, colorFor, centerLabel, height = 200 }) {
  const t = useChartTheme()
  const rows = data || []
  const total = rows.reduce((s, r) => s + Number(r[valueKey] || 0), 0)
  const color = (r, i) => (colorFor ? colorFor(r, i, t.series) : t.series[i % t.series.length])
  return (
    <div className="flex flex-col items-center gap-5">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey={valueKey} nameKey={labelKey} innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke={t.surface} strokeWidth={2} cornerRadius={4}>
              {rows.map((r, i) => <Cell key={i} fill={color(r, i)} />)}
            </Pie>
            <Tooltip content={<TooltipBox money={money} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted">{centerLabel || 'Total'}</span>
          <span className="tabular font-display text-base font-extrabold">{money ? pesoShort(total) : num(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {rows.map((r, i) => (
          <li key={r[labelKey] ?? i} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(r, i) }} aria-hidden />
              <span className="truncate text-ink">{r[labelKey]}</span>
            </span>
            <span className="tabular shrink-0 text-muted">
              <span className="font-semibold text-ink">{money ? peso(r[valueKey]) : num(r[valueKey])}</span>
              <span className="ml-1.5 text-xs">{total ? Math.round((Number(r[valueKey]) / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
