import { Alert, Card, Col, DatePicker, Row, Select, Space, Spin, Statistic, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useEffect, useMemo, useState } from 'react'
import { getDashboardPdfUsageStats, getDashboardUserRegistrations } from '../api/analysis'
import SimpleLineChart from '../components/charts/SimpleLineChart'
import type {
  DashboardPdfUsageStatsResponse,
  DashboardRegistrationStatsResponse,
} from '../types/api'
import { getErrorMessage } from '../utils/error-message'
import './DashboardPage.css'

const { Title, Paragraph, Text } = Typography

dayjs.extend(utc)

const DEFAULT_RANGE_DAYS = 30
const DEFAULT_PDF_MINIMUM_COUNTS = [1, 3, 5, 10]
const PDF_MINIMUM_COUNT_OPTIONS = [1, 3, 5, 10, 20].map((value) => ({
  label: `>= ${value} 次`,
  value: String(value),
}))

type DateRange = [Dayjs, Dayjs]

const createDefaultRange = (): DateRange => [
  dayjs.utc().startOf('day').subtract(DEFAULT_RANGE_DAYS - 1, 'day'),
  dayjs.utc().startOf('day'),
]

const createRangePresets = (): Array<{ label: string; value: [Dayjs, Dayjs] }> => [
  {
    label: '最近 7 天',
    value: [dayjs.utc().startOf('day').subtract(6, 'day'), dayjs.utc().startOf('day')],
  },
  {
    label: '最近 30 天',
    value: [dayjs.utc().startOf('day').subtract(29, 'day'), dayjs.utc().startOf('day')],
  },
  {
    label: '最近 90 天',
    value: [dayjs.utc().startOf('day').subtract(89, 'day'), dayjs.utc().startOf('day')],
  },
]

const toQueryRange = (range: DateRange) => ({
  startDate: `${range[0].format('YYYY-MM-DD')} 00:00:00`,
  endDate: `${range[1].format('YYYY-MM-DD')} 23:59:59`,
})

const normalizeMinimumCounts = (values: Array<string | number>): number[] =>
  Array.from(
    new Set(
      values
        .map((item) => Number(String(item).trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ).sort((left, right) => left - right)

const DashboardPage = () => {
  const [registrationRange, setRegistrationRange] = useState<DateRange>(createDefaultRange)
  const [usageRange, setUsageRange] = useState<DateRange>(createDefaultRange)
  const [pdfMinimumCounts, setPdfMinimumCounts] = useState<number[]>(DEFAULT_PDF_MINIMUM_COUNTS)
  const [registrationStats, setRegistrationStats] =
    useState<DashboardRegistrationStatsResponse | null>(null)
  const [usageStats, setUsageStats] = useState<DashboardPdfUsageStatsResponse | null>(null)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [usageLoading, setUsageLoading] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setRegistrationLoading(true)
      setRegistrationError(null)
      try {
        const data = await getDashboardUserRegistrations(toQueryRange(registrationRange))
        if (!active) {
          return
        }
        setRegistrationStats(data)
      } catch (error) {
        if (!active) {
          return
        }
        setRegistrationStats(null)
        setRegistrationError(getErrorMessage(error, '加载注册统计失败'))
      } finally {
        if (active) {
          setRegistrationLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [registrationRange])

  useEffect(() => {
    let active = true

    const load = async () => {
      setUsageLoading(true)
      setUsageError(null)
      try {
        const data = await getDashboardPdfUsageStats({
          ...toQueryRange(usageRange),
          minimumCounts: pdfMinimumCounts,
        })
        if (!active) {
          return
        }
        setUsageStats(data)
      } catch (error) {
        if (!active) {
          return
        }
        setUsageStats(null)
        setUsageError(getErrorMessage(error, '加载 PDF 用量统计失败'))
      } finally {
        if (active) {
          setUsageLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [pdfMinimumCounts, usageRange])

  const registrationSeries = registrationStats?.series[0]
  const registrationTotal = useMemo(
    () => registrationSeries?.data.reduce((sum, count) => sum + count, 0) ?? 0,
    [registrationSeries],
  )
  const registrationPeak = useMemo(
    () => Math.max(...(registrationSeries?.data ?? [0])),
    [registrationSeries],
  )
  const registrationLatest = registrationSeries
    ? registrationSeries.data[registrationSeries.data.length - 1] ?? 0
    : 0

  const usageSeries = useMemo(() => usageStats?.series ?? [], [usageStats])
  const usagePeak = useMemo(
    () => Math.max(...usageSeries.flatMap((item) => item.data), 0),
    [usageSeries],
  )
  const usageLatestPeak = useMemo(
    () => Math.max(...usageSeries.map((item) => item.data[item.data.length - 1] ?? 0), 0),
    [usageSeries],
  )

  return (
    <div className="dashboard-page">
      <Title level={4} style={{ marginTop: 0 }}>
        工作台
      </Title>
      <Paragraph type="secondary" className="dashboard-page__intro">
        统计口径统一按 UTC 日期切分，便于和后端 `daily_usage.usage_date` 保持一致。
      </Paragraph>

      <div className="dashboard-page__grid">
        <Card title="每日注册人数" className="dashboard-page__card">
          <Space wrap size={12} style={{ marginBottom: 16 }}>
            <DatePicker.RangePicker
              allowClear={false}
              value={registrationRange}
              presets={createRangePresets()}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) {
                  return
                }
                setRegistrationRange([value[0], value[1]])
              }}
            />
            <Text type="secondary">
              当前范围：{registrationStats?.startDate ?? toQueryRange(registrationRange).startDate} 至{' '}
              {registrationStats?.endDate ?? toQueryRange(registrationRange).endDate}
            </Text>
          </Space>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Statistic title="区间新增用户" value={registrationTotal} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="单日峰值" value={registrationPeak} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="最近一天新增" value={registrationLatest} />
            </Col>
          </Row>

          {registrationError ? (
            <Alert type="error" showIcon message={registrationError} style={{ marginBottom: 16 }} />
          ) : null}

          <div style={{ minHeight: 320 }}>
            <Spin spinning={registrationLoading}>
              <SimpleLineChart
                dates={registrationStats?.dates ?? []}
                series={registrationStats?.series ?? []}
                emptyText="当前日期范围暂无注册数据"
              />
            </Spin>
          </div>
        </Card>

        <Card title="每日 PDF 用量人数" className="dashboard-page__card">
          <Space wrap size={12} style={{ marginBottom: 16 }}>
            <DatePicker.RangePicker
              allowClear={false}
              value={usageRange}
              presets={createRangePresets()}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) {
                  return
                }
                setUsageRange([value[0], value[1]])
              }}
            />
            <Select
              mode="tags"
              style={{ minWidth: 320 }}
              maxTagCount="responsive"
              value={pdfMinimumCounts.map(String)}
              options={PDF_MINIMUM_COUNT_OPTIONS}
              tokenSeparators={[',']}
              placeholder="输入最小次数阈值"
              onChange={(value) => {
                const nextValues = normalizeMinimumCounts(value)
                setPdfMinimumCounts(
                  nextValues.length > 0 ? nextValues : DEFAULT_PDF_MINIMUM_COUNTS,
                )
              }}
            />
            <Text type="secondary">阈值语义：大于等于某个次数</Text>
          </Space>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Statistic title="已选阈值数" value={usageSeries.length} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="区间单日峰值人数" value={usagePeak} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="最近一天峰值人数" value={usageLatestPeak} />
            </Col>
          </Row>

          {usageError ? (
            <Alert type="error" showIcon message={usageError} style={{ marginBottom: 16 }} />
          ) : null}

          <div style={{ minHeight: 320 }}>
            <Spin spinning={usageLoading}>
              <SimpleLineChart
                dates={usageStats?.dates ?? []}
                series={usageStats?.series ?? []}
                emptyText="当前日期范围暂无 PDF 用量数据"
              />
            </Spin>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
