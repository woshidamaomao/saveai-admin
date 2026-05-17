import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { getProducts } from '../../api/products'
import { createPrice, getPrices } from '../../api/prices'
import { TimeDisplay } from '../../components/TimeDisplay'
import type { ApiPrice, ApiProduct } from '../../types/api'
import { getErrorMessage } from '../../utils/error-message'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const PAGE_SIZE = 10

type ListFilters = {
  priceId: string
  productId: string
}

type CreatePriceFormValues = {
  productId: string
  priceId: string
  billingMode: number
  billingInterval: number
  currency: string
  showPrice: number
  unitAmount: number
  trialDays: number
  state: number
  isDefault: boolean
  displayOrder: number
}

const currencyOptions = [
  { label: 'USD - 美元', value: 'USD' },
  { label: 'EUR - 欧元', value: 'EUR' },
  { label: 'GBP - 英镑', value: 'GBP' },
  { label: 'CAD - 加拿大元', value: 'CAD' },
  { label: 'AUD - 澳大利亚元', value: 'AUD' },
  { label: 'CHF - 瑞士法郎', value: 'CHF' },
  { label: 'JPY - 日元', value: 'JPY' },
  { label: 'SEK - 瑞典克朗', value: 'SEK' },
  { label: 'NOK - 挪威克朗', value: 'NOK' },
  { label: 'DKK - 丹麦克朗', value: 'DKK' },
  { label: 'NZD - 新西兰元', value: 'NZD' },
  { label: 'SGD - 新加坡元', value: 'SGD' },
  { label: 'HKD - 港币', value: 'HKD' },
  { label: 'CNY - 人民币', value: 'CNY' },
]

const billingModeOptions = [
  { label: '普通订阅', value: 1 },
  { label: '一次性付费', value: 2 },
]

const billingIntervalOptions = [
  { label: '月卡', value: 1 },
  { label: '年卡', value: 2 },
]

const priceStateOptions = [
  { label: '启用', value: 1 },
  { label: '隐藏', value: 2 },
  { label: '归档', value: 3 },
]

const priceStateTextMap: Record<number, string> = {
  1: '启用',
  2: '隐藏',
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

const billingModeTextMap: Record<number, string> = {
  1: '普通订阅',
  2: '一次性付费',
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
  if (state == null) {
    return '—'
  }

  return (
    <Tag color={priceStateColorMap[state] ?? 'default'}>
      {priceStateTextMap[state] ?? state}
    </Tag>
  )
}

const renderBooleanTag = (value?: boolean | null) => {
  if (value == null) {
    return '—'
  }

  return value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>
}

const renderBillingInterval = (value?: number | null) => (
  value == null ? '—' : billingIntervalTextMap[value] ?? value
)

const renderBillingMode = (value?: number | null) => (
  value == null ? '—' : billingModeTextMap[value] ?? value
)

const formatPriceAmount = (price: ApiPrice) => (
  `${price.showPrice} ${price.currency.toUpperCase()}`
)

const PriceListPage = () => {
  const [form] = Form.useForm<ListFilters>()
  const [createForm] = Form.useForm<CreatePriceFormValues>()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiPrice[]>([])
  const [total, setTotal] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [applied, setApplied] = useState<ListFilters>({
    priceId: '',
    productId: '',
  })

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

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const res = await getProducts({
        page: 1,
        limit: 50,
      })
      setProducts(res.data)
    } catch (error) {
      message.error(getErrorMessage(error, '加载商品选项失败'))
      setProducts([])
    } finally {
      setProductsLoading(false)
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

  const openCreateModal = () => {
    createForm.setFieldsValue({
      billingMode: 1,
      billingInterval: 1,
      currency: 'USD',
      trialDays: 0,
      state: 1,
      isDefault: false,
      displayOrder: 0,
    })
    setCreateModalOpen(true)
    void loadProducts()
  }

  const closeCreateModal = () => {
    if (creating) {
      return
    }

    setCreateModalOpen(false)
    createForm.resetFields()
  }

  const handleCreatePrice = async () => {
    let values: CreatePriceFormValues
    try {
      values = await createForm.validateFields()
    } catch {
      return
    }

    setCreating(true)
    try {
      await createPrice({
        productId: values.productId,
        priceId: values.priceId.trim(),
        billingMode: values.billingMode,
        billingInterval: values.billingInterval,
        currency: values.currency,
        showPrice: values.showPrice,
        unitAmount: values.unitAmount,
        trialDays: values.trialDays,
        state: values.state,
        isDefault: values.isDefault,
        displayOrder: values.displayOrder,
      })
      message.success('价格已创建')
      setCreateModalOpen(false)
      createForm.resetFields()
      await load(page, applied)
    } catch (error) {
      message.error(getErrorMessage(error, '创建价格失败'))
    } finally {
      setCreating(false)
    }
  }

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
      render: (value?: string | null) => renderWrapText(value),
    },
    {
      title: '周期',
      dataIndex: 'billingInterval',
      key: 'billingInterval',
      width: 110,
      render: renderBillingInterval,
    },
    {
      title: '计费模式',
      dataIndex: 'billingMode',
      key: 'billingMode',
      width: 120,
      render: renderBillingMode,
    },
    {
      title: '展示价格',
      key: 'showPrice',
      width: 120,
      render: (_, row) => formatPriceAmount(row),
    },
    {
      title: '试用天数',
      dataIndex: 'trialDays',
      key: 'trialDays',
      width: 100,
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 80,
      render: renderBooleanTag,
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 90,
      render: renderStateTag,
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
          价格列表
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建价格
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
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
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
            onChange: (nextPage) => setPage(nextPage),
          }}
          renderItem={(item) => (
            <List.Item style={{ paddingInline: 0 }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap>
                    {renderStateTag(item.state)}
                    <Tag color="blue">{renderBillingInterval(item.billingInterval)}</Tag>
                    {renderBooleanTag(item.isDefault)}
                  </Space>
                  <div>
                    <Text type="secondary">商品</Text>
                    <div>{renderWrapText(item.product?.name ?? item.productId)}</div>
                  </div>
                  <div>
                    <Text type="secondary">Price ID</Text>
                    <div>{renderWrapText(item.priceId)}</div>
                  </div>
                  <Space wrap>
                    <span>
                      <Text type="secondary">价格：</Text>
                      {formatPriceAmount(item)}
                    </span>
                    <span>
                      <Text type="secondary">试用：</Text>
                      {item.trialDays} 天
                    </span>
                  </Space>
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
          tableLayout="fixed"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showLessItems: true,
            showTotal: (t, range) =>
              `${range[0]}-${range[1]} 条，共 ${t} 条价格 · 共 ${totalPages} 页`,
          }}
          onChange={(pagination) => {
            if (pagination.current && pagination.current !== page) {
              setPage(pagination.current)
            }
          }}
        />
      )}
      <Modal
        title="新建价格"
        open={createModalOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        width={isMobile ? 'calc(100vw - 32px)' : 720}
        onCancel={closeCreateModal}
        onOk={() => void handleCreatePrice()}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            billingMode: 1,
            billingInterval: 1,
            currency: 'USD',
            trialDays: 0,
            state: 1,
            isDefault: false,
            displayOrder: 0,
          }}
        >
          <Form.Item
            name="productId"
            label="产品"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select
              showSearch
              loading={productsLoading}
              placeholder="请选择产品"
              optionFilterProp="label"
              options={products.map((product) => ({
                label: `${product.name} / ${product.slug} / ${product.productId}`,
                value: product.productId,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="priceId"
            label="Price ID"
            rules={[{ required: true, message: '请输入 Price ID' }]}
            extra="当前通常填写 Stripe Price ID，例如 price_xxx。"
          >
            <Input allowClear placeholder="price_xxx" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }} wrap>
            <Form.Item
              name="billingMode"
              label="计费模式"
              rules={[{ required: true, message: '请选择计费模式' }]}
              style={{ flex: 1, minWidth: 220 }}
            >
              <Select options={billingModeOptions} />
            </Form.Item>
            <Form.Item
              name="billingInterval"
              label="卡类型"
              rules={[{ required: true, message: '请选择卡类型' }]}
              style={{ flex: 1, minWidth: 220 }}
            >
              <Select options={billingIntervalOptions} />
            </Form.Item>
          </Space>
          <Space size={16} style={{ width: '100%' }} wrap>
            <Form.Item
              name="currency"
              label="币种代码"
              rules={[{ required: true, message: '请选择币种' }]}
              style={{ flex: 1, minWidth: 180 }}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={currencyOptions}
              />
            </Form.Item>
            <Form.Item
              name="showPrice"
              label="展示价格"
              rules={[{ required: true, message: '请输入展示价格' }]}
              style={{ flex: 1, minWidth: 180 }}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="unitAmount"
              label="最小单位金额"
              rules={[{ required: true, message: '请输入最小单位金额' }]}
              style={{ flex: 1, minWidth: 180 }}
              extra="例如 USD 下 9.99 填 999。"
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space size={16} style={{ width: '100%' }} wrap>
            <Form.Item
              name="trialDays"
              label="试用天数"
              style={{ flex: 1, minWidth: 160 }}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="state"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
              style={{ flex: 1, minWidth: 160 }}
            >
              <Select options={priceStateOptions} />
            </Form.Item>
            <Form.Item
              name="displayOrder"
              label="展示排序"
              style={{ flex: 1, minWidth: 160 }}
            >
              <InputNumber precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="isDefault" label="默认推荐" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PriceListPage
