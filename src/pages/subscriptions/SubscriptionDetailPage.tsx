import { ArrowLeftOutlined } from '@ant-design/icons'
import {
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
  Tag,
  Typography,
  message,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getSubscription,
  updateSubscriptionTrialEnd,
} from '../../api/subscriptions'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiSubscription } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography
const { Text } = Typography

type TrialEndMode = 'add_days' | 'specified_time'

type TrialEndFormValues = {
  mode: TrialEndMode
  days?: number
  trialEndAt?: Dayjs | null
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

const renderFieldLabel = (title: string, keyName: string) => (
  <Space direction="vertical" size={0}>
    <Text>{title}</Text>
    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
      {keyName}
    </Text>
  </Space>
)

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
            <Button type="primary" onClick={openTrialEndModal}>
              更新 trial_end
            </Button>
            <Text type="secondary">
              可指定时间，或基于当前周期结束时间增加天数。
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
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="订阅信息">
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label={renderFieldLabel('状态', 'status')}>
              {renderStatusTag(subscription.status)}
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
