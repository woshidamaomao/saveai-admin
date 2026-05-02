import { Button, Card, InputNumber, Table, Typography, Space, Tag, Tooltip } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'

const { Title, Paragraph, Text } = Typography

const STORAGE_KEY = 'saveai_load_calculator_params'

interface WeightParams {
  taskWeight: number
  messageWeight: number
  imageWeight: number
  closeThreshold: number
}

interface ServerConfig {
  id: string
  region: string
  capacity: number
}

interface Scenario {
  key: number
  label: string
  messages: number
  images: number
  hasImages: boolean
}

interface ScenarioResult extends Scenario {
  weightedScore: number
  loadRatios: Record<string, number>
}

const DEFAULT_PARAMS: WeightParams = {
  taskWeight: 3,
  messageWeight: 0.04,
  imageWeight: 0.2,
  closeThreshold: 0.2,
}

const SERVERS: ServerConfig[] = [
  { id: 'flkf-main', region: 'flkf', capacity: 15 },
  { id: 'us-1', region: 'us', capacity: 10 },
  { id: 'flkf-2', region: 'flkf', capacity: 15 },
]

const SCENARIOS: Scenario[] = [
  { key: 1, label: '极简任务', messages: 1, images: 0, hasImages: false },
  { key: 2, label: '短对话', messages: 3, images: 0, hasImages: false },
  { key: 3, label: '短对话+1图', messages: 3, images: 1, hasImages: true },
  { key: 4, label: '普通对话', messages: 5, images: 0, hasImages: false },
  { key: 5, label: '普通对话+1图', messages: 5, images: 1, hasImages: true },
  { key: 6, label: '普通对话+2图', messages: 5, images: 2, hasImages: true },
  { key: 7, label: '中等对话', messages: 10, images: 0, hasImages: false },
  { key: 8, label: '中等对话+1图', messages: 10, images: 1, hasImages: true },
  { key: 9, label: '中等对话+3图', messages: 10, images: 3, hasImages: true },
  { key: 10, label: '中等对话+5图', messages: 10, images: 5, hasImages: true },
  { key: 11, label: '较长对话', messages: 15, images: 0, hasImages: false },
  { key: 12, label: '较长对话+2图', messages: 15, images: 2, hasImages: true },
  { key: 13, label: '较长对话+5图', messages: 15, images: 5, hasImages: true },
  { key: 14, label: '长对话', messages: 20, images: 0, hasImages: false },
  { key: 15, label: '长对话+3图', messages: 20, images: 3, hasImages: true },
  { key: 16, label: '长对话+5图', messages: 20, images: 5, hasImages: true },
  { key: 17, label: '长对话+10图', messages: 20, images: 10, hasImages: true },
  { key: 18, label: '30条消息', messages: 30, images: 0, hasImages: false },
  { key: 19, label: '30条+5图', messages: 30, images: 5, hasImages: true },
  { key: 20, label: '30条+10图', messages: 30, images: 10, hasImages: true },
  { key: 21, label: '50条消息', messages: 50, images: 0, hasImages: false },
  { key: 22, label: '50条+5图', messages: 50, images: 5, hasImages: true },
  { key: 23, label: '50条+10图', messages: 50, images: 10, hasImages: true },
  { key: 24, label: '50条+20图', messages: 50, images: 20, hasImages: true },
  { key: 25, label: '80条消息', messages: 80, images: 0, hasImages: false },
  { key: 26, label: '80条+10图', messages: 80, images: 10, hasImages: true },
  { key: 27, label: '100条消息', messages: 100, images: 0, hasImages: false },
  { key: 28, label: '100条+5图', messages: 100, images: 5, hasImages: true },
  { key: 29, label: '100条+15图', messages: 100, images: 15, hasImages: true },
  { key: 30, label: '100条+30图', messages: 100, images: 30, hasImages: true },
  { key: 31, label: '150条消息', messages: 150, images: 0, hasImages: false },
  { key: 32, label: '150条+10图', messages: 150, images: 10, hasImages: true },
  { key: 33, label: '200条消息', messages: 200, images: 0, hasImages: false },
  { key: 34, label: '200条+10图', messages: 200, images: 10, hasImages: true },
  { key: 35, label: '200条+20图', messages: 200, images: 20, hasImages: true },
  { key: 36, label: '200条+50图', messages: 200, images: 50, hasImages: true },
  { key: 37, label: '300条消息', messages: 300, images: 0, hasImages: false },
  { key: 38, label: '300条+10图', messages: 300, images: 10, hasImages: true },
  { key: 39, label: '300条+30图', messages: 300, images: 30, hasImages: true },
  { key: 40, label: '300条+50图', messages: 300, images: 50, hasImages: true },
  { key: 41, label: '400条消息', messages: 400, images: 0, hasImages: false },
  { key: 42, label: '400条+20图', messages: 400, images: 20, hasImages: true },
  { key: 43, label: '500条消息', messages: 500, images: 0, hasImages: false },
  { key: 44, label: '500条+10图', messages: 500, images: 10, hasImages: true },
  { key: 45, label: '500条+30图', messages: 500, images: 30, hasImages: true },
  { key: 46, label: '500条+50图', messages: 500, images: 50, hasImages: true },
  { key: 47, label: '600条消息', messages: 600, images: 0, hasImages: false },
  { key: 48, label: '700条消息', messages: 700, images: 0, hasImages: false },
  { key: 49, label: '800条消息', messages: 800, images: 0, hasImages: false },
  { key: 50, label: '800条+30图', messages: 800, images: 30, hasImages: true },
]

function loadParams(): WeightParams {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_PARAMS, ...JSON.parse(saved) }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PARAMS }
}

function saveParams(params: WeightParams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
}

function calcScore(messages: number, images: number, params: WeightParams): number {
  return params.taskWeight + messages * params.messageWeight + images * params.imageWeight
}

function getLoadLevel(ratio: number): 'low' | 'medium' | 'high' | 'overload' {
  if (ratio < 0.5) return 'low'
  if (ratio < 0.8) return 'medium'
  if (ratio < 1.0) return 'high'
  return 'overload'
}

function getLoadColor(ratio: number): string {
  const level = getLoadLevel(ratio)
  if (level === 'low') return '#52c41a'
  if (level === 'medium') return '#faad14'
  if (level === 'high') return '#ff7a00'
  return '#ff4d4f'
}

function getLoadTag(ratio: number) {
  const level = getLoadLevel(ratio)
  const labels = { low: '低', medium: '中', high: '高', overload: '超载' }
  const colors = { low: 'green', medium: 'gold', high: 'orange', overload: 'red' }
  return <Tag color={colors[level]}>{labels[level]}</Tag>
}

const LoadCalculatorPage = () => {
  const [params, setParams] = useState<WeightParams>(loadParams)

  const updateParam = useCallback(<K extends keyof WeightParams>(key: K, value: WeightParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    saveParams(params)
  }, [params])

  const handleReset = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const results: ScenarioResult[] = useMemo(() => {
    return SCENARIOS.map((s) => {
      const weightedScore = calcScore(s.messages, s.images, params)
      const loadRatios: Record<string, number> = {}
      for (const server of SERVERS) {
        loadRatios[server.id] = weightedScore / server.capacity
      }
      return { ...s, weightedScore, loadRatios }
    })
  }, [params])

  const columns: ColumnsType<ScenarioResult> = [
    {
      title: '#',
      dataIndex: 'key',
      width: 50,
      align: 'center',
    },
    {
      title: '场景',
      dataIndex: 'label',
      width: 140,
    },
    {
      title: '消息数',
      dataIndex: 'messages',
      width: 80,
      align: 'right',
    },
    {
      title: '图片数',
      dataIndex: 'images',
      width: 80,
      align: 'right',
      render: (v: number) => v || '-',
    },
    {
      title: '加权得分',
      dataIndex: 'weightedScore',
      width: 100,
      align: 'right',
      render: (v: number) => <Text strong>{v.toFixed(2)}</Text>,
    },
    ...SERVERS.map((server) => ({
      title: (
        <Tooltip title={`容量: ${server.capacity}`}>
          <span>{server.id}</span>
        </Tooltip>
      ),
      key: server.id,
      width: 120,
      align: 'right' as const,
      render: (_: unknown, record: ScenarioResult) => {
        const ratio = record.loadRatios[server.id]
        return (
          <span style={{ color: getLoadColor(ratio) }}>
            {(ratio * 100).toFixed(1)}% {getLoadTag(ratio)}
          </span>
        )
      },
    })),
  ]

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => window.history.back()} size="small">
          &larr; 返回工具箱
        </Button>
      </div>

      <Title level={5} style={{ marginTop: 0 }}>
        负载调参生成器
      </Title>
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 24 }}>
        调整加权负载参数，实时查看 50 种典型场景在各服务器上的负载比。参数自动保存到本地。
      </Paragraph>

      <Card title="权重参数" size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>任务基础权重</Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={0}
                max={100}
                step={0.5}
                value={params.taskWeight}
                onChange={(v) => updateParam('taskWeight', v ?? DEFAULT_PARAMS.taskWeight)}
                style={{ width: 120 }}
              />
            </div>
          </div>
          <div>
            <Text strong>每条消息权重</Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={0}
                max={10}
                step={0.01}
                value={params.messageWeight}
                onChange={(v) => updateParam('messageWeight', v ?? DEFAULT_PARAMS.messageWeight)}
                style={{ width: 120 }}
              />
            </div>
          </div>
          <div>
            <Text strong>每张图片权重</Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={0}
                max={10}
                step={0.05}
                value={params.imageWeight}
                onChange={(v) => updateParam('imageWeight', v ?? DEFAULT_PARAMS.imageWeight)}
                style={{ width: 120 }}
              />
            </div>
          </div>
          <div>
            <Text strong>相近阈值</Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={0}
                max={1}
                step={0.01}
                value={params.closeThreshold}
                onChange={(v) => updateParam('closeThreshold', v ?? DEFAULT_PARAMS.closeThreshold)}
                style={{ width: 120 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 2 }}>
            <Button icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </div>
        </Space>

        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f6f8fa', borderRadius: 6, fontSize: 13 }}>
          <Text type="secondary">
            公式: 加权得分 = <Text code>{params.taskWeight}</Text> + 消息数 &times; <Text code>{params.messageWeight}</Text> + 图片数 &times; <Text code>{params.imageWeight}</Text>
            &nbsp;&nbsp;|&nbsp;&nbsp;负载比 = 得分 / 容量
            &nbsp;&nbsp;|&nbsp;&nbsp;相近阈值: <Text code>{params.closeThreshold}</Text>
          </Text>
        </div>
      </Card>

      <Card title="服务器配置" size="small" style={{ marginBottom: 16 }}>
        <Space size="large">
          {SERVERS.map((s) => (
            <div key={s.id}>
              <Text strong>{s.id}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                地域: {s.region} | 容量: {s.capacity}
              </Text>
            </div>
          ))}
          <div>
            <Text type="secondary">
              总容量: {SERVERS.reduce((sum, s) => sum + s.capacity, 0)}
            </Text>
          </div>
        </Space>
      </Card>

      <Card title="50 种场景负载模拟" size="small">
        <Table<ScenarioResult>
          columns={columns}
          dataSource={results}
          pagination={false}
          size="small"
          scroll={{ y: 600 }}
          rowClassName={(record) => {
            const maxRatio = Math.max(...Object.values(record.loadRatios))
            if (maxRatio >= 1) return 'load-row-overload'
            if (maxRatio >= 0.8) return 'load-row-high'
            return ''
          }}
        />
      </Card>

      <style>{`
        .load-row-overload td { background: #fff1f0 !important; }
        .load-row-high td { background: #fffbe6 !important; }
      `}</style>
    </div>
  )
}

export default LoadCalculatorPage
