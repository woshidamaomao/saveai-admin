import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Grid, Input, List, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { getProducts, getStripeProductCandidates, importStripeProduct } from '../../api/products'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiProduct, StripeProductCandidate } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const PAGE_SIZE = 10

type ListFilters = {
  productId: string
  slug: string
  name: string
}

type ImportProductFormValues = {
  productId: string
}

const productStateTextMap: Record<number, string> = {
  1: '启用',
  2: '停用',
  3: '归档',
}

const productStateColorMap: Record<number, string> = {
  1: 'success',
  2: 'default',
  3: 'warning',
}

const wrapCellStyle = {
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}

const renderWrapText = (value?: string | number | null) => (
  <span style={wrapCellStyle}>{value == null || value === '' ? '—' : value}</span>
)

const renderLimitText = (value?: number | null) => {
  if (value == null) {
    return '—'
  }

  return value === 0 || value === -1 ? '无限制' : value
}

const renderStateTag = (state?: number | null) => {
  if (state == null) {
    return '—'
  }

  return (
    <Tag color={productStateColorMap[state] ?? 'default'}>
      {productStateTextMap[state] ?? state}
    </Tag>
  )
}

const ProductListPage = () => {
  const [form] = Form.useForm<ListFilters>()
  const [importForm] = Form.useForm<ImportProductFormValues>()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiProduct[]>([])
  const [total, setTotal] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [candidates, setCandidates] = useState<StripeProductCandidate[]>([])
  const [applied, setApplied] = useState<ListFilters>({
    productId: '',
    slug: '',
    name: '',
  })

  const load = useCallback(async (p: number, filters: ListFilters) => {
    setLoading(true)
    try {
      const res = await getProducts({
        page: p,
        limit: PAGE_SIZE,
        filters: {
          productId: filters.productId || undefined,
          slug: filters.slug || undefined,
          name: filters.name || undefined,
        },
      })
      setData(res.data)
      setTotal(res.total ?? 0)
    } catch (error) {
      message.error(getErrorMessage(error, '加载商品列表失败'))
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
      productId: (values.productId ?? '').trim(),
      slug: (values.slug ?? '').trim(),
      name: (values.name ?? '').trim(),
    })
    setPage(1)
  }

  const handleReset = () => {
    form.resetFields()
    setApplied({ productId: '', slug: '', name: '' })
    setPage(1)
  }

  const openImportModal = async () => {
    setImportModalOpen(true)
    setCandidatesLoading(true)
    try {
      setCandidates(await getStripeProductCandidates())
    } catch (error) {
      message.error(getErrorMessage(error, '加载 Stripe 商品失败'))
      setCandidates([])
    } finally {
      setCandidatesLoading(false)
    }
  }

  const closeImportModal = () => {
    if (importing) return
    setImportModalOpen(false)
    importForm.resetFields()
  }

  const handleImport = async () => {
    let values: ImportProductFormValues
    try {
      values = await importForm.validateFields()
    } catch {
      return
    }
    setImporting(true)
    try {
      await importStripeProduct(values.productId)
      message.success('商品已从 Stripe 导入')
      setImportModalOpen(false)
      importForm.resetFields()
      await load(page, applied)
    } catch (error) {
      message.error(getErrorMessage(error, '导入商品失败'))
    } finally {
      setImporting(false)
    }
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  const columns: ColumnsType<ApiProduct> = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      width: 120,
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: 'Product ID',
      dataIndex: 'productId',
      key: 'productId',
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 90,
      render: renderStateTag,
    },
    {
      title: 'PDF 限额',
      dataIndex: 'pdfExportDailyLimit',
      key: 'pdfExportDailyLimit',
      width: 100,
      render: renderLimitText,
    },
    {
      title: 'Notion 限额',
      dataIndex: 'notionExportDailyLimit',
      key: 'notionExportDailyLimit',
      width: 120,
      render: renderLimitText,
    },
    {
      title: 'Word 限额',
      dataIndex: 'wordExportDailyLimit',
      key: 'wordExportDailyLimit',
      width: 110,
      render: renderLimitText,
    },
    {
      title: '排序',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
  ]

  return (
    <div>
      <Space
        align="center"
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
          商品列表
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => void openImportModal()}>
          从 Stripe 创建
        </Button>
      </Space>
      <Form
        form={form}
        layout={isMobile ? 'vertical' : 'inline'}
        style={{ marginBottom: 16, rowGap: 12 }}
        onFinish={handleSearch}
      >
        <Form.Item name="productId" label="Product ID">
          <Input allowClear placeholder="精确搜索" style={{ width: isMobile ? '100%' : 220 }} />
        </Form.Item>
        <Form.Item name="slug" label="Slug">
          <Input allowClear placeholder="模糊搜索" style={{ width: isMobile ? '100%' : 160 }} />
        </Form.Item>
        <Form.Item name="name" label="名称">
          <Input allowClear placeholder="模糊搜索" style={{ width: isMobile ? '100%' : 180 }} />
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
        <List<ApiProduct>
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
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap>
                    {renderStateTag(item.state)}
                    <Tag>{renderWrapText(item.slug)}</Tag>
                  </Space>
                  <div>
                    <Text type="secondary">商品名称</Text>
                    <div>{renderWrapText(item.name)}</div>
                  </div>
                  <div>
                    <Text type="secondary">Product ID</Text>
                    <div>{renderWrapText(item.productId)}</div>
                  </div>
                  <Space wrap>
                    <span>
                      <Text type="secondary">PDF：</Text>
                      {renderLimitText(item.pdfExportDailyLimit)}
                    </span>
                    <span>
                      <Text type="secondary">Notion：</Text>
                      {renderLimitText(item.notionExportDailyLimit)}
                    </span>
                    <span>
                      <Text type="secondary">Word：</Text>
                      {renderLimitText(item.wordExportDailyLimit)}
                    </span>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table<ApiProduct>
          rowKey="productId"
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
              `${range[0]}-${range[1]} 条，共 ${t} 条商品 · 共 ${totalPages} 页`,
          }}
          onChange={(pagination) => {
            if (pagination.current && pagination.current !== page) {
              setPage(pagination.current)
            }
          }}
        />
      )}
      <Modal
        title="从 Stripe 创建商品"
        open={importModalOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={importing}
        onCancel={closeImportModal}
        onOk={() => void handleImport()}
      >
        <Form form={importForm} layout="vertical">
          <Form.Item
            name="productId"
            label="Stripe 商品"
            rules={[{ required: true, message: '请选择 Stripe 商品' }]}
            extra="仅展示 Stripe 中启用且尚未入库的商品；名称、描述及本地默认配置将自动生成。"
          >
            <Select
              showSearch
              loading={candidatesLoading}
              placeholder={candidatesLoading ? '正在从 Stripe 加载' : '请选择商品'}
              optionFilterProp="label"
              notFoundContent={candidatesLoading ? '加载中…' : '没有可导入的商品'}
              options={candidates.map((candidate) => ({
                label: `${candidate.name} / ${candidate.productId}`,
                value: candidate.productId,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProductListPage
