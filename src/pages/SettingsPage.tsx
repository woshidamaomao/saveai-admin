import { Card, Typography } from 'antd'

const { Title, Paragraph } = Typography

const SettingsPage = () => {
  return (
    <div>
      <Title level={4}>设置</Title>
      <Card>
        <Paragraph>在此配置环境变量、接口地址或账号相关选项。</Paragraph>
      </Card>
    </div>
  )
}

export default SettingsPage
