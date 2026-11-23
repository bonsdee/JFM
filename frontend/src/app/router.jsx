import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { FullPageLoader, PageLoader } from '@/components/layout/FullPageLoader'
import { RouteError } from '@/components/layout/RouteError'

// Every route is code-split so the landing page ships only what it needs.
const Landing = lazy(() => import('@/pages/landing/LandingPage'))
const Login = lazy(() => import('@/pages/auth/LoginPage'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const AppLayout = lazy(() => import('@/components/layout/AppLayout'))
const Dashboard = lazy(() => import('@/pages/dashboard/DashboardPage'))
const Products = lazy(() => import('@/pages/inventory/ProductsPage'))
const ProductDetail = lazy(() => import('@/pages/inventory/ProductDetailPage'))
const Categories = lazy(() => import('@/pages/inventory/CategoriesPage'))
const Movements = lazy(() => import('@/pages/stock/MovementsPage'))
const StockForm = lazy(() => import('@/pages/stock/StockFormPage'))
const PhysicalCount = lazy(() => import('@/pages/stock/PhysicalCountPage'))
const Suppliers = lazy(() => import('@/pages/purchasing/SuppliersPage'))
const PurchaseOrders = lazy(() => import('@/pages/purchasing/PurchaseOrdersPage'))
const PurchaseOrderForm = lazy(() => import('@/pages/purchasing/PurchaseOrderFormPage'))
const PurchaseOrderDetail = lazy(() => import('@/pages/purchasing/PurchaseOrderDetailPage'))
const Reorder = lazy(() => import('@/pages/purchasing/ReorderPage'))
const Services = lazy(() => import('@/pages/services/ServicesPage'))
const Jobs = lazy(() => import('@/pages/jobs/JobsPage'))
const JobForm = lazy(() => import('@/pages/jobs/JobFormPage'))
const JobDetail = lazy(() => import('@/pages/jobs/JobDetailPage'))
const Pos = lazy(() => import('@/pages/pos/PosPage'))
const Sales = lazy(() => import('@/pages/sales/SalesPage'))
const SaleDetail = lazy(() => import('@/pages/sales/SaleDetailPage'))
const Customers = lazy(() => import('@/pages/customers/CustomersPage'))
const CustomerDetail = lazy(() => import('@/pages/customers/CustomerDetailPage'))
const Expenses = lazy(() => import('@/pages/expenses/ExpensesPage'))
const Reports = lazy(() => import('@/pages/reports/ReportsPage'))
const Inquiries = lazy(() => import('@/pages/inquiries/InquiriesPage'))
const Audit = lazy(() => import('@/pages/audit/AuditLogPage'))
const Settings = lazy(() => import('@/pages/settings/SettingsPage'))
const Website = lazy(() => import('@/pages/website/WebsitePage'))
const NotFound = lazy(() => import('@/pages/NotFoundPage'))

const top = (el) => <Suspense fallback={<FullPageLoader />}>{el}</Suspense>
const page = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>

export const router = createBrowserRouter([
  { path: '/', element: top(<Landing />), errorElement: <RouteError /> },
  { path: '/login', element: top(<Login />) },
  { path: '/forgot-password', element: top(<ForgotPassword />) },
  { path: '/reset-password', element: top(<ResetPassword />) },
  {
    path: '/app',
    element: top(<AppLayout />),
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<Dashboard />) },
      { path: 'inventory/products', element: page(<Products />) },
      { path: 'inventory/products/:id', element: page(<ProductDetail />) },
      { path: 'inventory/categories', element: page(<Categories />) },
      { path: 'stock', element: page(<Movements />) },
      { path: 'stock/in', element: page(<StockForm mode="in" />) },
      { path: 'stock/out', element: page(<StockForm mode="out" />) },
      { path: 'stock/count', element: page(<PhysicalCount />) },
      { path: 'purchasing/orders', element: page(<PurchaseOrders />) },
      { path: 'purchasing/orders/new', element: page(<PurchaseOrderForm />) },
      { path: 'purchasing/orders/:id', element: page(<PurchaseOrderDetail />) },
      { path: 'purchasing/orders/:id/edit', element: page(<PurchaseOrderForm />) },
      { path: 'purchasing/suppliers', element: page(<Suppliers />) },
      { path: 'purchasing/reorder', element: page(<Reorder />) },
      { path: 'services', element: page(<Services />) },
      { path: 'jobs', element: page(<Jobs />) },
      { path: 'jobs/new', element: page(<JobForm />) },
      { path: 'jobs/:id', element: page(<JobDetail />) },
      { path: 'jobs/:id/edit', element: page(<JobForm />) },
      { path: 'pos', element: page(<Pos />) },
      { path: 'sales', element: page(<Sales />) },
      { path: 'sales/:id', element: page(<SaleDetail />) },
      { path: 'customers', element: page(<Customers />) },
      { path: 'customers/:id', element: page(<CustomerDetail />) },
      { path: 'expenses', element: page(<Expenses />) },
      { path: 'reports', element: page(<Reports />) },
      { path: 'inquiries', element: page(<Inquiries />) },
      { path: 'audit', element: page(<Audit />) },
      { path: 'website', element: page(<Website />) },
      { path: 'settings', element: page(<Settings />) },
      { path: '*', element: page(<NotFound />) },
    ],
  },
  { path: '*', element: top(<NotFound />) },
])
