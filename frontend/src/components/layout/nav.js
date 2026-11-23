import {
  BarChart3, Boxes, ClipboardList, FolderTree, History, Inbox, LayoutDashboard, Layers, PackagePlus, Printer,
  Receipt, ScanLine, Settings, ShoppingCart, Truck, Users, Wallet, ArrowLeftRight, ShieldCheck, Repeat, Globe,
} from 'lucide-react'

/** Sidebar groups; also feeds the Ctrl/Cmd+K command palette. */
export const NAV = [
  { label: 'Overview', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Sell',
    items: [
      { to: '/app/pos', label: 'Point of sale', icon: ShoppingCart, keywords: 'pos checkout cashier' },
      { to: '/app/jobs', label: 'Job orders', icon: Printer, keywords: 'kanban print tarp' },
      { to: '/app/sales', label: 'Sales history', icon: Receipt, keywords: 'receipts void' },
      { to: '/app/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/app/inventory/products', label: 'Products', icon: Boxes, keywords: 'inventory items materials' },
      { to: '/app/stock', label: 'Stock ledger', icon: ArrowLeftRight, keywords: 'movements in out' },
      { to: '/app/purchasing/orders', label: 'Purchase orders', icon: ClipboardList, keywords: 'po restock' },
      { to: '/app/purchasing/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/app/services', label: 'Services', icon: Layers, keywords: 'pricing bom catalog' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/app/expenses', label: 'Expenses', icon: Wallet },
      { to: '/app/reports', label: 'Reports', icon: BarChart3, keywords: 'profit loss analytics export' },
      { to: '/app/inquiries', label: 'Inquiries', icon: Inbox, keywords: 'messages contact', badge: 'inquiries' },
      { to: '/app/audit', label: 'Audit log', icon: ShieldCheck },
      { to: '/app/website', label: 'Website', icon: Globe, keywords: 'landing page content services hero faq gallery contact hours' },
      { to: '/app/settings', label: 'Settings', icon: Settings, keywords: 'business profile receipt backup password' },
    ],
  },
]

/** Quick actions for the command palette. */
export const QUICK_ACTIONS = [
  { to: '/app/pos', label: 'New sale', icon: ShoppingCart },
  { to: '/app/jobs/new', label: 'New job order', icon: Printer },
  { to: '/app/stock/in', label: 'Stock in', icon: PackagePlus },
  { to: '/app/stock/out', label: 'Stock out', icon: ScanLine },
  { to: '/app/stock/count', label: 'Physical count', icon: Repeat },
  { to: '/app/purchasing/orders/new', label: 'New purchase order', icon: ClipboardList },
  { to: '/app/inventory/categories', label: 'Categories', icon: FolderTree },
  { to: '/app/reports', label: 'End-of-day closing', icon: History, search: 'cash closing eod' },
]
