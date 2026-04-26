import { Button, Card, DatePicker, Divider, Select, Space, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import {
  COMMON_TIME_ZONE_OPTIONS,
  DEFAULT_SOURCE_TIME_ZONE,
  formatTimeZoneDateTimeLines,
  getCurrentDayjsForTimeZone,
  getTimeZoneOption,
  toUtcDateFromTimeZoneValue,
} from '../utils/timezone'
import './ToolboxPage.css'

const { Title, Paragraph, Text } = Typography

const defaultTargetTimeZones = COMMON_TIME_ZONE_OPTIONS.map((option) => option.timeZone).filter(
  (timeZone) => timeZone !== DEFAULT_SOURCE_TIME_ZONE,
)

const currentDisplayTimeZones = COMMON_TIME_ZONE_OPTIONS.filter(
  (option) => option.timeZone !== 'UTC',
)

const toSelectOptions = COMMON_TIME_ZONE_OPTIONS.map((option) => ({
  label: option.label,
  value: option.timeZone,
}))

const TimeText = ({
  date,
  timeZone,
  className,
}: {
  date: Date
  timeZone: string
  className: string
}) => {
  const formatted = formatTimeZoneDateTimeLines(date, timeZone)

  return (
    <p className={className}>
      <span>{formatted.dateLine}</span>
      <span>{formatted.timeLine}</span>
    </p>
  )
}

const ToolboxPage = () => {
  const [now, setNow] = useState(() => new Date())
  const [sourceTimeZone, setSourceTimeZone] = useState(DEFAULT_SOURCE_TIME_ZONE)
  const [selectedDateTime, setSelectedDateTime] = useState<Dayjs>(() =>
    getCurrentDayjsForTimeZone(DEFAULT_SOURCE_TIME_ZONE),
  )
  const [targetTimeZones, setTargetTimeZones] = useState<string[]>(defaultTargetTimeZones)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    setTargetTimeZones((current) => current.filter((timeZone) => timeZone !== sourceTimeZone))
  }, [sourceTimeZone])

  const sourceTimeZoneOption = useMemo(
    () => getTimeZoneOption(sourceTimeZone),
    [sourceTimeZone],
  )

  const convertedUtcDate = useMemo(
    () => toUtcDateFromTimeZoneValue(selectedDateTime, sourceTimeZone),
    [selectedDateTime, sourceTimeZone],
  )

  const selectedTargetTimeZones = useMemo(
    () =>
      targetTimeZones
        .map((timeZone) => getTimeZoneOption(timeZone))
        .filter((option) => option !== null),
    [targetTimeZones],
  )

  return (
    <div className="toolbox-page">
      <Title level={5} style={{ marginTop: 0 }}>
        工具箱
      </Title>
      <Paragraph type="secondary" className="toolbox-page__intro" style={{ fontSize: 13 }}>
        这里放纯前端的小工具。当前先提供时间转换器，统一基于浏览器内置 `Intl` 时区能力做转换。
      </Paragraph>

      <Card title="时间转换器" size="small" className="toolbox-page__tool-card">
        <div className="toolbox-page__hero">
          <p className="toolbox-page__hero-title">当前 UTC 时间</p>
          <TimeText date={now} timeZone="UTC" className="toolbox-page__hero-time" />
          <p className="toolbox-page__hero-note">
            下面的常用国家/地区时间都基于这一刻同步换算。
          </p>
        </div>

        <section>
          <div className="toolbox-page__section-head">
            <div>
              <h2 className="toolbox-page__section-title">常用国家时间速览</h2>
              <p className="toolbox-page__section-note">
                覆盖欧美、日韩、中东、印度、新加坡和北京时间。
              </p>
            </div>
            <Text type="secondary">自动每秒刷新</Text>
          </div>

          <div className="toolbox-page__zone-grid">
            {currentDisplayTimeZones.map((option) => (
              <div key={option.timeZone} className="toolbox-page__zone-card">
                <p className="toolbox-page__zone-region">{option.region}</p>
                <p className="toolbox-page__zone-label">{option.label}</p>
                <p className="toolbox-page__zone-description">{option.description}</p>
                <TimeText
                  date={now}
                  timeZone={option.timeZone}
                  className="toolbox-page__zone-time"
                />
              </div>
            ))}
          </div>
        </section>

        <Divider style={{ margin: 0 }} />

        <section>
          <div className="toolbox-page__section-head">
            <div>
              <h2 className="toolbox-page__section-title">手动时间转换</h2>
              <p className="toolbox-page__section-note">
                先选择源时区和对应日期时间，再把它转换成其他国家/地区时间。默认源时区是北京时间。
              </p>
            </div>
            <Button size="small" onClick={() => setSelectedDateTime(getCurrentDayjsForTimeZone(sourceTimeZone))}>
              重置为当前源时区时间
            </Button>
          </div>

          <div className="toolbox-page__controls">
            <div className="toolbox-page__control-item">
              <Text strong style={{ fontSize: 13 }}>源日期时间</Text>
              <DatePicker
                showTime={{ format: 'HH:mm:ss' }}
                allowClear={false}
                format="YYYY-MM-DD HH:mm:ss"
                value={selectedDateTime}
                style={{ width: '100%', marginTop: 4 }}
                onChange={(value) => {
                  if (!value) {
                    return
                  }
                  setSelectedDateTime(value)
                }}
              />
            </div>

            <div className="toolbox-page__control-item">
              <Text strong style={{ fontSize: 13 }}>源时区</Text>
              <Select
                showSearch
                optionFilterProp="label"
                value={sourceTimeZone}
                style={{ width: '100%', marginTop: 4 }}
                options={toSelectOptions}
                onChange={(value) => setSourceTimeZone(value)}
              />
            </div>

            <div className="toolbox-page__control-item">
              <Text strong style={{ fontSize: 13 }}>输出时区</Text>
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                maxTagCount="responsive"
                value={targetTimeZones}
                style={{ width: '100%', marginTop: 4 }}
                options={toSelectOptions.filter((option) => option.value !== sourceTimeZone)}
                onChange={(value) => setTargetTimeZones(value)}
              />
            </div>
          </div>

          <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 14 }}>
            <div className="toolbox-page__source-preview">
              <p className="toolbox-page__source-preview-label">
                源时区时间
                {sourceTimeZoneOption ? ` · ${sourceTimeZoneOption.label}` : ''}
              </p>
              <TimeText
                date={convertedUtcDate}
                timeZone={sourceTimeZone}
                className="toolbox-page__source-preview-time"
              />
            </div>

            <div className="toolbox-page__zone-grid">
              {selectedTargetTimeZones.map((option) => (
                <div key={option.timeZone} className="toolbox-page__zone-card">
                  <p className="toolbox-page__zone-region">{option.region}</p>
                  <p className="toolbox-page__zone-label">{option.label}</p>
                  <p className="toolbox-page__zone-description">{option.description}</p>
                  <TimeText
                    date={convertedUtcDate}
                    timeZone={option.timeZone}
                    className="toolbox-page__zone-time"
                  />
                </div>
              ))}
            </div>
          </Space>
        </section>
      </Card>
    </div>
  )
}

export default ToolboxPage
