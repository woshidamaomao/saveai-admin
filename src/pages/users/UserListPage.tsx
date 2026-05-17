import { BarChartOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  List,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteUser, getUsers } from '../../api/users'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiUser } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography
const { Text } = Typography
const { useBreakpoint } = Grid

const PAGE_SIZE = 10

type ListFilters = { email: string; uid: string }

const wrapCellStyle = {
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}

const renderWrapText = (value?: string | null) => (
  <span style={wrapCellStyle}>{value || '—'}</span>
)

const UserListPage = () => {
  const [form] = Form.useForm<{ email: string; uid: string }>()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiUser[]>([])
  const [total, setTotal] = useState(0)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)
  const [applied, setApplied] = useState<ListFilters>({ email: '', uid: '' })

  const load = useCallback(
    async (p: number, filters: ListFilters) => {
      setLoading(true)
      try {
        const res = await getUsers({
          page: p,
          limit: PAGE_SIZE,
          filters: {
            email: filters.email || undefined,
            uid: filters.uid || undefined,
          },
        })
        setData(res.data)
        setTotal(res.total ?? 0)
      } catch (e) {
        message.error(getErrorMessage(e, '加载用户列表失败'))
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(page, applied)
  }, [load, page, applied])

  const handleSearch = () => {
    const v = form.getFieldsValue()
    setApplied({
      email: (v.email ?? '').trim(),
      uid: (v.uid ?? '').trim(),
    })
    setPage(1)
  }

  const handleReset = () => {
    form.resetFields()
    setApplied({ email: '', uid: '' })
    setPage(1)
  }

  const handleDelete = async (uid: string) => {
    setDeletingUid(uid)
    try {
      await deleteUser(uid)
      message.success('已删除')
      await load(page, applied)
    } catch (e) {
      message.error(getErrorMessage(e, '删除失败'))
    } finally {
      setDeletingUid(null)
    }
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  const columns: ColumnsType<ApiUser> = [
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      render: (value: string | null | undefined, row) =>
        value ? (
          <Button
            type="link"
            style={{
              padding: 0,
              height: 'auto',
              textAlign: 'left',
              whiteSpace: 'normal',
            }}
            onClick={() => navigate(`/users/${row.uid}`)}
          >
            <span style={wrapCellStyle}>{value}</span>
          </Button>
        ) : (
          renderWrapText(value)
        ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '姓名',
      key: 'name',
      render: (_, row) =>
        [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
    },
    {
      title: '角色',
      key: 'role',
      render: (_, row) => row.role?.name ?? (row.role?.id != null ? String(row.role.id) : '—'),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value?: string) => <TimeDisplay value={value} allowWrap />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/users/${row.uid}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<BarChartOutlined />}
            href={`/users/usages?userUid=${encodeURIComponent(row.uid)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            用量
          </Button>
          <Popconfirm
            title="确定删除该用户？"
            description="删除后无法从此列表恢复，请确认。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.uid)}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deletingUid === row.uid}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        用户列表
      </Title>
      <Form
        form={form}
        layout={isMobile ? 'vertical' : 'inline'}
        style={{ marginBottom: 16, rowGap: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="email" label="邮箱">
          <Input allowClear placeholder="模糊搜索" style={{ width: isMobile ? '100%' : 220 }} />
        </Form.Item>
        <Form.Item name="uid" label="用户 UID">
          <Input allowClear placeholder="模糊搜索" style={{ width: isMobile ? '100%' : 200 }} />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
      {isMobile ? (
        <List<ApiUser>
          loading={loading}
          dataSource={data}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            size: 'small',
            onChange: (nextPage) => setPage(nextPage),
          }}
          renderItem={(item) => (
            <List.Item style={{ paddingInline: 0 }}>
              <Card
                size="small"
                hoverable
                style={{ width: '100%' }}
                onClick={() => navigate(`/users/${item.uid}`)}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">邮箱</Text>
                    <div>{renderWrapText(item.email)}</div>
                  </div>
                  <div>
                    <Text type="secondary">姓名</Text>
                    <div>{[item.firstName, item.lastName].filter(Boolean).join(' ') || '—'}</div>
                  </div>
                  <div>
                    <Text type="secondary">角色</Text>
                    <div>{item.role?.name ?? (item.role?.id != null ? String(item.role.id) : '—')}</div>
                  </div>
                  <div>
                    <Text type="secondary">注册时间</Text>
                    <div>
                      <TimeDisplay value={item.createdAt} allowWrap />
                    </div>
                  </div>
                  <Space wrap>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      style={{ padding: 0 }}
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/users/${item.uid}`)
                      }}
                    >
                      详情
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<BarChartOutlined />}
                      style={{ padding: 0 }}
                      href={`/users/usages?userUid=${encodeURIComponent(item.uid)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      用量
                    </Button>
                    <Popconfirm
                      title="确定删除该用户？"
                      description="删除后无法从此列表恢复，请确认。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(item.uid)}
                    >
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deletingUid === item.uid}
                        style={{ padding: 0 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ) : (
      <Table<ApiUser>
        rowKey="uid"
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
            `${range[0]}-${range[1]} 条，共 ${t} 条用户 · 共 ${totalPages} 页`,
        }}
        onChange={(pag) => {
          if (pag.current && pag.current !== page) {
            setPage(pag.current)
          }
        }}
      />
      )}
    </div>
  )
}

export default UserListPage
