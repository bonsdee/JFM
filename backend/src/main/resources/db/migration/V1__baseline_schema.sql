-- =====================================================================
-- JFM PrintHub — baseline schema
-- All money: NUMERIC(12,2). All quantities: NUMERIC(12,3).
-- All timestamps are timestamptz (stored UTC, reported in Asia/Manila).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Document number sequences ------------------------------------------------
CREATE SEQUENCE sku_seq START 1001;
CREATE SEQUENCE sale_no_seq START 1;
CREATE SEQUENCE po_no_seq START 1;
CREATE SEQUENCE job_no_seq START 1;
CREATE SEQUENCE service_code_seq START 101;

-- Categories ---------------------------------------------------------------
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    kind        VARCHAR(20)  NOT NULL DEFAULT 'PRODUCT' CHECK (kind IN ('PRODUCT', 'SERVICE')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Suppliers ----------------------------------------------------------------
CREATE TABLE suppliers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120),
    phone          VARCHAR(40),
    email          VARCHAR(150),
    address        TEXT,
    payment_terms  VARCHAR(80),
    notes          TEXT,
    archived       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_name ON suppliers (lower(name));

-- Products (retail items and materials) ------------------------------------
-- stock_on_hand is a cached balance maintained ONLY by StockService in the same
-- transaction as the stock_movements insert. v_product_stock recomputes it from
-- the ledger for reconciliation.
CREATE TABLE products (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku            VARCHAR(40)   NOT NULL UNIQUE,
    barcode        VARCHAR(64)   UNIQUE,
    name           VARCHAR(150)  NOT NULL,
    description    TEXT,
    category_id    UUID REFERENCES categories (id),
    unit           VARCHAR(20)   NOT NULL CHECK (unit IN ('PCS', 'REAM', 'ROLL', 'SQFT', 'ML', 'BOX', 'PACK')),
    cost_price     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- weighted average cost
    selling_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_on_hand  NUMERIC(12,3) NOT NULL DEFAULT 0,
    reorder_level  NUMERIC(12,3) NOT NULL DEFAULT 0,
    supplier_id    UUID REFERENCES suppliers (id),
    image_path     TEXT,
    location       VARCHAR(80),
    is_material    BOOLEAN       NOT NULL DEFAULT FALSE,
    archived       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_name ON products (lower(name));
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_supplier ON products (supplier_id);
CREATE INDEX idx_products_archived ON products (archived);

-- Customers ----------------------------------------------------------------
CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    phone         VARCHAR(40),
    email         VARCHAR(150),
    facebook_name VARCHAR(150),
    notes         TEXT,
    archived      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_name ON customers (lower(name));
CREATE INDEX idx_customers_phone ON customers (phone);

-- Stock ledger (single source of truth) -------------------------------------
-- quantity is a SIGNED delta: IN > 0, OUT < 0, ADJUST either sign.
CREATE TABLE stock_movements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID          NOT NULL REFERENCES products (id),
    movement_type  VARCHAR(10)   NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUST')),
    reason         VARCHAR(40)   NOT NULL CHECK (reason IN (
                        'PURCHASE_RECEIVED', 'SALE', 'SALE_VOID', 'JOB_CONSUMPTION', 'DAMAGED', 'EXPIRED',
                        'RETURN_FROM_CUSTOMER', 'RETURN_TO_SUPPLIER', 'MANUAL_ADJUSTMENT', 'PHYSICAL_COUNT', 'INITIAL')),
    quantity       NUMERIC(12,3) NOT NULL CHECK (quantity <> 0),
    unit_cost      NUMERIC(12,2),
    balance_after  NUMERIC(12,3) NOT NULL,
    reference_type VARCHAR(30),
    reference_id   UUID,
    reference_no   VARCHAR(40),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_movement_sign CHECK (
        (movement_type = 'IN' AND quantity > 0) OR
        (movement_type = 'OUT' AND quantity < 0) OR
        (movement_type = 'ADJUST'))
);
CREATE INDEX idx_movements_product_time ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_movements_time ON stock_movements (created_at DESC);
CREATE INDEX idx_movements_reference ON stock_movements (reference_type, reference_id);

CREATE VIEW v_product_stock AS
SELECT p.id                          AS product_id,
       COALESCE(SUM(m.quantity), 0)  AS ledger_quantity,
       p.stock_on_hand               AS cached_quantity
FROM products p
LEFT JOIN stock_movements m ON m.product_id = p.id
GROUP BY p.id, p.stock_on_hand;

-- Purchasing ---------------------------------------------------------------
CREATE TABLE purchase_orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number     VARCHAR(30)   NOT NULL UNIQUE,
    supplier_id   UUID          NOT NULL REFERENCES suppliers (id),
    status        VARCHAR(25)   NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    order_date    DATE,
    expected_date DATE,
    notes         TEXT,
    total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ordered_at    TIMESTAMPTZ,
    received_at   TIMESTAMPTZ,
    cancelled_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_po_status ON purchase_orders (status);
CREATE INDEX idx_po_created ON purchase_orders (created_at DESC);

CREATE TABLE purchase_order_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    product_id        UUID          NOT NULL REFERENCES products (id),
    qty_ordered       NUMERIC(12,3) NOT NULL CHECK (qty_ordered > 0),
    qty_received      NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    unit_cost         NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_po_received_le_ordered CHECK (qty_received <= qty_ordered)
);
CREATE INDEX idx_poi_po ON purchase_order_items (purchase_order_id);
CREATE INDEX idx_poi_product ON purchase_order_items (product_id);

CREATE TABLE supplier_payments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method            VARCHAR(20)   NOT NULL,
    reference_no      VARCHAR(60),
    notes             TEXT,
    paid_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_payments_po ON supplier_payments (purchase_order_id);

-- Services catalog ---------------------------------------------------------
CREATE TABLE services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(30)   NOT NULL UNIQUE,
    name              VARCHAR(120)  NOT NULL,
    slug              VARCHAR(120)  NOT NULL UNIQUE,
    category_id       UUID REFERENCES categories (id),
    description       TEXT,
    pricing_model     VARCHAR(20)   NOT NULL CHECK (pricing_model IN ('FIXED', 'PER_SQFT', 'PER_PIECE', 'PER_PAGE')),
    base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- FIXED price
    rate              NUMERIC(12,2) NOT NULL DEFAULT 0,  -- per sq ft / per batch / per B&W page
    color_rate        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- PER_PAGE colored
    long_surcharge    NUMERIC(12,2) NOT NULL DEFAULT 0,  -- PER_PAGE long/legal per page surcharge
    min_charge        NUMERIC(12,2) NOT NULL DEFAULT 0,
    pieces_per_batch  INTEGER       NOT NULL DEFAULT 1 CHECK (pieces_per_batch > 0),
    rush_fee_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    unit_label        VARCHAR(30),
    icon              VARCHAR(40),
    show_on_website   BOOLEAN       NOT NULL DEFAULT TRUE,
    active            BOOLEAN       NOT NULL DEFAULT TRUE,
    archived          BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order        INTEGER       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Bill of materials: material consumed per billable unit of the service.
CREATE TABLE service_materials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id   UUID          NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES products (id),
    qty_per_unit NUMERIC(12,3) NOT NULL CHECK (qty_per_unit > 0),
    notes        VARCHAR(200),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (service_id, product_id)
);

CREATE TABLE service_addons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id  UUID          NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    name        VARCHAR(100)  NOT NULL,
    charge_type VARCHAR(20)   NOT NULL CHECK (charge_type IN ('FIXED', 'PERCENT', 'PER_UNIT', 'PER_PIECE')),
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_addons_service ON service_addons (service_id);

-- Sales --------------------------------------------------------------------
CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number     VARCHAR(30)   NOT NULL UNIQUE,
    customer_id     UUID REFERENCES customers (id),
    job_order_id    UUID,
    source          VARCHAR(20)   NOT NULL DEFAULT 'POS' CHECK (source IN ('POS', 'JOB_ORDER')),
    status          VARCHAR(20)   NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'VOIDED')),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_type   VARCHAR(10)   CHECK (discount_type IN ('AMOUNT', 'PERCENT')),
    discount_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_tendered NUMERIC(12,2) NOT NULL DEFAULT 0,
    change_due      NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    sold_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    voided_at       TIMESTAMPTZ,
    void_reason     TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_sold_at ON sales (sold_at DESC);
CREATE INDEX idx_sales_customer ON sales (customer_id);
CREATE INDEX idx_sales_status ON sales (status);

CREATE TABLE sale_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id     UUID          NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    line_type   VARCHAR(10)   NOT NULL CHECK (line_type IN ('PRODUCT', 'SERVICE')),
    product_id  UUID REFERENCES products (id),
    service_id  UUID REFERENCES services (id),
    description VARCHAR(255)  NOT NULL,
    specs       JSONB,
    quantity    NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL,
    line_total  NUMERIC(12,2) NOT NULL,
    unit_cost   NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_sale_item_target CHECK (
        (line_type = 'PRODUCT' AND product_id IS NOT NULL AND service_id IS NULL) OR
        (line_type = 'SERVICE' AND service_id IS NOT NULL AND product_id IS NULL))
);
CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);
CREATE INDEX idx_sale_items_service ON sale_items (service_id);

-- Job orders ---------------------------------------------------------------
CREATE TABLE job_orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number         VARCHAR(30)   NOT NULL UNIQUE,
    customer_id        UUID REFERENCES customers (id),
    customer_name      VARCHAR(150),
    customer_phone     VARCHAR(40),
    status             VARCHAR(25)   NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                           'PENDING', 'DESIGNING', 'FOR_APPROVAL', 'PRINTING', 'READY_FOR_PICKUP', 'CLAIMED', 'CANCELLED')),
    due_at             TIMESTAMPTZ,
    notes              TEXT,
    subtotal           NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    total              NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid        NUMERIC(12,2) NOT NULL DEFAULT 0,
    materials_consumed BOOLEAN       NOT NULL DEFAULT FALSE,
    printed_at         TIMESTAMPTZ,
    claimed_at         TIMESTAMPTZ,
    cancelled_at       TIMESTAMPTZ,
    cancel_reason      TEXT,
    sale_id            UUID REFERENCES sales (id),
    board_position     INTEGER       NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_status ON job_orders (status);
CREATE INDEX idx_jobs_due ON job_orders (due_at);
CREATE INDEX idx_jobs_customer ON job_orders (customer_id);
ALTER TABLE sales ADD CONSTRAINT fk_sales_job FOREIGN KEY (job_order_id) REFERENCES job_orders (id);

CREATE TABLE job_order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id  UUID          NOT NULL REFERENCES job_orders (id) ON DELETE CASCADE,
    service_id    UUID          NOT NULL REFERENCES services (id),
    description   VARCHAR(255)  NOT NULL,
    specs         JSONB,
    quantity      NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12,2) NOT NULL,
    line_total    NUMERIC(12,2) NOT NULL,
    material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_items_job ON job_order_items (job_order_id);

CREATE TABLE job_order_files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID         NOT NULL REFERENCES job_orders (id) ON DELETE CASCADE,
    bucket       VARCHAR(60)  NOT NULL,
    path         TEXT         NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(120),
    size_bytes   BIGINT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_files_job ON job_order_files (job_order_id);

-- Payments (POS sales and job order down/balance payments) -----------------
CREATE TABLE payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id      UUID REFERENCES sales (id) ON DELETE CASCADE,
    job_order_id UUID REFERENCES job_orders (id) ON DELETE CASCADE,
    method       VARCHAR(20)   NOT NULL CHECK (method IN ('CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER')),
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference_no VARCHAR(60),
    notes        TEXT,
    voided       BOOLEAN       NOT NULL DEFAULT FALSE,
    paid_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_payment_target CHECK (sale_id IS NOT NULL OR job_order_id IS NOT NULL)
);
CREATE INDEX idx_payments_paid_at ON payments (paid_at DESC);
CREATE INDEX idx_payments_sale ON payments (sale_id);
CREATE INDEX idx_payments_job ON payments (job_order_id);

-- Expenses -----------------------------------------------------------------
CREATE TABLE expense_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id    UUID          NOT NULL REFERENCES expense_categories (id),
    description    VARCHAR(255)  NOT NULL,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date   DATE          NOT NULL,
    payment_method VARCHAR(20),
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_date ON expenses (expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses (category_id);

-- Inquiries (landing page contact form) ------------------------------------
CREATE TABLE inquiries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(120) NOT NULL,
    email            VARCHAR(150),
    phone            VARCHAR(40),
    subject          VARCHAR(150),
    service_interest VARCHAR(120),
    message          TEXT         NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'READ', 'REPLIED', 'ARCHIVED')),
    ip_address       VARCHAR(64),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_status ON inquiries (status, created_at DESC);

-- Notifications ------------------------------------------------------------
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type       VARCHAR(30)  NOT NULL,
    severity   VARCHAR(10)  NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'DANGER')),
    title      VARCHAR(150) NOT NULL,
    message    TEXT,
    link       VARCHAR(200),
    dedupe_key VARCHAR(120) UNIQUE,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_unread ON notifications (is_read, created_at DESC);

-- Audit log ----------------------------------------------------------------
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    VARCHAR(64),
    actor_email VARCHAR(150),
    action      VARCHAR(30)  NOT NULL,
    entity_type VARCHAR(40)  NOT NULL,
    entity_id   VARCHAR(64),
    summary     VARCHAR(255),
    details     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_time ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);

-- Settings (single row) ----------------------------------------------------
CREATE TABLE business_settings (
    id                    SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    business_name         VARCHAR(150)  NOT NULL DEFAULT 'JFM PrintHub',
    tagline               VARCHAR(200),
    logo_path             TEXT,
    address               TEXT,
    phone                 VARCHAR(40),
    email                 VARCHAR(150),
    tin                   VARCHAR(40),
    facebook_url          VARCHAR(255),
    receipt_header        TEXT,
    receipt_footer        TEXT,
    vat_enabled           BOOLEAN       NOT NULL DEFAULT FALSE,
    vat_rate              NUMERIC(5,2)  NOT NULL DEFAULT 12.00,
    vat_inclusive         BOOLEAN       NOT NULL DEFAULT TRUE,
    default_reorder_level NUMERIC(12,3) NOT NULL DEFAULT 10,
    allow_negative_stock  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Landing page content blocks ----------------------------------------------
CREATE TABLE site_content (
    content_key VARCHAR(50) PRIMARY KEY,
    content     JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security --------------------------------------------------------
-- RLS is ENABLED with NO policies: the Supabase anon/authenticated roles (used
-- by the browser's supabase-js client) can read nothing. Only the backend, which
-- connects as the table owner (postgres), can access data.
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
                                               AND tablename <> 'flyway_schema_history'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;
