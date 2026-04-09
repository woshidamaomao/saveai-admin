import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popconfirm, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { deleteUser, getUsers } from '../../api/users'
import type { ApiUser } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title } = Typography

const PAGE_SIZE = 10

type ListFilters = { email: string; uid: string }

const UserListPage = () => {
  const [form] = Form.useForm<{ email: string; uid: string }>()
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
    { title: 'UID', dataIndex: 'uid', key: 'uid', ellipsis: true },
    { title: '邮箱', dataIndex: 'email', key: 'email', render: (v) => v ?? '—' },
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
      width: 200,
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleString('zh-CN') : '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, row) => (
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
        layout="inline"
        style={{ marginBottom: 16, rowGap: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="email" label="邮箱">
          <Input allowClear placeholder="模糊搜索" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="uid" label="用户 UID">
          <Input allowClear placeholder="模糊搜索" style={{ width: 200 }} />
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
      <Table<ApiUser>
        rowKey="uid"
        loading={loading}
        columns={columns}
        dataSource={data}
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
    </div>
  )
}

export default UserListPage
