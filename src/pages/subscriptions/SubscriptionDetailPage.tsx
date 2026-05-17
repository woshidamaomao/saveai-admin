import { ArrowLeftOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  InputNumber,
  Modal,
  Radio,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getSubscriptionRefundPreview,
  getSubscription,
  refundSubscription,
  updateSubscriptionTrialEnd,
} from '../../api/subscriptions'
import { TimeDisplay } from '../../components/TimeDisplay'
import type {
  ApiSubscription,
  ApiSubscriptionRefundFundingInvoice,
  ApiSubscriptionRefundPhase,
  ApiSubscriptionRefundPreview,
} from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography
const { Text } = Typography

type TrialEndMode = 'add_days' | 'specified_time'

type TrialEndFormValues = {
  mode: TrialEndMode
  days?: number
  trialEndAt?: Dayjs | null
}

type RefundAmountMap = Record<string, number>

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

const addDaysToDate = (value: string, days: number) => {
  const nextDate = dayjs(value).add(days, 'day')
  if (!nextDate.isValid()) {
    return null
  }

  return nextDate
}

const renderBooleanTag = (value?: boolean) => {
  if (value == null) {
    return '—'
  }

  return value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>
}

const renderTextValue = (value?: string | number | null) => {
  if (value == null || value === '') {
    return '—'
  }

  return value
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

const canRefundSubscription = (subscription: ApiSubscription) => (
  subscription.status === 'active' || subscription.status === 'trialing'
)

const canUpdateTrialEnd = (subscription: ApiSubscription) => (
  subscription.status !== 'canceled'
)

const getCurrencyFractionDigits = (currency?: string | null) => {
  if (!currency) {
    return 2
  }

  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits
  } catch {
    return 2
  }
}

const toMajorAmount = (amount: number, currency?: string | null) => {
  const fractionDigits = getCurrencyFractionDigits(currency) ?? 2
  const divisor = 10 ** fractionDigits
  return amount / divisor
}

const toMinorAmount = (amount: number, currency?: string | null) => {
  const fractionDigits = getCurrencyFractionDigits(currency) ?? 2
  const multiplier = 10 ** fractionDigits
  return Math.round(amount * multiplier)
}

const formatCurrencyAmount = (amount: number, currency?: string | null) => {
  const normalizedCurrency = currency?.toUpperCase() || 'USD'
  const majorAmount = toMajorAmount(amount, currency)

  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(majorAmount)
  } catch {
    return `${majorAmount.toFixed(2)} ${normalizedCurrency}`
  }
}

const renderFieldLabel = (title: string, keyName: string) => (
  <Space direction="vertical" size={0}>
    <Text>{title}</Text>
    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
      {keyName}
    </Text>
  </Space>
)

const getRefundInvoiceKey = (invoice: ApiSubscriptionRefundFundingInvoice) => (
  `${invoice.invoiceId}:${invoice.lineId}`
)

const getRefundFundingInvoices = (preview: ApiSubscriptionRefundPreview) => (
  preview.phases.flatMap((phase) => phase.fundingInvoices)
)

const renderRefundPhaseType = (type: string) => {
  if (type === 'upgrade_difference') {
    return <Tag color="purple">升级补差价</Tag>
  }

  return <Tag color="blue">常规账单</Tag>
}

const SubscriptionDetailPage = () => {
  const [trialForm] = Form.useForm<TrialEndFormValues>()
  const navigate = useNavigate()
  const { subId } = useParams<{ subId: string }>()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [trialEndModalOpen, setTrialEndModalOpen] = useState(false)
  const [updatingTrialEnd, setUpdatingTrialEnd] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundPreview, setRefundPreview] = useState<ApiSubscriptionRefundPreview | null>(null)
  const [refundPreviewLoading, setRefundPreviewLoading] = useState(false)
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [customRefundAmount, setCustomRefundAmount] = useState(false)
  const [refundAmounts, setRefundAmounts] = useState<RefundAmountMap>({})
  const watchedMode = Form.useWatch('mode', trialForm)
  const watchedDays = Form.useWatch('days', trialForm)
  const watchedTrialEndAt = Form.useWatch('trialEndAt', trialForm)

  const load = useCallback(async () => {
    if (!subId) {
      setLoading(false)
      setNotFound(true)
      return
    }

    setLoading(true)
    setNotFound(false)
    setLoadFailed(false)
    try {
      const data = await getSubscription(subId)
      setSubscription(data)
    } catch (error) {
      const text = getErrorMessage(error, '加载订阅详情失败')
      if (text.includes('订阅不存在')) {
        setNotFound(true)
        setSubscription(null)
      } else {
        setLoadFailed(true)
        setSubscription(null)
        message.error(text)
      }
    } finally {
      setLoading(false)
    }
  }, [subId])

  useEffect(() => {
    void load()
  }, [load])

  const openTrialEndModal = () => {
    if (!subscription || !canUpdateTrialEnd(subscription)) {
      return
    }

    trialForm.setFieldsValue({
      mode: 'add_days',
      days: undefined,
      trialEndAt: undefined,
    })
    setTrialEndModalOpen(true)
  }

  const getNextTrialEnd = () => {
    if (!subscription) {
      return null
    }

    const values = trialForm.getFieldsValue()
    if (values.mode === 'specified_time') {
      if (!values.trialEndAt || !values.trialEndAt.isValid()) {
        return null
      }

      return values.trialEndAt
    }

    if (typeof values.days !== 'number' || values.days <= 0) {
      return null
    }

    return addDaysToDate(subscription.currentPeriodEnd, values.days)
  }

  const handleUpdateTrialEnd = async () => {
    if (!subscription) {
      return
    }

    let values: TrialEndFormValues
    try {
      values = await trialForm.validateFields()
    } catch {
      return
    }

    const nextTrialEnd = getNextTrialEnd()

    if (!nextTrialEnd) {
      message.error('无法计算新的试用结束时间')
      return
    }

    Modal.confirm({
      title: '确认更新 trial_end？',
      content: (
        <Space direction="vertical" size={4}>
          <Text>这是高风险操作，会改变用户订阅的下一次续费时间。</Text>
          <Text>
            当前周期结束时间：<TimeDisplay value={subscription.currentPeriodEnd} />
          </Text>
          <Text>
            新的 trial_end：<TimeDisplay value={nextTrialEnd.valueOf()} />
          </Text>
          <Text type="secondary">
            更新方式：{values.mode === 'add_days' ? `增加 ${values.days} 天` : '指定时间'}
          </Text>
        </Space>
      ),
      okText: '确认更新',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        await submitTrialEnd(subscription.subId, nextTrialEnd.valueOf())
      },
    })
  }

  const submitTrialEnd = async (targetSubId: string, trialEndAt: number) => {
    setUpdatingTrialEnd(true)
    try {
      const updated = await updateSubscriptionTrialEnd(targetSubId, trialEndAt)
      setSubscription(updated)
      trialForm.resetFields()
      setTrialEndModalOpen(false)
      message.success('trial_end 已更新')
    } catch (error) {
      message.error(getErrorMessage(error, '更新 trial_end 失败'))
    } finally {
      setUpdatingTrialEnd(false)
    }
  }

  const openRefundModal = async () => {
    if (!subscription) {
      return
    }

    setRefundModalOpen(true)
    setRefundPreview(null)
    setCustomRefundAmount(false)
    setRefundAmounts({})
    setRefundPreviewLoading(true)

    try {
      const preview = await getSubscriptionRefundPreview(subscription.subId)
      setRefundPreview(preview)
      setRefundAmounts(
        Object.fromEntries(
          getRefundFundingInvoices(preview).map((invoice) => [
            getRefundInvoiceKey(invoice),
            invoice.calculatedRefundAmount,
          ]),
        ),
      )
    } catch (error) {
      message.error(getErrorMessage(error, '加载退款预览失败'))
    } finally {
      setRefundPreviewLoading(false)
    }
  }

  const closeRefundModal = () => {
    if (refundSubmitting) {
      return
    }

    setRefundModalOpen(false)
  }

  const getInvoiceRefundAmount = (invoice: ApiSubscriptionRefundFundingInvoice) => {
    if (!customRefundAmount) {
      return invoice.calculatedRefundAmount
    }

    return refundAmounts[getRefundInvoiceKey(invoice)] ?? invoice.calculatedRefundAmount
  }

  const getTotalRefundAmount = () => {
    if (!refundPreview) {
      return 0
    }

    return getRefundFundingInvoices(refundPreview).reduce(
      (total, invoice) => total + getInvoiceRefundAmount(invoice),
      0,
    )
  }

  const updateRefundAmount = (
    invoice: ApiSubscriptionRefundFundingInvoice,
    value: number | null,
  ) => {
    const nextAmount = value == null
      ? 0
      : toMinorAmount(value, invoice.currency)
    const boundedAmount = Math.min(
      Math.max(nextAmount, 0),
      invoice.maxRefundAmount,
    )

    setRefundAmounts((current) => ({
      ...current,
      [getRefundInvoiceKey(invoice)]: boundedAmount,
    }))
  }

  const toggleCustomRefundAmount = () => {
    if (!refundPreview) {
      return
    }

    if (customRefundAmount) {
      setCustomRefundAmount(false)
      return
    }

    setRefundAmounts(
      Object.fromEntries(
        getRefundFundingInvoices(refundPreview).map((invoice) => [
          getRefundInvoiceKey(invoice),
          invoice.calculatedRefundAmount,
        ]),
      ),
    )
    setCustomRefundAmount(true)
  }

  const hasInvalidRefundAmount = () => {
    if (!refundPreview) {
      return false
    }

    return getRefundFundingInvoices(refundPreview).some((invoice) => {
      const amount = getInvoiceRefundAmount(invoice)
      return amount < 0 || amount > invoice.maxRefundAmount
    })
  }

  const submitRefund = async () => {
    if (!subscription || !refundPreview) {
      return
    }

    if (hasInvalidRefundAmount()) {
      message.error('退款金额不能小于 0，且不能超过账单已支付金额')
      return
    }

    setRefundSubmitting(true)
    try {
      const result = await refundSubscription(
        subscription.subId,
        customRefundAmount
          ? {
              invoiceRefunds: getRefundFundingInvoices(refundPreview).map((invoice) => ({
                invoiceId: invoice.invoiceId,
                lineId: invoice.lineId,
                amount: getInvoiceRefundAmount(invoice),
              })),
            }
          : undefined,
      )
      setSubscription(result.subscription)
      setRefundModalOpen(false)
      message.success(
        `订阅已取消，退款金额 ${formatCurrencyAmount(result.refundAmount, result.currency)}`,
      )
    } catch (error) {
      message.error(getErrorMessage(error, '退款失败'))
    } finally {
      setRefundSubmitting(false)
    }
  }

  const previewTrialEnd = (() => {
    if (!subscription) {
      return null
    }

    if (watchedMode === 'specified_time') {
      if (!watchedTrialEndAt || !watchedTrialEndAt.isValid()) {
        return null
      }

      return watchedTrialEndAt
    }

    if (typeof watchedDays !== 'number' || watchedDays <= 0) {
      return null
    }

    return addDaysToDate(subscription.currentPeriodEnd, watchedDays)
  })()

  const getPhaseRefundAmount = (phase: ApiSubscriptionRefundPhase) => (
    phase.fundingInvoices.reduce(
      (total, invoice) => total + getInvoiceRefundAmount(invoice),
      0,
    )
  )

  const renderRefundFundingInvoiceDetail = (
    invoice: ApiSubscriptionRefundFundingInvoice,
  ) => {
    const amountContent = customRefundAmount ? (
      <InputNumber
        min={0}
        max={toMajorAmount(invoice.maxRefundAmount, invoice.currency)}
        precision={getCurrencyFractionDigits(invoice.currency)}
        value={toMajorAmount(getInvoiceRefundAmount(invoice), invoice.currency)}
        onChange={(value) => updateRefundAmount(invoice, value)}
        style={{ width: '100%', maxWidth: 180 }}
      />
    ) : (
      formatCurrencyAmount(invoice.calculatedRefundAmount, invoice.currency)
    )

    return (
      <div
        key={getRefundInvoiceKey(invoice)}
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: 12,
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
            <Text strong>{renderTextValue(invoice.invoiceNumber)}</Text>
            <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {invoice.invoiceId}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {invoice.lineId}
            </Text>
          </Space>
          {renderRefundPhaseType(invoice.fundingType)}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <Space direction="vertical" size={0}>
            <Text type="secondary">账单时间</Text>
            <TimeDisplay value={invoice.invoiceCreatedAt} allowWrap />
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">服务周期</Text>
            <TimeDisplay value={invoice.periodStart} allowWrap />
            <Text type="secondary">至</Text>
            <TimeDisplay value={invoice.periodEnd} allowWrap />
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">退款计算周期</Text>
            <TimeDisplay value={invoice.refundPeriodStart} allowWrap />
            <Text type="secondary">至</Text>
            <TimeDisplay value={invoice.refundPeriodEnd} allowWrap />
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">已付金额</Text>
            <Text>{formatCurrencyAmount(invoice.amountPaid, invoice.currency)}</Text>
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">退款天数</Text>
            <Text>{invoice.refundDays} 天</Text>
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">自动计算</Text>
            <Text>{formatCurrencyAmount(invoice.calculatedRefundAmount, invoice.currency)}</Text>
          </Space>
          <Space direction="vertical" size={0}>
            <Text type="secondary">本次退款</Text>
            {amountContent}
          </Space>
        </div>
      </div>
    )
  }

  const refundPhaseColumns: ColumnsType<ApiSubscriptionRefundPhase> = [
    {
      title: '退款阶段',
      dataIndex: 'phaseType',
      key: 'phaseType',
      width: 130,
      render: (value: string) => renderRefundPhaseType(value),
    },
    {
      title: '阶段周期',
      key: 'phasePeriod',
      width: 240,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <TimeDisplay value={row.periodStart} allowWrap />
          <Text type="secondary">至</Text>
          <TimeDisplay value={row.periodEnd} allowWrap />
        </Space>
      ),
    },
    {
      title: '账单数',
      dataIndex: 'fundingInvoiceCount',
      key: 'fundingInvoiceCount',
      width: 90,
      render: (value: number) => `${value} 张`,
    },
    {
      title: '退款天数',
      dataIndex: 'refundDays',
      key: 'refundDays',
      width: 100,
      render: (value: number) => `${value} 天`,
    },
    {
      title: '自动计算',
      dataIndex: 'calculatedRefundAmount',
      key: 'calculatedRefundAmount',
      width: 130,
      render: (value: number, row) => formatCurrencyAmount(value, row.currency),
    },
    {
      title: '本阶段退款',
      key: 'phaseRefundAmount',
      width: 140,
      render: (_, row) => formatCurrencyAmount(getPhaseRefundAmount(row), row.currency),
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <Result
        status="error"
        title="加载订阅详情失败"
        subTitle="请稍后重试，或返回订阅列表重新进入。"
        extra={
          <Space>
            <Button onClick={() => navigate('/subscriptions')}>返回列表</Button>
            <Button type="primary" onClick={() => void load()}>
              重试
            </Button>
          </Space>
        }
      />
    )
  }

  if (notFound || !subscription) {
    return (
      <Result
        status="404"
        title="未找到订阅"
        subTitle="该订阅不存在，或已经无法在当前后台中查看。"
        extra={
          <Button type="primary" onClick={() => navigate('/subscriptions')}>
            返回订阅列表
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/subscriptions')}>
          返回列表
        </Button>
      </Space>
      <Title level={4} style={{ marginTop: 0 }}>
        订阅详情
      </Title>
      <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 16 }}>
        <Card title="订阅操作">
          <Space>
            <Button
              type="primary"
              disabled={!canUpdateTrialEnd(subscription)}
              onClick={openTrialEndModal}
            >
              更新 trial_end
            </Button>
            {canRefundSubscription(subscription) ? (
              <Button danger onClick={() => void openRefundModal()}>
                退款并取消订阅
              </Button>
            ) : null}
            <Text type="secondary">
              非 canceled 状态可调整 trial_end；active / trialing 状态可发起退款并取消订阅。
            </Text>
          </Space>
        </Card>
      </Space>
      <Modal
        title="更新 trial_end"
        open={trialEndModalOpen}
        okText="下一步"
        cancelText="取消"
        confirmLoading={updatingTrialEnd}
        onCancel={() => setTrialEndModalOpen(false)}
        onOk={() => void handleUpdateTrialEnd()}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">
            当前周期结束时间：<TimeDisplay value={subscription.currentPeriodEnd} />
          </Text>
          <Form
            form={trialForm}
            layout="vertical"
            initialValues={{ mode: 'add_days' }}
          >
            <Form.Item name="mode" label="更新方式">
              <Radio.Group>
                <Radio.Button value="add_days">增加天数</Radio.Button>
                <Radio.Button value="specified_time">指定时间</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {watchedMode !== 'specified_time' ? (
              <Form.Item
                name="days"
                label="增加天数"
                rules={[{ required: true, message: '请输入增加天数' }]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  placeholder="请输入天数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="trialEndAt"
                label="指定新的试用结束时间"
                rules={[{ required: true, message: '请选择时间' }]}
              >
                <DatePicker
                  showTime
                  placeholder="选择日期时间"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}
          </Form>
          <Card size="small">
            <Space direction="vertical" size={4}>
              <Text>
                原订阅截止时间：<TimeDisplay value={subscription.currentPeriodEnd} />
              </Text>
              <Text strong>
                新订阅截止时间：{previewTrialEnd ? <TimeDisplay value={previewTrialEnd.valueOf()} /> : '待计算'}
              </Text>
            </Space>
          </Card>
        </Space>
      </Modal>
      <Modal
        title="退款并取消订阅"
        open={refundModalOpen}
        okText="确认退款并取消"
        cancelText="取消"
        width={1280}
        confirmLoading={refundSubmitting}
        okButtonProps={{
          danger: true,
          disabled: refundPreviewLoading || !refundPreview,
        }}
        onCancel={closeRefundModal}
        onOk={() => void submitRefund()}
      >
        <Spin spinning={refundPreviewLoading}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message="确认后会立即取消 Stripe 订阅"
              description="默认按剩余服务期自动计算退款金额；升级补差价会先识别被抵扣的旧账单，旧周期结束前补差价账单按全额可退处理。开启自定义后，单个账单退款金额不能超过该账单已支付金额。退款记录和取消原因会写入 Stripe。"
            />
            {refundPreview && refundPreview.phases.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="没有可退款账单"
                description="当前可能处于赠送期，或没有仍可退款的已付账单。确认后只取消订阅，不创建 Stripe refund。"
              />
            ) : null}
            {refundPreview ? (
              <>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space direction="vertical" size={0}>
                    <Text>
                      可退款阶段：{refundPreview.phaseCount} 个；可退款账单：{refundPreview.fundingInvoiceCount} 张
                    </Text>
                    <Text strong>
                      本次退款合计：{formatCurrencyAmount(getTotalRefundAmount(), refundPreview.currency)}
                    </Text>
                  </Space>
                  <Button onClick={toggleCustomRefundAmount}>
                    {customRefundAmount ? '使用自动计算金额' : '自定义退款金额'}
                  </Button>
                </Space>
                <Table<ApiSubscriptionRefundPhase>
                  rowKey="phaseKey"
                  columns={refundPhaseColumns}
                  dataSource={refundPreview.phases}
                  expandable={{
                    defaultExpandAllRows: true,
                    expandedRowRender: (phase) => (
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {phase.fundingInvoices.map(renderRefundFundingInvoiceDetail)}
                      </Space>
                    ),
                  }}
                  pagination={false}
                  size="small"
                />
              </>
            ) : null}
          </Space>
        </Spin>
      </Modal>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="订阅信息">
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label={renderFieldLabel('状态', 'status')}>
              {renderStatusTag(subscription.status)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('订阅类型', 'subscriptionType')}>
              {renderSubscriptionTypeTag(subscription.subscriptionType)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('数量', 'quantity')}>
              {renderTextValue(subscription.quantity)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('用户邮箱', 'userEmail')}>
              {renderTextValue(subscription.userEmail)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('用户注册时间', 'userCreatedAt')}>
              <TimeDisplay value={subscription.userCreatedAt} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('是否试用', 'isTrial')}>
              {renderBooleanTag(subscription.isTrial)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期末取消', 'cancelAtPeriodEnd')}>
              {renderBooleanTag(subscription.cancelAtPeriodEnd)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期开始', 'currentPeriodStart')}>
              <TimeDisplay value={subscription.currentPeriodStart} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期结束', 'currentPeriodEnd')}>
              <TimeDisplay value={subscription.currentPeriodEnd} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('试用开始', 'trialStart')}>
              <TimeDisplay value={subscription.trialStart} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('试用结束', 'trialEnd')}>
              <TimeDisplay value={subscription.trialEnd} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('取消时间', 'canceledAt')}>
              <TimeDisplay value={subscription.canceledAt} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('最近 Stripe Event.created', 'stripeLastEventCreated')}>
              <TimeDisplay value={subscription.stripeLastEventCreated} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('创建时间', 'createdAt')}>
              <TimeDisplay value={subscription.createdAt} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('更新时间', 'updatedAt')}>
              <TimeDisplay value={subscription.updatedAt} />
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="关联 ID">
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label={renderFieldLabel('数据库主键', 'id')}>
              {renderTextValue(subscription.id)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('订阅号', 'subId')}>
              {renderTextValue(subscription.subId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('用户 UID', 'userUid')}>
              {renderTextValue(subscription.userUid)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Price ID', 'priceId')}>
              {renderTextValue(subscription.priceId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Product ID', 'productId')}>
              {renderTextValue(subscription.productId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Coupon ID', 'couponId')}>
              {renderTextValue(subscription.couponId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Stripe Customer ID', 'stripeCustomerId')}>
              {renderTextValue(subscription.stripeCustomerId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Stripe Subscription ID', 'stripeSubscriptionId')}>
              {renderTextValue(subscription.stripeSubscriptionId)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Stripe Subscription Item ID', 'stripeSubscriptionItemId')}>
              {renderTextValue(subscription.stripeSubscriptionItemId)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  )
}

export default SubscriptionDetailPage
