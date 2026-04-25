import { Empty } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

type LineSeries = {
  name: string
  data: number[]
  color?: string
}

type SimpleLineChartProps = {
  dates: string[]
  series: LineSeries[]
  height?: number
  emptyText?: string
}

const CHART_COLORS = ['#1677ff', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#2f54eb']
const CHART_WIDTH = 760
const DEFAULT_HEIGHT = 320

const SimpleLineChart = ({
  dates,
  series,
  height = DEFAULT_HEIGHT,
  emptyText = '暂无数据',
}: SimpleLineChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (!dates.length || !series.length) {
      return null
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 44 }
    const chartHeight = height - padding.top - padding.bottom
    const chartWidth = CHART_WIDTH - padding.left - padding.right
    const maxValue = Math.max(...series.flatMap((item) => item.data), 0)
    const safeMaxValue = maxValue > 0 ? maxValue : 1
    const xDivisor = Math.max(dates.length - 1, 1)

    const getX = (index: number) => padding.left + (chartWidth * index) / xDivisor
    const getY = (value: number) =>
      padding.top + chartHeight - (chartHeight * value) / safeMaxValue
    const buildPath = (values: number[]) =>
      values
        .map((value, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(value)}`)
        .join(' ')

    const rawTicks = [0, 0.25, 0.5, 0.75, 1].map((rate) =>
      Math.round(safeMaxValue * rate),
    )
    const yTicks = Array.from(new Set([...rawTicks, safeMaxValue])).sort((a, b) => a - b)
    const xAxisLabels =
      dates.length <= 7
        ? dates.map((date, index) => ({ index, label: dayjs(date).format('MM-DD') }))
        : Array.from(
            new Set([
              0,
              Math.floor((dates.length - 1) / 3),
              Math.floor(((dates.length - 1) * 2) / 3),
              dates.length - 1,
            ]),
          ).map((index) => ({
            index,
            label: dayjs(dates[index]).format('MM-DD'),
          }))

    return {
      padding,
      chartHeight,
      yTicks,
      xAxisLabels,
      renderSeries: series.map((item, index) => ({
        ...item,
        color: item.color ?? CHART_COLORS[index % CHART_COLORS.length],
        path: buildPath(item.data),
        points: item.data.map((value, valueIndex) => ({
          x: getX(valueIndex),
          y: getY(value),
          value,
        })),
      })),
      getY,
      getX,
      showPoints: dates.length <= 31,
    }
  }, [dates, height, series])

  if (!chartData) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const hoveredDate =
    hoveredIndex === null ? null : dayjs(dates[hoveredIndex]).format('YYYY-MM-DD')
  const hoveredX = hoveredIndex === null ? null : chartData.getX(hoveredIndex)
  const tooltipRows =
    hoveredIndex === null
      ? []
      : chartData.renderSeries.map((item) => ({
          name: item.name,
          color: item.color,
          value: item.data[hoveredIndex] ?? 0,
        }))
  const tooltipWidth = 220
  const tooltipLineHeight = 18
  const tooltipHeight = 14 + (tooltipRows.length + 1) * tooltipLineHeight
  const tooltipX =
    hoveredX === null
      ? chartData.padding.left
      : Math.min(
          Math.max(
            hoveredX + 12,
            chartData.padding.left + 8,
          ),
          CHART_WIDTH - chartData.padding.right - tooltipWidth - 8,
        )
  const tooltipY = chartData.padding.top + 8

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const containerRect = event.currentTarget.getBoundingClientRect()
    if (containerRect.width <= 0 || dates.length === 0) {
      return
    }

    const offsetX = event.clientX - containerRect.left
    const svgX = (offsetX / containerRect.width) * CHART_WIDTH
    const minX = chartData.padding.left
    const maxX = CHART_WIDTH - chartData.padding.right
    const safeX = Math.min(Math.max(svgX, minX), maxX)
    const ratio = (safeX - minX) / Math.max(maxX - minX, 1)
    const nextIndex = Math.round(ratio * (dates.length - 1))
    setHoveredIndex(nextIndex)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {chartData.renderSeries.map((item) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#f5f5f5',
              color: '#262626',
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: item.color,
                display: 'inline-block',
              }}
            />
            <span>{item.name}</span>
            <strong>{item.data[hoveredIndex ?? item.data.length - 1] ?? 0}</strong>
          </div>
        ))}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        role="img"
        aria-label="line chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      >
        {chartData.yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={chartData.padding.left}
              y1={chartData.getY(tick)}
              x2={CHART_WIDTH - chartData.padding.right}
              y2={chartData.getY(tick)}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
            <text
              x={chartData.padding.left - 10}
              y={chartData.getY(tick) + 4}
              textAnchor="end"
              fontSize={12}
              fill="#8c8c8c"
            >
              {tick}
            </text>
          </g>
        ))}
        <line
          x1={chartData.padding.left}
          y1={chartData.padding.top}
          x2={chartData.padding.left}
          y2={height - chartData.padding.bottom}
          stroke="#d9d9d9"
          strokeWidth={1}
        />
        <line
          x1={chartData.padding.left}
          y1={height - chartData.padding.bottom}
          x2={CHART_WIDTH - chartData.padding.right}
          y2={height - chartData.padding.bottom}
          stroke="#d9d9d9"
          strokeWidth={1}
        />
        {chartData.xAxisLabels.map((item) => (
          <text
            key={`${item.index}-${item.label}`}
            x={chartData.getX(item.index)}
            y={height - 12}
            textAnchor="middle"
            fontSize={12}
            fill="#8c8c8c"
          >
            {item.label}
          </text>
        ))}
        <rect
          x={chartData.padding.left}
          y={chartData.padding.top}
          width={CHART_WIDTH - chartData.padding.left - chartData.padding.right}
          height={height - chartData.padding.top - chartData.padding.bottom}
          fill="transparent"
        />
        {chartData.renderSeries.map((item) => (
          <g key={item.name}>
            <path
              d={item.path}
              fill="none"
              stroke={item.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.showPoints
              ? item.points.map((point, index) => (
                  <circle
                    key={`${item.name}-${dates[index]}`}
                    cx={point.x}
                    cy={point.y}
                    r={3.5}
                    fill={item.color}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ))
              : null}
            {hoveredIndex !== null ? (
              <circle
                cx={item.points[hoveredIndex]?.x ?? chartData.getX(hoveredIndex)}
                cy={item.points[hoveredIndex]?.y ?? chartData.getY(0)}
                r={5.5}
                fill={item.color}
                stroke="#fff"
                strokeWidth={2}
              />
            ) : null}
          </g>
        ))}
        {hoveredIndex !== null && hoveredX !== null ? (
          <line
            x1={hoveredX}
            y1={chartData.padding.top}
            x2={hoveredX}
            y2={height - chartData.padding.bottom}
            stroke="#595959"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ) : null}
        {hoveredIndex !== null && hoveredDate ? (
          <g>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={8}
              fill="#fff"
              stroke="#d9d9d9"
              strokeWidth={1}
            />
            <text x={tooltipX + 12} y={tooltipY + 20} fill="#262626" fontSize={12} fontWeight={600}>
              {hoveredDate}
            </text>
            {tooltipRows.map((row, index) => (
              <g key={`${row.name}-${row.value}`}>
                <circle
                  cx={tooltipX + 16}
                  cy={tooltipY + 20 + (index + 1) * tooltipLineHeight - 4}
                  r={4}
                  fill={row.color}
                />
                <text
                  x={tooltipX + 28}
                  y={tooltipY + 20 + (index + 1) * tooltipLineHeight}
                  fill="#434343"
                  fontSize={12}
                >
                  {row.name}: {row.value}
                </text>
              </g>
            ))}
          </g>
        ) : null}
      </svg>
    </div>
  )
}

export default SimpleLineChart
