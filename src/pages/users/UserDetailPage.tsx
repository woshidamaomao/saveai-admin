import { ArrowLeftOutlined, BarChartOutlined, FileTextOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUser } from '../../api/users'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiSubscription, ApiUser, Role } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title, Text } = Typography

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
  const navigate = useNavigate()
  const { uid } = useParams<{ uid: string }>()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

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
      </Space>
      <Title level={4} style={{ marginTop: 0 }}>
        用户详情
      </Title>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="用户信息">
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
