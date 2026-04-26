import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

export type TimeZoneOption = {
  label: string
  timeZone: string
  region: string
  description: string
}

type TimeZoneParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export type FormattedTimeZoneDateTime = {
  dateLine: string
  timeLine: string
}

export const DEFAULT_SOURCE_TIME_ZONE = 'Asia/Shanghai'

export const COMMON_TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  {
    label: 'UTC',
    timeZone: 'UTC',
    region: '全球',
    description: '协调世界时',
  },
  {
    label: '北京时间',
    timeZone: 'Asia/Shanghai',
    region: '中国',
    description: '中国标准时间',
  },
  {
    label: '新加坡',
    timeZone: 'Asia/Singapore',
    region: '东南亚',
    description: '新加坡时间',
  },
  {
    label: '日本（东京）',
    timeZone: 'Asia/Tokyo',
    region: '日本',
    description: '日本标准时间',
  },
  {
    label: '韩国（首尔）',
    timeZone: 'Asia/Seoul',
    region: '韩国',
    description: '韩国标准时间',
  },
  {
    label: '澳大利亚（悉尼）',
    timeZone: 'Australia/Sydney',
    region: '大洋洲',
    description: '澳大利亚东部时间',
  },
  {
    label: '新西兰（奥克兰）',
    timeZone: 'Pacific/Auckland',
    region: '大洋洲',
    description: '新西兰标准时间',
  },
  {
    label: '美国（纽约）',
    timeZone: 'America/New_York',
    region: '美国东部',
    description: '美国东部时间',
  },
  {
    label: '美国（洛杉矶）',
    timeZone: 'America/Los_Angeles',
    region: '美国西部',
    description: '美国太平洋时间',
  },
  {
    label: '加拿大（多伦多）',
    timeZone: 'America/Toronto',
    region: '北美',
    description: '北美东部时间',
  },
  {
    label: '英国（伦敦）',
    timeZone: 'Europe/London',
    region: '英国',
    description: '英国时间',
  },
  {
    label: '法国（巴黎）',
    timeZone: 'Europe/Paris',
    region: '欧洲',
    description: '中欧时间',
  },
  {
    label: '德国（柏林）',
    timeZone: 'Europe/Berlin',
    region: '欧洲',
    description: '中欧时间',
  },
  {
    label: '意大利（罗马）',
    timeZone: 'Europe/Rome',
    region: '欧洲',
    description: '中欧时间',
  },
  {
    label: '瑞士（苏黎世）',
    timeZone: 'Europe/Zurich',
    region: '欧洲',
    description: '中欧时间',
  },
  {
    label: '印度（新德里）',
    timeZone: 'Asia/Kolkata',
    region: '印度',
    description: '印度标准时间',
  },
  {
    label: '阿联酋（迪拜）',
    timeZone: 'Asia/Dubai',
    region: '中东',
    description: '海湾标准时间',
  },
  {
    label: '沙特（利雅得）',
    timeZone: 'Asia/Riyadh',
    region: '中东',
    description: '阿拉伯标准时间',
  },
  {
    label: '以色列（耶路撒冷）',
    timeZone: 'Asia/Jerusalem',
    region: '中东',
    description: '以色列时间',
  },
]

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()
const displayFormatterCache = new Map<string, Intl.DateTimeFormat>()
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

const getDisplayFormatter = (timeZone: string) => {
  if (!displayFormatterCache.has(timeZone)) {
    displayFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        hour12: false,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }),
    )
  }

  return displayFormatterCache.get(timeZone)!
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

export const getTimeZoneParts = (date: Date, timeZone: string): TimeZoneParts => {
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

const pad = (value: number) => String(value).padStart(2, '0')

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

export const formatTimeZoneDateTime = (date: Date, timeZone: string) =>
  getDisplayFormatter(timeZone).format(date)

export const formatTimeZoneDateTimeLines = (
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

export const getCurrentDayjsForTimeZone = (timeZone: string) => {
  const parts = getTimeZoneParts(new Date(), timeZone)

  return dayjs(
    new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  )
}

export const toUtcDateFromTimeZoneValue = (value: Dayjs, timeZone: string) => {
  const naiveUtcTimestamp = Date.UTC(
    value.year(),
    value.month(),
    value.date(),
    value.hour(),
    value.minute(),
    value.second(),
  )
  const firstOffset = getTimeZoneOffsetMs(new Date(naiveUtcTimestamp), timeZone)
  let utcTimestamp = naiveUtcTimestamp - firstOffset

  // 再计算一次，尽量覆盖夏令时切换日的偏移变化。
  const secondOffset = getTimeZoneOffsetMs(new Date(utcTimestamp), timeZone)
  if (secondOffset !== firstOffset) {
    utcTimestamp = naiveUtcTimestamp - secondOffset
  }

  return new Date(utcTimestamp)
}

export const getTimeZoneOption = (timeZone: string) =>
  COMMON_TIME_ZONE_OPTIONS.find((option) => option.timeZone === timeZone) ?? null
