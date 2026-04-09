import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Space, Spin, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { postSendEmailLoginCode } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/error-message'

const { Title, Text } = Typography

const CODE_LENGTH = 6
const SEND_COOLDOWN_SEC = 60

const LoginPage = () => {
  const navigate = useNavigate()
  const { isReady, isAuthenticated, isAdmin, loginWithEmailCode } = useAuth()
  const [form] = Form.useForm<{ email: string; code: string }>()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }
    const t = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldown])

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSendCode = async () => {
    const email = form.getFieldValue('email') as string | undefined
    if (!email?.trim()) {
      form.setFields([{ name: 'email', errors: ['请输入邮箱'] }])
      return
    }
    setSending(true)
    try {
      await postSendEmailLoginCode(email.trim().toLowerCase())
      message.success('验证码已发送，请查收邮箱')
      setCooldown(SEND_COOLDOWN_SEC)
    } catch (e) {
      message.error(getErrorMessage(e, '发送失败'))
    } finally {
      setSending(false)
    }
  }

  const onFinish = async (values: { email: string; code: string }) => {
    setLoading(true)
    try {
      await loginWithEmailCode(values.email, values.code)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      if ((e as Error).message !== 'forbidden') {
        message.error(getErrorMessage(e, '登录失败'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f5ff 0%, #fff 50%, #f6ffed 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, maxWidth: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              SaveAI 管理后台
            </Title>
            <Text type="secondary">使用邮箱验证码登录（仅管理员）</Text>
          </div>
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="name@example.com" autoComplete="email" />
            </Form.Item>
            <Form.Item label="验证码">
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  name="code"
                  noStyle
                  rules={[
                    { required: true, message: '请输入验证码' },
                    { len: CODE_LENGTH, message: `验证码为 ${CODE_LENGTH} 位` },
                  ]}
                >
                  <Input
                    prefix={<LockOutlined />}
                    placeholder={`${CODE_LENGTH} 位数字`}
                    maxLength={CODE_LENGTH}
                    style={{ flex: 1 }}
                  />
                </Form.Item>
                <Button onClick={handleSendCode} loading={sending} disabled={cooldown > 0}>
                  {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
                </Button>
              </Space.Compact>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
