import { Card, Typography } from 'antd'

const { Title, Paragraph } = Typography

const DashboardPage = () => {
  return (
    <div>
      <Title level={4}>工作台</Title>
      <Card>
        <Paragraph>
          已接入 Vite、React、TypeScript、Ant Design 与 React Router。在此添加业务模块即可。
        </Paragraph>
      </Card>
    </div>
  )
}

export default DashboardPage
