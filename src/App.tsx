import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PriceListPage from './pages/products/PriceListPage'
import ProductListPage from './pages/products/ProductListPage'
import SettingsPage from './pages/SettingsPage'
import SubscriptionDetailPage from './pages/subscriptions/SubscriptionDetailPage'
import SubscriptionListPage from './pages/subscriptions/SubscriptionListPage'
import ToolboxPage from './pages/ToolboxPage'
import LoadCalculatorPage from './pages/toolbox/LoadCalculatorPage'
import DailyUsageListPage from './pages/users/DailyUsageListPage'
import UserDetailPage from './pages/users/UserDetailPage'
import UserListPage from './pages/users/UserListPage'

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="toolbox" element={<ToolboxPage />} />
          <Route path="toolbox/load-calculator" element={<LoadCalculatorPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/prices" element={<PriceListPage />} />
          <Route path="subscriptions" element={<SubscriptionListPage />} />
          <Route path="subscriptions/:subId" element={<SubscriptionDetailPage />} />
          <Route path="users/list" element={<UserListPage />} />
          <Route path="users/usages" element={<DailyUsageListPage />} />
          <Route path="users/:uid" element={<UserDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
