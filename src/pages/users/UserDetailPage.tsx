import {
  ArrowLeftOutlined,
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  GiftOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createTrialSubscription,
  getSubscriptionTrialPriceOptions,
} from '../../api/subscriptions'
import {
  getUser,
  getUserPowerPdfRateLimit,
  resetUserPowerPdfRateLimit,
  updateUserEmail,
} from '../../api/users'
import { TimeDisplay } from '../../components/TimeDisplay'
import type {
  ApiPowerPdfRateLimitStatus,
  ApiPowerPdfRateLimitWindow,
  ApiPrice,
  ApiSubscription,
  ApiUser,
  Role,
} from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title, Text } = Typography

type TrialSubscriptionFormValues = {
  priceId?: string
  trialDays?: number
}

type UpdateEmailFormValues = {
  email?: string
}

const subscriptionStatusColorMap: Record<string, string> = {
  trialing: 'processing',
  active: 'success',
  past_due: 'warning',
  canceled: 'default',
  paused: 'purple',
  unpaid: 'error',
  incomplete: 'gold',
  incomplete_expired: 'default',
}

const renderFieldLabel = (title: string, keyName: string) => (
  <Space direction="vertical" size={0}>
    <Text>{title}</Text>
    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
      {keyName}
    </Text>
  </Space>
)

const renderTextValue = (value?: string | number | null) => {
  if (value == null || value === '') {
    return '—'
  }

  return value
}

const renderBooleanTag = (value?: boolean) => {
  if (value == null) {
    return '—'
  }

  return value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>
}

const renderRoleTag = (role?: Role | null) => {
  const value = role?.name ?? (role?.id != null ? String(role.id) : '')
  if (!value) {
    return '—'
  }

  const normalized = String(value).toLowerCase()
  return <Tag color={normalized === 'admin' || value === '1' ? 'red' : 'blue'}>{value}</Tag>
}

const renderAccountStatusTag = (status?: number) => {
  if (status == null) {
    return '—'
  }

  if (status === 1) {
    return <Tag color="success">active</Tag>
  }
  if (status === 2) {
    return <Tag>inactive</Tag>
  }

  return <Tag>{status}</Tag>
}

const renderSubscriptionStatusTag = (status?: string) => {
  if (!status) {
    return '—'
  }

  return <Tag color={subscriptionStatusColorMap[status] ?? 'default'}>{status}</Tag>
}

const canCreateTrialSubscription = (user: ApiUser) => {
  const status = user.subscriptionStatus || user.subscription?.status || ''
  return status !== 'active' && status !== 'trialing'
}

const getBillingIntervalText = (
  value: number | null,
  billingMode?: number,
  count?: number | null,
) => {
  if (billingMode === 2) {
    return '一次性付款'
  }
  if (count && count > 1) {
    return value === 1 ? `每 ${count} 个月` : `每 ${count} 年`
  }
  if (value === 1) {
    return '月付'
  }
  if (value === 2) {
    return '年付'
  }

  return value == null ? '未知周期' : `周期 ${value}`
}

const formatPriceAmount = (price: ApiPrice) => {
  const currency = price.currency?.toUpperCase() || 'USD'
  const amount = Number(price.showPrice || price.unitAmount / 100)

  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const getPriceOptionLabel = (price: ApiPrice) => {
  const productName = price.product?.name || price.productId
  return `${productName} / ${getBillingIntervalText(price.billingInterval, price.billingMode, price.billingIntervalCount)} / ${formatPriceAmount(price)} / ${price.priceId}`
}

const formatUsage = (used?: number, limit?: number) => {
  if (used == null && limit == null) {
    return '—'
  }

  const usedText = String(used ?? 0)
  if (limit == null) {
    return usedText
  }

  const limitText = limit === 0 ? '无限制' : String(limit)
  return `${usedText} / ${limitText}`
}

const formatDuration = (seconds?: number | null) => {
  if (seconds == null) {
    return '—'
  }
  if (seconds <= 0) {
    return '已过期'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [
    hours > 0 ? `${hours}小时` : '',
    minutes > 0 ? `${minutes}分` : '',
    hours === 0 && remainingSeconds > 0 ? `${remainingSeconds}秒` : '',
  ].filter(Boolean).join(' ')
}

const rateLimitWindowLabel: Record<ApiPowerPdfRateLimitWindow['name'], string> = {
  short: '短周期',
  medium: '小时周期',
  long: '24 小时周期',
}

const renderSubscriptionLink = (
  subscription: ApiSubscription | null | undefined,
  navigate: ReturnType<typeof useNavigate>,
) => {
  if (!subscription?.subId) {
    return '—'
  }

  return (
    <Button
      type="link"
      size="small"
      icon={<FileTextOutlined />}
      style={{ padding: 0 }}
      onClick={() => navigate(`/subscriptions/${subscription.subId}`)}
    >
      查看订阅详情
    </Button>
  )
}

const UserDetailPage = () => {
  const [trialForm] = Form.useForm<TrialSubscriptionFormValues>()
  const [emailForm] = Form.useForm<UpdateEmailFormValues>()
  const navigate = useNavigate()
  const { uid } = useParams<{ uid: string }>()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [trialPriceOptions, setTrialPriceOptions] = useState<ApiPrice[]>([])
  const [trialPriceLoading, setTrialPriceLoading] = useState(false)
  const [trialSubmitting, setTrialSubmitting] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [rateLimitStatus, setRateLimitStatus] = useState<ApiPowerPdfRateLimitStatus | null>(null)
  const [rateLimitLoading, setRateLimitLoading] = useState(false)
  const [rateLimitResetting, setRateLimitResetting] = useState(false)

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false)
      setNotFound(true)
      return
    }

    setLoading(true)
    setNotFound(false)
    setLoadFailed(false)
    try {
      const data = await getUser(uid)
      if (!data) {
        setUser(null)
        setNotFound(true)
        return
      }

      setUser(data)
    } catch (error) {
      setUser(null)
      setLoadFailed(true)
      message.error(getErrorMessage(error, '加载用户详情失败'))
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void load()
  }, [load])

  const loadRateLimit = useCallback(async () => {
    if (!uid) {
      return
    }

    setRateLimitLoading(true)
    try {
      setRateLimitStatus(await getUserPowerPdfRateLimit(uid))
    } catch (error) {
      setRateLimitStatus(null)
      message.error(getErrorMessage(error, '加载 PDF 限流数据失败'))
    } finally {
      setRateLimitLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (user?.uid) {
      void loadRateLimit()
    }
  }, [loadRateLimit, user?.uid])

  const resetRateLimit = async () => {
    if (!uid) {
      return
    }

    setRateLimitResetting(true)
    try {
      const result = await resetUserPowerPdfRateLimit(uid)
      message.success(`PDF 限流已重置，共删除 ${result.deletedKeys} 个 Redis 键`)
      await loadRateLimit()
    } catch (error) {
      message.error(getErrorMessage(error, '重置 PDF 限流失败'))
    } finally {
      setRateLimitResetting(false)
    }
  }

  const loadTrialPriceOptions = async () => {
    setTrialPriceLoading(true)
    try {
      const data = await getSubscriptionTrialPriceOptions()
      setTrialPriceOptions(data)
    } catch (error) {
      message.error(getErrorMessage(error, '加载订阅套餐失败'))
    } finally {
      setTrialPriceLoading(false)
    }
  }

  const openTrialModal = () => {
    if (!user || !canCreateTrialSubscription(user)) {
      return
    }

    trialForm.setFieldsValue({
      priceId: undefined,
      trialDays: undefined,
    })
    setTrialModalOpen(true)

    if (trialPriceOptions.length === 0) {
      void loadTrialPriceOptions()
    }
  }

  const submitTrialSubscription = async () => {
    if (!user) {
      return
    }

    let values: TrialSubscriptionFormValues
    try {
      values = await trialForm.validateFields()
    } catch {
      return
    }

    if (!values.priceId || typeof values.trialDays !== 'number') {
      return
    }

    setTrialSubmitting(true)
    try {
      await createTrialSubscription({
        uid: user.uid,
        priceId: values.priceId,
        trialDays: values.trialDays,
      })
      setTrialModalOpen(false)
      trialForm.resetFields()
      message.success('试用订阅已创建')
      await load()
    } catch (error) {
      message.error(getErrorMessage(error, '创建试用订阅失败'))
    } finally {
      setTrialSubmitting(false)
    }
  }

  const openEmailModal = () => {
    if (!user) {
      return
    }

    emailForm.setFieldsValue({
      email: user.email ?? '',
    })
    setEmailModalOpen(true)
  }

  const submitEmailUpdate = async () => {
    if (!user) {
      return
    }

    let values: UpdateEmailFormValues
    try {
      values = await emailForm.validateFields()
    } catch {
      return
    }

    const nextEmail = values.email?.trim().toLowerCase()
    if (!nextEmail) {
      return
    }

    if (nextEmail === user.email) {
      setEmailModalOpen(false)
      emailForm.resetFields()
      return
    }

    setEmailSubmitting(true)
    try {
      const updatedUser = await updateUserEmail(user.uid, nextEmail)
      setUser(updatedUser)
      setEmailModalOpen(false)
      emailForm.resetFields()
      message.success('邮箱已更新，Stripe Customer 邮箱已同步')
    } catch (error) {
      message.error(getErrorMessage(error, '更新邮箱失败'))
    } finally {
      setEmailSubmitting(false)
    }
  }

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
        title="加载用户详情失败"
        subTitle="请稍后重试，或返回用户列表重新进入。"
        extra={
          <Space>
            <Button onClick={() => navigate('/users/list')}>返回列表</Button>
            <Button type="primary" onClick={() => void load()}>
              重试
            </Button>
          </Space>
        }
      />
    )
  }

  if (notFound || !user) {
    return (
      <Result
        status="404"
        title="未找到用户"
        subTitle="该用户不存在，或已经无法在当前后台中查看。"
        extra={
          <Button type="primary" onClick={() => navigate('/users/list')}>
            返回用户列表
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users/list')}>
          返回列表
        </Button>
        <Button
          icon={<BarChartOutlined />}
          href={`/users/usages?userUid=${encodeURIComponent(user.uid)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          查看用量
        </Button>
        {canCreateTrialSubscription(user) ? (
          <Button icon={<GiftOutlined />} onClick={openTrialModal}>
            创建试用订阅
          </Button>
        ) : null}
      </Space>
      <Title level={4} style={{ marginTop: 0 }}>
        用户详情
      </Title>
      <Modal
        title="创建试用订阅"
        open={trialModalOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={trialSubmitting}
        okButtonProps={{
          disabled: trialPriceLoading || trialPriceOptions.length === 0,
        }}
        onCancel={() => setTrialModalOpen(false)}
        onOk={() => void submitTrialSubscription()}
      >
        <Form form={trialForm} layout="vertical">
          <Form.Item
            name="priceId"
            label="订阅套餐"
            rules={[{ required: true, message: '请选择订阅套餐' }]}
          >
            <Select
              showSearch
              loading={trialPriceLoading}
              placeholder="请选择订阅套餐"
              optionFilterProp="label"
              options={trialPriceOptions.map((price) => ({
                value: price.priceId,
                label: getPriceOptionLabel(price),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="trialDays"
            label="试用天数"
            rules={[{ required: true, message: '请输入试用天数' }]}
          >
            <InputNumber
              min={1}
              max={730}
              precision={0}
              placeholder="请输入试用天数"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="更换邮箱"
        open={emailModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={emailSubmitting}
        onCancel={() => setEmailModalOpen(false)}
        onOk={() => void submitEmailUpdate()}
      >
        <Form form={emailForm} layout="vertical">
          <Form.Item
            name="email"
            label="新邮箱"
            rules={[
              { required: true, message: '请输入新邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
            normalize={(value) => (typeof value === 'string' ? value.trim().toLowerCase() : value)}
          >
            <Input placeholder="name@example.com" autoComplete="off" />
          </Form.Item>
          <Text type="secondary">
            保存后会同步更新本地用户邮箱和 Stripe Customer 邮箱。
          </Text>
        </Form>
      </Modal>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card
          title="用户信息"
          extra={
            <Button icon={<EditOutlined />} onClick={openEmailModal}>
              更换邮箱
            </Button>
          }
        >
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label={renderFieldLabel('UID', 'uid')}>
              {renderTextValue(user.uid)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('邮箱', 'email')}>
              {renderTextValue(user.email)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('姓名', 'firstName + lastName')}>
              {renderTextValue([user.firstName, user.lastName].filter(Boolean).join(' '))}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('登录方式', 'provider')}>
              {renderTextValue(user.provider)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('角色', 'role')}>
              {renderRoleTag(user.role)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('状态', 'status')}>
              {renderAccountStatusTag(user.status)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('头像', 'avatar')}>
              {renderTextValue(user.avatar)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('创建时间', 'createdAt')}>
              <TimeDisplay value={user.createdAt} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('更新时间', 'updatedAt')}>
              <TimeDisplay value={user.updatedAt} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('删除时间', 'deletedAt')}>
              <TimeDisplay value={user.deletedAt} />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="当前套餐与订阅">
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label={renderFieldLabel('套餐名称', 'planName')}>
              {renderTextValue(user.planName)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('套餐标识', 'planSlug')}>
              {renderTextValue(user.planSlug)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('订阅状态', 'subscriptionStatus')}>
              {renderSubscriptionStatusTag(user.subscriptionStatus)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('订阅详情', 'subscription')}>
              {renderSubscriptionLink(user.subscription, navigate)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期开始', 'subscriptionPeriodStart')}>
              <TimeDisplay value={user.subscriptionPeriodStart} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期结束', 'subscriptionPeriodEnd')}>
              <TimeDisplay value={user.subscriptionPeriodEnd} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('试用开始', 'subscriptionTrialStart')}>
              <TimeDisplay value={user.subscriptionTrialStart} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('试用结束', 'subscriptionTrialEnd')}>
              <TimeDisplay value={user.subscriptionTrialEnd} />
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('是否试用', 'subscriptionIsTrial')}>
              {renderBooleanTag(user.subscriptionIsTrial)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('数量', 'subscriptionQuantity')}>
              {renderTextValue(user.subscriptionQuantity)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('周期末取消', 'subscriptionCancelAtPeriodEnd')}>
              {renderBooleanTag(user.subscriptionCancelAtPeriodEnd)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('取消时间', 'subscriptionCanceledAt')}>
              <TimeDisplay value={user.subscriptionCanceledAt} />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="今日用量（UTC）">
          <Descriptions bordered column={3} size="middle">
            <Descriptions.Item label={renderFieldLabel('PDF 导出', 'pdfExportUsed / pdfExportLimit')}>
              {formatUsage(user.pdfExportUsed, user.pdfExportLimit)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Notion 导出', 'notionExportUsed / notionExportLimit')}>
              {formatUsage(user.notionExportUsed, user.notionExportLimit)}
            </Descriptions.Item>
            <Descriptions.Item label={renderFieldLabel('Word 导出', 'wordExportUsed / wordExportLimit')}>
              {formatUsage(user.wordExportUsed, user.wordExportLimit)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="PDF 接口限流（Redis）"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={rateLimitLoading}
                onClick={() => void loadRateLimit()}
              >
                重新查询
              </Button>
              <Popconfirm
                title="确认重置该用户的 PDF 限流？"
                description="将删除 power/pdf 的计数键和封禁键，用户可立即重新请求。"
                okText="确认重置"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: rateLimitResetting }}
                onConfirm={() => resetRateLimit()}
              >
                <Button danger icon={<DeleteOutlined />} loading={rateLimitResetting}>
                  重置 PDF 限流
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="这里展示的是 Redis 活跃限流窗口，不是数据库中的自然日用量。重置不会修改用户订阅或今日用量记录。"
          />
          <Table<ApiPowerPdfRateLimitWindow>
            rowKey="name"
            size="small"
            loading={rateLimitLoading}
            pagination={false}
            dataSource={rateLimitStatus?.windows ?? []}
            locale={{ emptyText: '当前没有查询到限流记录' }}
            columns={[
              {
                title: '窗口',
                dataIndex: 'name',
                render: (name: ApiPowerPdfRateLimitWindow['name'], record) => (
                  <Space direction="vertical" size={0}>
                    <Text>{rateLimitWindowLabel[name]}</Text>
                    <Text type="secondary">{formatDuration(record.windowSeconds)}</Text>
                  </Space>
                ),
              },
              {
                title: '请求次数 / 上限',
                render: (_, record) => `${record.count} / ${record.limit}`,
              },
              {
                title: '剩余次数',
                dataIndex: 'remaining',
              },
              {
                title: '计数重置倒计时',
                dataIndex: 'resetInSeconds',
                render: (value: number | null) => formatDuration(value),
              },
              {
                title: '封禁状态',
                render: (_, record) => record.blocked
                  ? <Tag color="error">封禁中（{formatDuration(record.blockExpiresInSeconds)}）</Tag>
                  : <Tag color="success">正常</Tag>,
              },
            ]}
            expandable={{
              rowExpandable: (record) => record.counterKeys.length + record.blockKeys.length > 0,
              expandedRowRender: (record) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {[...record.counterKeys, ...record.blockKeys].map((key) => (
                    <Text code copyable key={key}>{key}</Text>
                  ))}
                </Space>
              ),
            }}
          />
        </Card>

        {user.subscription ? (
          <Card title="当前订阅快照">
            <Descriptions bordered column={2} size="middle">
              <Descriptions.Item label={renderFieldLabel('订阅号', 'subId')}>
                {renderTextValue(user.subscription.subId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('数据库主键', 'id')}>
                {renderTextValue(user.subscription.id)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Price ID', 'priceId')}>
                {renderTextValue(user.subscription.priceId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Product ID', 'productId')}>
                {renderTextValue(user.subscription.productId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Stripe Customer ID', 'stripeCustomerId')}>
                {renderTextValue(user.subscription.stripeCustomerId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Stripe Subscription ID', 'stripeSubscriptionId')}>
                {renderTextValue(user.subscription.stripeSubscriptionId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Stripe Subscription Item ID', 'stripeSubscriptionItemId')}>
                {renderTextValue(user.subscription.stripeSubscriptionItemId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('Coupon ID', 'couponId')}>
                {renderTextValue(user.subscription.couponId)}
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('最近 Stripe Event.created', 'stripeLastEventCreated')}>
                <TimeDisplay value={user.subscription.stripeLastEventCreated} />
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('订阅创建时间', 'subscription.createdAt')}>
                <TimeDisplay value={user.subscription.createdAt} />
              </Descriptions.Item>
              <Descriptions.Item label={renderFieldLabel('订阅更新时间', 'subscription.updatedAt')}>
                <TimeDisplay value={user.subscription.updatedAt} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}
      </Space>
    </div>
  )
}

export default UserDetailPage
