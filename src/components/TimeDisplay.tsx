import { Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ReactNode } from 'react'

const { Text } = Typography

type TimeDisplayValue = string | number | Date | Dayjs | null | undefined

type TimeZoneParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

type FormattedTimeZoneDateTime = {
  dateLine: string
  timeLine: string
}

type TimeDisplayProps = {
  value?: TimeDisplayValue
  emptyText?: ReactNode
  allowWrap?: boolean
}

type TooltipTimeZoneItem = {
  label: string
  region: string
  timeZone: string
  color?: string
}

const tooltipTimeZones: TooltipTimeZoneItem[] = [
  { label: 'UTC', region: '全球', timeZone: 'UTC', color: 'blue' },
  { label: '北京时间', region: '中国', timeZone: 'Asia/Shanghai', color: 'gold' },
  { label: '美国时间', region: '美国东部 / 纽约', timeZone: 'America/New_York' },
  { label: '美西时间', region: '美国西部 / 洛杉矶', timeZone: 'America/Los_Angeles' },
  { label: '日韩时间', region: '日本东京 / 韩国首尔', timeZone: 'Asia/Tokyo' },
  { label: '英国时间', region: '英国伦敦', timeZone: 'Europe/London' },
  { label: '印度时间', region: '印度新德里', timeZone: 'Asia/Kolkata' },
]

const bareUtcDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/

const pad = (value: number) => String(value).padStart(2, '0')

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>()

const getPartsFormatter = (timeZone: string) => {
  if (!partsFormatterCache.has(timeZone)) {
    partsFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        hour12: false,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    )
  }

  return partsFormatterCache.get(timeZone)!
}

const getWeekdayFormatter = (timeZone: string) => {
  if (!weekdayFormatterCache.has(timeZone)) {
    weekdayFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        weekday: 'short',
      }),
    )
  }

  return weekdayFormatterCache.get(timeZone)!
}

const getPartNumber = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) => Number(parts.find((part) => part.type === type)?.value ?? 0)

const getTimeZoneParts = (date: Date, timeZone: string): TimeZoneParts => {
  const parts = getPartsFormatter(timeZone).formatToParts(date)

  return {
    year: getPartNumber(parts, 'year'),
    month: getPartNumber(parts, 'month'),
    day: getPartNumber(parts, 'day'),
    hour: getPartNumber(parts, 'hour'),
    minute: getPartNumber(parts, 'minute'),
    second: getPartNumber(parts, 'second'),
  }
}

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone)
  const zonedUtcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return zonedUtcTimestamp - date.getTime()
}

const formatOffsetLabel = (offsetMs: number) => {
  const totalMinutes = Math.round(offsetMs / 60000)
  const sign = totalMinutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(totalMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60

  if (minutes === 0) {
    return `GMT${sign}${hours}`
  }

  return `GMT${sign}${hours}:${pad(minutes)}`
}

const formatTimeZoneDateTimeLines = (
  date: Date,
  timeZone: string,
): FormattedTimeZoneDateTime => {
  const parts = getTimeZoneParts(date, timeZone)
  const weekday = getWeekdayFormatter(timeZone).format(date)
  const offsetLabel = formatOffsetLabel(getTimeZoneOffsetMs(date, timeZone))

  return {
    dateLine: `${parts.year}/${pad(parts.month)}/${pad(parts.day)}${weekday}`,
    timeLine: `${offsetLabel} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`,
  }
}

const normalizeTimestamp = (value: number) => {
  if (!Number.isFinite(value)) {
    return null
  }

  return Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value
}

const parseStringValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^-?\d+$/.test(trimmed)) {
    const timestamp = normalizeTimestamp(Number(trimmed))
    if (timestamp == null) {
      return null
    }

    const parsedFromTimestamp = new Date(timestamp)
    return Number.isNaN(parsedFromTimestamp.getTime()) ? null : parsedFromTimestamp
  }

  const bareUtcMatch = trimmed.match(bareUtcDateTimePattern)
  if (bareUtcMatch) {
    const millisecond = Number((bareUtcMatch[7] ?? '').padEnd(3, '0').slice(0, 3) || '0')
    const parsedBareUtc = new Date(
      Date.UTC(
        Number(bareUtcMatch[1]),
        Number(bareUtcMatch[2]) - 1,
        Number(bareUtcMatch[3]),
        Number(bareUtcMatch[4]),
        Number(bareUtcMatch[5]),
        Number(bareUtcMatch[6]),
        millisecond,
      ),
    )

    return Number.isNaN(parsedBareUtc.getTime()) ? null : parsedBareUtc
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeTimeValue = (value?: TimeDisplayValue) => {
  if (value == null || value === '') {
    return null
  }

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.toDate() : null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const timestamp = normalizeTimestamp(value)
    if (timestamp == null) {
      return null
    }

    const parsed = new Date(timestamp)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value === 'string') {
    return parseStringValue(value)
  }

  return null
}

const formatUtcDisplay = (date: Date) => {
  const parts = getTimeZoneParts(date, 'UTC')

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
}

const renderTooltipContent = (date: Date) => (
  <div
    style={{
      display: 'grid',
      gap: 6,
      minWidth: 320,
    }}
  >
    {tooltipTimeZones.map((item) => {
      const formatted = formatTimeZoneDateTimeLines(date, item.timeZone)
      const dateTime = `${formatted.dateLine} ${formatted.timeLine}`

      return (
        <div
          key={item.timeZone}
          style={{
            display: 'grid',
            gap: 2,
            padding: '4px 0',
            borderBottom:
              item.timeZone === tooltipTimeZones[tooltipTimeZones.length - 1]?.timeZone
                ? 'none'
                : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
              }}
            >
              <Tag color={item.color ?? 'default'} style={{ marginInlineEnd: 0 }}>
                {item.label}
              </Tag>
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                {item.region}
              </Text>
            </div>
          </div>
          <Text
            style={{
              color: '#fff',
              fontSize: 12,
              lineHeight: 1.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {dateTime}
          </Text>
        </div>
      )
    })}
  </div>
)

export const TimeDisplay = ({
  value,
  emptyText = '—',
  allowWrap = false,
}: TimeDisplayProps) => {
  const parsed = normalizeTimeValue(value)

  if (!parsed) {
    return <>{emptyText}</>
  }

  return (
    <Tooltip title={renderTooltipContent(parsed)} placement="topLeft">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'help',
          flexWrap: allowWrap ? 'wrap' : 'nowrap',
          whiteSpace: allowWrap ? 'normal' : 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Text
          style={{
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: allowWrap ? 'normal' : 'nowrap',
            overflowWrap: allowWrap ? 'anywhere' : undefined,
          }}
        >
          {formatUtcDisplay(parsed)}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          UTC
        </Text>
      </span>
    </Tooltip>
  )
}
