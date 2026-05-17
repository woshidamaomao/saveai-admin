import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSubscriptions } from '../../api/subscriptions'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiSubscription } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography

const PAGE_SIZE = 10

const statusOptions: { label: string; value: string }[] = [
  { label: '全部状态', value: '' },
  { label: '试用中', value: 'trialing' },
  { label: '生效中', value: 'active' },
  { label: '已逾期', value: 'past_due' },
  { label: '已取消', value: 'canceled' },
  { label: '已暂停', value: 'paused' },
  { label: '未支付', value: 'unpaid' },
  { label: '未完成', value: 'incomplete' },
  { label: '已过期未完成', value: 'incomplete_expired' },
] as const

type ListFilters = {
  subId: string
  userUid: string
  email: string
  status: string
  priceId: string
  stripeSubscriptionId: string
}

const statusColorMap: Record<string, string> = {
  trialing: 'processing',
  active: 'success',
  past_due: 'warning',
  canceled: 'default',
  paused: 'purple',
  unpaid: 'error',
  incomplete: 'gold',
  incomplete_expired: 'default',
}

const subscriptionTypeTextMap: Record<string, string> = {
  monthly: '月订阅',
  yearly: '年订阅',
  one_time: '一次性付费',
}

const subscriptionTypeColorMap: Record<string, string> = {
  monthly: 'blue',
  yearly: 'gold',
  one_time: 'purple',
}

const wrapCellStyle = {
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}

const renderWrapText = (value?: string | null) => (
  <span style={wrapCellStyle}>{value || '—'}</span>
)

const renderBooleanTag = (value?: boolean) => {
  if (value == null) {
    return '—'
  }

  return value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>
}

const renderStatusTag = (status?: string) => {
  if (!status) {
    return '—'
  }

  return <Tag color={statusColorMap[status] ?? 'default'}>{status}</Tag>
}

const renderSubscriptionTypeTag = (subscriptionType?: string | null) => {
  if (!subscriptionType) {
    return '—'
  }

  return (
    <Tag color={subscriptionTypeColorMap[subscriptionType] ?? 'default'}>
      {subscriptionTypeTextMap[subscriptionType] ?? subscriptionType}
    </Tag>
  )
}

const SubscriptionListPage = () => {
  const [form] = Form.useForm<ListFilters>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiSubscription[]>([])
  const [total, setTotal] = useState(0)
  const [applied, setApplied] = useState<ListFilters>({
    subId: '',
    userUid: '',
    email: '',
    status: '',
    priceId: '',
    stripeSubscriptionId: '',
  })

  const load = useCallback(async (p: number, filters: ListFilters) => {
    setLoading(true)
    try {
      const res = await getSubscriptions({
        page: p,
        limit: PAGE_SIZE,
        filters: {
          subId: filters.subId || undefined,
          userUid: filters.userUid || undefined,
          email: filters.email || undefined,
          status: filters.status || undefined,
          priceId: filters.priceId || undefined,
          stripeSubscriptionId: filters.stripeSubscriptionId || undefined,
        },
      })
      setData(res.data)
      setTotal(res.total ?? 0)
    } catch (error) {
      message.error(getErrorMessage(error, '加载订阅列表失败'))
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page, applied)
  }, [applied, load, page])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    setApplied({
      subId: (values.subId ?? '').trim(),
      userUid: (values.userUid ?? '').trim(),
      email: (values.email ?? '').trim(),
      status: values.status ?? '',
      priceId: (values.priceId ?? '').trim(),
      stripeSubscriptionId: (values.stripeSubscriptionId ?? '').trim(),
    })
    setPage(1)
  }

  const handleReset = () => {
    form.resetFields()
    setApplied({
      subId: '',
      userUid: '',
      email: '',
      status: '',
      priceId: '',
      stripeSubscriptionId: '',
    })
    setPage(1)
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  const columns: ColumnsType<ApiSubscription> = [
    {
      title: '订阅号',
      dataIndex: 'subId',
      key: 'subId',
      render: (value: string, row) => (
        <Button
          type="link"
          style={{
            padding: 0,
            height: 'auto',
            textAlign: 'left',
            whiteSpace: 'normal',
          }}
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/subscriptions/${row.subId}`)
          }}
        >
          <span style={wrapCellStyle}>{value}</span>
        </Button>
      ),
    },
    {
      title: '用户 UID',
      dataIndex: 'userUid',
      key: 'userUid',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '邮箱',
      dataIndex: 'userEmail',
      key: 'userEmail',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: renderStatusTag,
    },
    {
      title: '订阅类型',
      dataIndex: 'subscriptionType',
      key: 'subscriptionType',
      width: 110,
      render: renderSubscriptionTypeTag,
    },
    {
      title: '试用中',
      dataIndex: 'isTrial',
      key: 'isTrial',
      width: 90,
      render: renderBooleanTag,
    },
    {
      title: '到期取消',
      dataIndex: 'cancelAtPeriodEnd',
      key: 'cancelAtPeriodEnd',
      width: 100,
      render: renderBooleanTag,
    },
    {
      title: '周期结束',
      dataIndex: 'currentPeriodEnd',
      key: 'currentPeriodEnd',
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            navigate(`/subscriptions/${row.subId}`)
          }}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        订阅列表
      </Title>
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 16, rowGap: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="subId" label="订阅号">
          <Input allowClear placeholder="精确搜索" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="userUid" label="用户 UID">
          <Input allowClear placeholder="精确搜索" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input allowClear placeholder="模糊搜索" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            options={statusOptions}
            placeholder="选择状态"
            style={{ width: 160 }}
          />
        </Form.Item>
        <Form.Item name="priceId" label="Price ID">
          <Input allowClear placeholder="精确搜索" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="stripeSubscriptionId" label="Stripe Sub ID">
          <Input allowClear placeholder="精确搜索" style={{ width: 240 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
      <Table<ApiSubscription>
        rowKey="subId"
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
            `${range[0]}-${range[1]} 条，共 ${t} 条订阅 · 共 ${totalPages} 页`,
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

export default SubscriptionListPage
