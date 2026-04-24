import {
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, theme } from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const defaultOpenKeys = ['subscription-mgmt', 'user-mgmt']

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selectedKeys = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/toolbox')) {
      return ['/toolbox']
    }
    if (path.startsWith('/settings')) {
      return ['/settings']
    }
    if (path.startsWith('/users')) {
      return ['/users/list']
    }
    if (path.startsWith('/subscriptions')) {
      return ['/subscriptions']
    }
    return ['/dashboard']
  }, [location.pathname])

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            fontSize: collapsed ? 14 : 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? 'SA' : 'SaveAI 管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          items={[
            {
              key: '/dashboard',
              icon: <DashboardOutlined />,
              label: '工作台',
            },
            {
              key: '/toolbox',
              icon: <ToolOutlined />,
              label: '工具箱',
            },
            {
              key: 'subscription-mgmt',
              icon: <FileTextOutlined />,
              label: '订阅管理',
              children: [
                {
                  key: '/subscriptions',
                  icon: <UnorderedListOutlined />,
                  label: '订阅列表',
                },
              ],
            },
            {
              key: 'user-mgmt',
              icon: <TeamOutlined />,
              label: '用户管理',
              children: [
                {
                  key: '/users/list',
                  icon: <UnorderedListOutlined />,
                  label: '用户列表',
                },
              ],
            },
            {
              key: '/settings',
              icon: <SettingOutlined />,
              label: '设置',
            },
          ]}
          onClick={({ key }) => {
            if (key === 'user-mgmt' || key === 'subscription-mgmt') {
              return
            }
            navigate(String(key))
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            style={{
              fontSize: 18,
              width: 64,
              height: 64,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <span style={{ flex: 1, textAlign: 'right', marginRight: 12, color: '#666' }}>
            {user?.email ?? user?.uid ?? ''}
          </span>
          <Button type="text" icon={<LogoutOutlined />} onClick={() => void logout()}>
            退出
          </Button>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
