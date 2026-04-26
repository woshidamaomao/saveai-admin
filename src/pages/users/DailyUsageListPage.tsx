import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDailyUsages } from '../../api/daily-usages'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiDailyUsage } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography

dayjs.extend(utc)

const PAGE_SIZE = 10

type DateRange = [Dayjs, Dayjs]

type ListFormValues = {
  userUid?: string
  email?: string
  usageDateRange?: DateRange
}

type ListFilters = {
  userUid: string
  email: string
  startDate: string
  endDate: string
}

const emptyFilters: ListFilters = {
  userUid: '',
  email: '',
  startDate: '',
  endDate: '',
}

const wrapCellStyle = {
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}

const renderWrapText = (value?: string | null) => (
  <span style={wrapCellStyle}>{value || '—'}</span>
)

const toDateRangeFilters = (range?: DateRange | null) => ({
  startDate: range?.[0]?.format('YYYY-MM-DD') ?? '',
  endDate: range?.[1]?.format('YYYY-MM-DD') ?? '',
})

const createUsageDatePresets = (): Array<{ label: string; value: DateRange }> => [
  {
    label: '最近 3 天',
    value: [dayjs.utc().startOf('day').subtract(2, 'day'), dayjs.utc().startOf('day')],
  },
  {
    label: '最近 7 天',
    value: [dayjs.utc().startOf('day').subtract(6, 'day'), dayjs.utc().startOf('day')],
  },
  {
    label: '近 1 个月',
    value: [dayjs.utc().startOf('day').subtract(1, 'month'), dayjs.utc().startOf('day')],
  },
]

const areFiltersEqual = (left: ListFilters, right: ListFilters) =>
  left.userUid === right.userUid &&
  left.email === right.email &&
  left.startDate === right.startDate &&
  left.endDate === right.endDate

const DailyUsageListPage = () => {
  const [form] = Form.useForm<ListFormValues>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryUserUid = searchParams.get('userUid')?.trim() ?? ''
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiDailyUsage[]>([])
  const [total, setTotal] = useState(0)
  const [applied, setApplied] = useState<ListFilters>({
    ...emptyFilters,
    userUid: queryUserUid,
  })

  const load = useCallback(async (p: number, filters: ListFilters) => {
    setLoading(true)
    try {
      const res = await getDailyUsages({
        page: p,
        limit: PAGE_SIZE,
        filters: {
          userUid: filters.userUid || undefined,
          email: filters.email || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
      })
      setData(res.data)
      setTotal(res.total ?? 0)
    } catch (error) {
      message.error(getErrorMessage(error, '加载用量列表失败'))
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue({
      userUid: queryUserUid || undefined,
      email: undefined,
      usageDateRange: undefined,
    })

    const nextFilters = {
      ...emptyFilters,
      userUid: queryUserUid,
    }
    setApplied((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters))
    setPage(1)
  }, [form, queryUserUid])

  useEffect(() => {
    void load(page, applied)
  }, [applied, load, page])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const dateRangeFilters = toDateRangeFilters(values.usageDateRange)
    setApplied({
      userUid: (values.userUid ?? '').trim(),
      email: (values.email ?? '').trim(),
      ...dateRangeFilters,
    })
    setPage(1)
  }

  const handleReset = () => {
    form.resetFields()
    setSearchParams({})
    setApplied(emptyFilters)
    setPage(1)
  }

  const handleRefresh = () => {
    void load(page, applied)
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  const columns: ColumnsType<ApiDailyUsage> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户 UID',
      dataIndex: 'userUid',
      key: 'userUid',
      render: (value?: string | null) =>
        value ? (
          <Button
            type="link"
            style={{
              padding: 0,
              height: 'auto',
              textAlign: 'left',
              whiteSpace: 'normal',
            }}
            onClick={() => navigate(`/users/${value}`)}
          >
            <span style={wrapCellStyle}>{value}</span>
          </Button>
        ) : (
          renderWrapText(value)
        ),
    },
    {
      title: '邮箱',
      dataIndex: 'userEmail',
      key: 'userEmail',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '用量日期',
      dataIndex: 'usageDate',
      key: 'usageDate',
      width: 120,
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: 'PDF 导出',
      dataIndex: 'pdfExportUsedToday',
      key: 'pdfExportUsedToday',
      width: 110,
    },
    {
      title: 'Notion 导出',
      dataIndex: 'notionExportUsedToday',
      key: 'notionExportUsedToday',
      width: 120,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        用量管理
      </Title>
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 16, rowGap: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="userUid" label="用户 UID">
          <Input allowClear placeholder="精确搜索" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input allowClear placeholder="精确搜索" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="usageDateRange" label="用量日期">
          <DatePicker.RangePicker
            allowClear
            presets={createUsageDatePresets()}
            style={{ width: 280 }}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Table<ApiDailyUsage>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        tableLayout="fixed"
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showLessItems: true,
          showTotal: (t, range) =>
            `${range[0]}-${range[1]} 条，共 ${t} 条用量记录 · 共 ${totalPages} 页`,
        }}
        onChange={(pagination) => {
          if (pagination.current && pagination.current !== page) {
            setPage(pagination.current)
          }
        }}
      />
    </div>
  )
}

export default DailyUsageListPage
