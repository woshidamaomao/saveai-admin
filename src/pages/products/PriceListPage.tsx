import { PlusOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { getProducts } from '../../api/products'
import {
  getPrices,
  getStripePriceCandidates,
  importStripePrice,
  syncStripePrice,
  updatePriceState,
} from '../../api/prices'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiPrice, ApiProduct, StripePriceCandidate } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const PAGE_SIZE = 10

type ListFilters = {
  priceId: string
  productId: string
}

type ImportPriceFormValues = {
  productId: string
  priceId: string
}

const priceStateTextMap: Record<number, string> = {
  1: '启用',
  2: '停用',
  3: '归档',
}

const priceStateColorMap: Record<number, string> = {
  1: 'success',
  2: 'default',
  3: 'warning',
}

const billingIntervalTextMap: Record<number, string> = {
  1: '月订阅',
  2: '年订阅',
}

const wrapCellStyle = {
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
}

const renderWrapText = (value?: string | number | null) => (
  <span style={wrapCellStyle}>{value == null || value === '' ? '—' : value}</span>
)

const renderStateTag = (state?: number | null) => {
  if (state == null) return '—'
  return (
    <Tag color={priceStateColorMap[state] ?? 'default'}>
      {priceStateTextMap[state] ?? state}
    </Tag>
  )
}

const renderStripeState = (active?: boolean | null) => {
  if (active == null) return <Tag>未同步</Tag>
  return active ? <Tag color="success">Stripe 启用</Tag> : <Tag color="error">Stripe 停用</Tag>
}

const renderBillingInterval = (value?: number | null) => (
  value == null ? '—' : billingIntervalTextMap[value] ?? value
)

const formatPriceAmount = (price: Pick<ApiPrice, 'showPrice' | 'currency'>) => (
  `${price.showPrice} ${price.currency.toUpperCase()}`
)

const PriceListPage = () => {
  const [form] = Form.useForm<ListFilters>()
  const [importForm] = Form.useForm<ImportPriceFormValues>()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiPrice[]>([])
  const [total, setTotal] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [candidates, setCandidates] = useState<StripePriceCandidate[]>([])
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [stateUpdatingId, setStateUpdatingId] = useState<number | null>(null)
  const [applied, setApplied] = useState<ListFilters>({ priceId: '', productId: '' })

  const load = useCallback(async (p: number, filters: ListFilters) => {
    setLoading(true)
    try {
      const res = await getPrices({
        page: p,
        limit: PAGE_SIZE,
        filters: {
          priceId: filters.priceId || undefined,
          productId: filters.productId || undefined,
        },
      })
      setData(res.data)
      setTotal(res.total ?? 0)
    } catch (error) {
      message.error(getErrorMessage(error, '加载价格列表失败'))
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
      priceId: (values.priceId ?? '').trim(),
      productId: (values.productId ?? '').trim(),
    })
    setPage(1)
  }

  const handleReset = () => {
    form.resetFields()
    setApplied({ priceId: '', productId: '' })
    setPage(1)
  }

  const openImportModal = async () => {
    importForm.resetFields()
    setCandidates([])
    setImportModalOpen(true)
    setProductsLoading(true)
    try {
      const res = await getProducts({ page: 1, limit: 50 })
      setProducts(res.data)
    } catch (error) {
      message.error(getErrorMessage(error, '加载商品选项失败'))
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  const loadCandidates = async (productId: string) => {
    importForm.setFieldValue('priceId', undefined)
    setCandidates([])
    setCandidatesLoading(true)
    try {
      setCandidates(await getStripePriceCandidates(productId))
    } catch (error) {
      message.error(getErrorMessage(error, '加载 Stripe 价格失败'))
    } finally {
      setCandidatesLoading(false)
    }
  }

  const closeImportModal = () => {
    if (importing) return
    setImportModalOpen(false)
    importForm.resetFields()
    setCandidates([])
  }

  const handleImport = async () => {
    let values: ImportPriceFormValues
    try {
      values = await importForm.validateFields()
    } catch {
      return
    }
    setImporting(true)
    try {
      await importStripePrice(values.priceId)
      message.success('价格已从 Stripe 导入')
      setImportModalOpen(false)
      importForm.resetFields()
      setCandidates([])
      await load(page, applied)
    } catch (error) {
      message.error(getErrorMessage(error, '导入价格失败'))
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async (price: ApiPrice) => {
    setSyncingId(price.id)
    try {
      await syncStripePrice(price.id)
      message.success('价格已同步')
      await load(page, applied)
    } catch (error) {
      message.error(getErrorMessage(error, '同步价格失败'))
    } finally {
      setSyncingId(null)
    }
  }

  const handleStateChange = async (price: ApiPrice) => {
    if (price.state !== 1 && price.state !== 2) return
    const nextState: 1 | 2 = price.state === 1 ? 2 : 1
    setStateUpdatingId(price.id)
    try {
      await updatePriceState(price.id, nextState)
      message.success(nextState === 1 ? '价格已启用' : '价格已停用')
      await load(page, applied)
    } catch (error) {
      message.error(getErrorMessage(error, '更新价格状态失败'))
    } finally {
      setStateUpdatingId(null)
    }
  }

  const renderActions = (price: ApiPrice) => (
    <Space wrap>
      <Button
        size="small"
        icon={<SyncOutlined />}
        loading={syncingId === price.id}
        onClick={() => void handleSync(price)}
      >
        同步
      </Button>
      {price.state === 1 || price.state === 2 ? (
        <Popconfirm
          title={`确定${price.state === 1 ? '停用' : '启用'}这个价格吗？`}
          okText="确定"
          cancelText="取消"
          onConfirm={() => void handleStateChange(price)}
        >
          <Button size="small" loading={stateUpdatingId === price.id}>
            {price.state === 1 ? '停用' : '启用'}
          </Button>
        </Popconfirm>
      ) : null}
    </Space>
  )

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)
  const columns: ColumnsType<ApiPrice> = [
    {
      title: '商品',
      key: 'product',
      render: (_, row) => renderWrapText(row.product?.name ?? row.productId),
    },
    {
      title: 'Price ID',
      dataIndex: 'priceId',
      key: 'priceId',
      render: renderWrapText,
    },
    {
      title: '周期',
      dataIndex: 'billingInterval',
      key: 'billingInterval',
      width: 100,
      render: renderBillingInterval,
    },
    {
      title: '价格',
      key: 'showPrice',
      width: 120,
      render: (_, row) => formatPriceAmount(row),
    },
    {
      title: '本地状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: renderStateTag,
    },
    {
      title: 'Stripe 状态',
      dataIndex: 'stripeActive',
      key: 'stripeActive',
      width: 120,
      render: renderStripeState,
    },
    {
      title: '最后同步',
      dataIndex: 'stripeSyncedAt',
      key: 'stripeSyncedAt',
      width: 180,
      render: (value?: string | null) => <TimeDisplay value={value} allowWrap />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, row) => renderActions(row),
    },
  ]

  return (
    <div>
      <Space
        align="center"
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>价格列表</Title>
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
        <Form.Item name="priceId" label="Price ID">
          <Input allowClear placeholder="精确搜索" style={{ width: isMobile ? '100%' : 220 }} />
        </Form.Item>
        <Form.Item name="productId" label="Product ID">
          <Input allowClear placeholder="精确搜索" style={{ width: isMobile ? '100%' : 220 }} />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
      {isMobile ? (
        <List<ApiPrice>
          loading={loading}
          dataSource={data}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            size: 'small',
            onChange: setPage,
          }}
          renderItem={(item) => (
            <List.Item style={{ paddingInline: 0 }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap>
                    {renderStateTag(item.state)}
                    {renderStripeState(item.stripeActive)}
                    <Tag color="blue">{renderBillingInterval(item.billingInterval)}</Tag>
                  </Space>
                  <div>
                    <Text type="secondary">商品</Text>
                    <div>{renderWrapText(item.product?.name ?? item.productId)}</div>
                  </div>
                  <div>
                    <Text type="secondary">Price ID</Text>
                    <div>{renderWrapText(item.priceId)}</div>
                  </div>
                  <div>{formatPriceAmount(item)}</div>
                  <div>
                    <Text type="secondary">最后同步：</Text>
                    <TimeDisplay value={item.stripeSyncedAt} allowWrap />
                  </div>
                  {renderActions(item)}
                </Space>
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Table<ApiPrice>
          rowKey="priceId"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showLessItems: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} 条，共 ${t} 条价格 · 共 ${totalPages} 页`,
          }}
          onChange={(pagination) => {
            if (pagination.current && pagination.current !== page) setPage(pagination.current)
          }}
        />
      )}
      <Modal
        title="从 Stripe 创建价格"
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
            label="本地商品"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select
              showSearch
              loading={productsLoading}
              optionFilterProp="label"
              placeholder="请选择商品"
              options={products.map((product) => ({
                label: `${product.name} / ${product.productId}`,
                value: product.productId,
              }))}
              onChange={(productId) => void loadCandidates(productId)}
            />
          </Form.Item>
          <Form.Item
            name="priceId"
            label="Stripe 价格"
            rules={[{ required: true, message: '请选择 Stripe 价格' }]}
            extra="仅展示 Stripe 中启用、尚未入库且系统支持的月付或年付价格。"
          >
            <Select
              showSearch
              disabled={!importForm.getFieldValue('productId')}
              loading={candidatesLoading}
              optionFilterProp="label"
              placeholder={candidatesLoading ? '正在从 Stripe 加载' : '请选择价格'}
              notFoundContent={candidatesLoading ? '加载中…' : '没有可导入的价格'}
              options={candidates.map((candidate) => ({
                label: `${formatPriceAmount(candidate)} / ${renderBillingInterval(candidate.billingInterval)} / ${candidate.priceId}`,
                value: candidate.priceId,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PriceListPage
