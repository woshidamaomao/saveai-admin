import {
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Grid, Layout, Menu, theme } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid
const productMenuKey = 'product-mgmt'
const defaultOpenKeys = ['subscription-mgmt', productMenuKey, 'user-mgmt']

const menuItems: MenuProps['items'] = [
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
    key: productMenuKey,
    icon: <ShoppingOutlined />,
    label: '商品管理',
    children: [
      {
        key: '/products',
        icon: <UnorderedListOutlined />,
        label: '商品列表',
      },
      {
        key: '/products/prices',
        icon: <UnorderedListOutlined />,
        label: '价格列表',
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
      {
        key: '/users/usages',
        icon: <BarChartOutlined />,
        label: '用量管理',
      },
    ],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '设置',
  },
]

const isGroupMenuKey = (key: string) => (
  key === 'user-mgmt' || key === 'subscription-mgmt' || key === productMenuKey
)

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const screens = useBreakpoint()
  const isMobile = !screens.md
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
    if (path.startsWith('/products/prices')) {
      return ['/products/prices']
    }
    if (path.startsWith('/products')) {
      return ['/products']
    }
    if (path.startsWith('/users')) {
      if (path.startsWith('/users/usages')) {
        return ['/users/usages']
      }
      return ['/users/list']
    }
    if (path.startsWith('/subscriptions')) {
      return ['/subscriptions']
    }
    return ['/dashboard']
  }, [location.pathname])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (isGroupMenuKey(String(key))) {
      return
    }

    navigate(String(key))
  }

  return (
    <Layout style={{ minHeight: '100%' }}>
      {!isMobile ? (
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
            Hello, admin!
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={collapsed ? [] : openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
      ) : null}
      <Layout>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {isMobile ? (
            <Dropdown
              menu={{
                items: menuItems,
                selectedKeys,
                onClick: handleMenuClick,
              }}
              trigger={['click']}
            >
              <Button type="text" icon={<MenuOutlined />}>
                菜单
              </Button>
            </Dropdown>
          ) : (
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
          )}
          <span
            style={{
              flex: 1,
              textAlign: 'right',
              marginRight: 12,
              color: '#666',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email ?? user?.uid ?? ''}
          </span>
          <Button type="text" icon={<LogoutOutlined />} onClick={() => void logout()}>
            退出
          </Button>
        </Header>
        <Content
          style={{
            margin: isMobile ? 12 : 24,
            padding: isMobile ? 12 : 24,
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
