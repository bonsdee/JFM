-- Removes ALL business data (the dev sample data and anything entered while testing).
-- Keeps: business_settings, site_content (landing page text), expense_categories.
-- Run once in Supabase → SQL Editor. This cannot be undone.

begin;

truncate table
  payments, sale_items, sales,
  job_order_files, job_order_items, job_orders,
  supplier_payments, purchase_order_items, purchase_orders,
  stock_movements,
  service_materials, service_addons, services,
  products, categories, suppliers, customers,
  expenses, inquiries, notifications, audit_logs;

-- Start document numbers fresh (S-000001, JO-00001, PO-00001, PRD-1001, SVC-101)
alter sequence sku_seq restart with 1001;
alter sequence sale_no_seq restart with 1;
alter sequence po_no_seq restart with 1;
alter sequence job_no_seq restart with 1;
alter sequence service_code_seq restart with 101;

-- Forget that the demo seed migration ran, so the backend starts without it.
delete from flyway_schema_history where version = '2.1';

commit;
