-- =====================================================================
-- DEV SEED DATA (only loaded by the "dev" profile — see application-dev.yml)
-- Creates categories, 3 suppliers, 15 products, 10 services (with BOM and
-- add-ons), customers, POs, job orders, expenses, inquiries and ~60 days of
-- sales. Every stock change goes through seed_move() which writes a ledger
-- row, so stock_on_hand always equals SUM(stock_movements.quantity).
-- =====================================================================

SELECT setseed(0.42);

-- Ledger helper mirroring StockService.post() (dropped at the end) ----------
CREATE OR REPLACE FUNCTION seed_move(p_product UUID, p_type TEXT, p_reason TEXT, p_qty NUMERIC,
                                     p_cost NUMERIC, p_ref_type TEXT, p_ref_id UUID, p_ref_no TEXT,
                                     p_at TIMESTAMPTZ) RETURNS NUMERIC AS $$
DECLARE
    old_qty  NUMERIC;
    old_cost NUMERIC;
    new_bal  NUMERIC;
BEGIN
    SELECT stock_on_hand, cost_price INTO old_qty, old_cost FROM products WHERE id = p_product FOR UPDATE;
    new_bal := old_qty + p_qty;
    IF p_qty > 0 AND p_cost IS NOT NULL THEN
        UPDATE products
           SET cost_price = CASE WHEN old_qty <= 0 THEN p_cost
                                 ELSE round((old_qty * old_cost + p_qty * p_cost) / (old_qty + p_qty), 2) END
         WHERE id = p_product;
    END IF;
    UPDATE products SET stock_on_hand = new_bal WHERE id = p_product;
    INSERT INTO stock_movements (product_id, movement_type, reason, quantity, unit_cost, balance_after,
                                 reference_type, reference_id, reference_no, created_at)
    VALUES (p_product, p_type, p_reason, p_qty, COALESCE(p_cost, old_cost), new_bal,
            p_ref_type, p_ref_id, p_ref_no, p_at);
    RETURN COALESCE(p_cost, old_cost);
END $$ LANGUAGE plpgsql;

DO $$
DECLARE
    -- categories
    c_mat UUID; c_paper UUID; c_school UUID; c_office UUID; c_acc UUID; c_svc_print UUID; c_svc_online UUID;
    -- suppliers
    s_print UUID; s_ink UUID; s_depot UUID;
    -- materials
    p_tarp UUID; p_eco UUID; p_stk UUID; p_lam UUID; p_bond UUID; p_dye UUID; p_card UUID; p_photo UUID;
    -- retail
    p_ream UUID; p_pen UUID; p_nb UUID; p_env UUID; p_folder UUID; p_tape UUID; p_usb UUID;
    retail UUID[];
    -- services
    sv_tarp UUID; sv_stk UUID; sv_doc UUID; sv_copy UUID; sv_lam UUID; sv_id UUID; sv_bc UUID;
    sv_inv UUID; sv_tee UUID; sv_online UUID;
    -- customers
    custs UUID[] := ARRAY[]::UUID[];
    cid UUID;
    -- loop vars
    start_ts TIMESTAMPTZ := (date_trunc('day', now() AT TIME ZONE 'Asia/Manila') - interval '60 days') AT TIME ZONE 'Asia/Manila';
    day_start TIMESTAMPTZ;
    sold TIMESTAMPTZ;
    d INT; i INT; j INT; n INT; lines INT;
    r DOUBLE PRECISION;
    v_sale UUID; v_sale_no TEXT;
    v_sub NUMERIC; v_cost NUMERIC;
    v_prod UUID; v_qty NUMERIC; v_price NUMERIC; v_stock NUMERIC; v_name TEXT; v_ucost NUMERIC;
    v_pages INT; v_w INT; v_h INT; v_area NUMERIC; v_line NUMERIC; v_mcost NUMERIC;
    v_method TEXT;
    v_po UUID; v_po_no TEXT;
    v_job UUID; v_job_no TEXT;
    m_start DATE;
BEGIN
    -- Categories ------------------------------------------------------------
    INSERT INTO categories (name, kind, description) VALUES ('Printing Materials', 'PRODUCT', 'Consumables used by services') RETURNING id INTO c_mat;
    INSERT INTO categories (name, kind, description) VALUES ('Paper Products', 'PRODUCT', 'Bond paper, folders, envelopes') RETURNING id INTO c_paper;
    INSERT INTO categories (name, kind, description) VALUES ('School Supplies', 'PRODUCT', 'Notebooks, pens and more') RETURNING id INTO c_school;
    INSERT INTO categories (name, kind, description) VALUES ('Office Supplies', 'PRODUCT', 'Desk and filing essentials') RETURNING id INTO c_office;
    INSERT INTO categories (name, kind, description) VALUES ('Accessories', 'PRODUCT', 'Gadgets and accessories') RETURNING id INTO c_acc;
    INSERT INTO categories (name, kind, description) VALUES ('Printing Services', 'SERVICE', 'All print jobs') RETURNING id INTO c_svc_print;
    INSERT INTO categories (name, kind, description) VALUES ('Online Services', 'SERVICE', 'E-loading, bills, applications') RETURNING id INTO c_svc_online;

    -- Suppliers -------------------------------------------------------------
    INSERT INTO suppliers (name, contact_person, phone, email, address, payment_terms)
    VALUES ('Manila Print Supply Co.', 'Ramon Dizon', '0917 111 2233', 'sales@manilaprintsupply.ph', 'Recto Ave., Manila', 'Net 30')
    RETURNING id INTO s_print;
    INSERT INTO suppliers (name, contact_person, phone, email, address, payment_terms)
    VALUES ('InkWorld Trading', 'Grace Lim', '0918 222 3344', 'orders@inkworld.ph', 'Banawe St., Quezon City', 'COD')
    RETURNING id INTO s_ink;
    INSERT INTO suppliers (name, contact_person, phone, email, address, payment_terms)
    VALUES ('National School & Office Depot', 'Joy Santos', '0919 333 4455', 'b2b@nsodepot.ph', 'Divisoria, Manila', 'Net 15')
    RETURNING id INTO s_depot;

    -- Products: materials ---------------------------------------------------
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1001', 'Tarpaulin Material 13oz', c_mat, 'SQFT', 0, 0, 400, s_print, 'Back room – Rack A', TRUE) RETURNING id INTO p_tarp;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1002', 'Eco-solvent Ink (CMYK)', c_mat, 'ML', 0, 0, 1000, s_ink, 'Printer station', TRUE) RETURNING id INTO p_eco;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1003', 'Sticker Paper A4 Glossy', c_mat, 'PCS', 0, 0, 50, s_print, 'Shelf B2', TRUE) RETURNING id INTO p_stk;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1004', 'Lamination Film (ID/A4)', c_mat, 'PCS', 0, 0, 80, s_print, 'Shelf B3', TRUE) RETURNING id INTO p_lam;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1005', 'Bond Paper Sheet (Short/A4)', c_mat, 'PCS', 0, 0, 2000, s_depot, 'Copier station', TRUE) RETURNING id INTO p_bond;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1006', 'Printer Dye Ink', c_mat, 'ML', 0, 0, 500, s_ink, 'Printer station', TRUE) RETURNING id INTO p_dye;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1007', 'Cardstock 220gsm', c_mat, 'PCS', 0, 0, 100, s_print, 'Shelf B1', TRUE) RETURNING id INTO p_card;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location, is_material)
    VALUES ('MAT-1008', 'Photo Paper 4R', c_mat, 'PCS', 0, 0, 30, s_print, 'Shelf B1', TRUE) RETURNING id INTO p_photo;

    -- Products: retail ------------------------------------------------------
    INSERT INTO products (sku, barcode, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1009', '4800016644504', 'Bond Paper A4 70gsm (Ream)', c_paper, 'REAM', 0, 260, 10, s_depot, 'Front shelf 1') RETURNING id INTO p_ream;
    INSERT INTO products (sku, barcode, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1010', '4806502169001', 'Ballpen Black 0.5', c_school, 'PCS', 0, 10, 40, s_depot, 'Counter') RETURNING id INTO p_pen;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1011', 'Notebook 80 Leaves', c_school, 'PCS', 0, 28, 30, s_depot, 'Front shelf 2') RETURNING id INTO p_nb;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1012', 'Long Brown Envelope', c_office, 'PCS', 0, 6, 50, s_depot, 'Front shelf 3') RETURNING id INTO p_env;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1013', 'Clear Plastic Folder (Long)', c_office, 'PCS', 0, 15, 30, s_depot, 'Front shelf 3') RETURNING id INTO p_folder;
    INSERT INTO products (sku, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1014', 'Correction Tape', c_school, 'PCS', 0, 35, 15, s_depot, 'Counter') RETURNING id INTO p_tape;
    INSERT INTO products (sku, barcode, name, category_id, unit, cost_price, selling_price, reorder_level, supplier_id, location)
    VALUES ('PRD-1015', '0619659161347', 'USB Flash Drive 32GB', c_acc, 'PCS', 0, 280, 5, s_depot, 'Glass display') RETURNING id INTO p_usb;
    PERFORM setval('sku_seq', 1016, false);

    retail := ARRAY[p_ream, p_pen, p_nb, p_env, p_folder, p_tape, p_usb, p_pen, p_env, p_nb];

    -- Opening balances (INITIAL movements) -----------------------------------
    PERFORM seed_move(p_tarp,  'IN', 'INITIAL', 3600, 6.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_eco,   'IN', 'INITIAL', 13000, 1.20, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_stk,   'IN', 'INITIAL', 400,  8.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_lam,   'IN', 'INITIAL', 450,  2.50, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_bond,  'IN', 'INITIAL', 17000, 0.40, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_dye,   'IN', 'INITIAL', 3200, 0.80, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_card,  'IN', 'INITIAL', 600,  3.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_photo, 'IN', 'INITIAL', 110,  5.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_ream,  'IN', 'INITIAL', 170,  210,  NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_pen,   'IN', 'INITIAL', 600,  6.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_nb,    'IN', 'INITIAL', 380,  18.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_env,   'IN', 'INITIAL', 600,  3.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_folder,'IN', 'INITIAL', 180,  8.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_tape,  'IN', 'INITIAL', 150,  22.00, NULL, NULL, NULL, start_ts - interval '1 day');
    PERFORM seed_move(p_usb,   'IN', 'INITIAL', 126,  180.00, NULL, NULL, NULL, start_ts - interval '1 day');

    -- Services --------------------------------------------------------------
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, min_charge, rush_fee_percent, unit_label, icon, sort_order)
    VALUES ('SVC-101', 'Tarpaulin Printing', 'tarpaulin', c_svc_print, 'Vibrant eco-solvent tarps for events, business signage and birthdays.',
            'PER_SQFT', 15.00, 150.00, 25, 'per sq ft', 'Image', 1) RETURNING id INTO sv_tarp;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, pieces_per_batch, rush_fee_percent, unit_label, icon, sort_order)
    VALUES ('SVC-102', 'Sticker Printing', 'stickers', c_svc_print, 'Glossy and matte stickers, labels and decals — kiss-cut available.',
            'PER_PIECE', 35.00, 1, 20, 'per A4 sheet', 'Sticker', 2) RETURNING id INTO sv_stk;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, color_rate, long_surcharge, unit_label, icon, sort_order)
    VALUES ('SVC-103', 'Document Printing', 'documents', c_svc_print, 'Laser-sharp B&W and full-color printing for school and office.',
            'PER_PAGE', 3.00, 10.00, 1.00, 'per page', 'FileText', 3) RETURNING id INTO sv_doc;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, color_rate, long_surcharge, unit_label, icon, sort_order)
    VALUES ('SVC-104', 'Photocopy', 'photocopy', c_svc_print, 'Fast and clean photocopies — short, A4 and long bond.',
            'PER_PAGE', 2.00, 8.00, 0.50, 'per page', 'Copy', 4) RETURNING id INTO sv_copy;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, pieces_per_batch, unit_label, icon, sort_order)
    VALUES ('SVC-105', 'Lamination', 'lamination', c_svc_print, 'Protect IDs, certificates and documents with hot lamination.',
            'PER_PIECE', 20.00, 1, 'per piece', 'Layers', 5) RETURNING id INTO sv_lam;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, base_price, unit_label, icon, sort_order)
    VALUES ('SVC-106', 'ID Photo Package', 'id-photo', c_svc_print, '1x1 and 2x2 ID photos with formal attire editing in minutes.',
            'FIXED', 80.00, 'per package', 'Camera', 6) RETURNING id INTO sv_id;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, pieces_per_batch, min_charge, rush_fee_percent, unit_label, icon, sort_order)
    VALUES ('SVC-107', 'Business Cards', 'business-cards', c_svc_print, 'Premium 220gsm cards, matte or glossy, per 100 pieces.',
            'PER_PIECE', 350.00, 100, 350, 20, 'per 100 pcs', 'CreditCard', 7) RETURNING id INTO sv_bc;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, pieces_per_batch, min_charge, unit_label, icon, sort_order)
    VALUES ('SVC-108', 'Invitations', 'invitations', c_svc_print, 'Wedding, debut, christening and birthday invitations.',
            'PER_PIECE', 25.00, 1, 250, 'per piece', 'Mail', 8) RETURNING id INTO sv_inv;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, rate, pieces_per_batch, unit_label, icon, sort_order)
    VALUES ('SVC-109', 'T-shirt Printing', 't-shirt', c_svc_print, 'Heat-transfer vinyl and sublimation prints for teams and events.',
            'PER_PIECE', 250.00, 1, 'per shirt', 'Shirt', 9) RETURNING id INTO sv_tee;
    INSERT INTO services (code, name, slug, category_id, description, pricing_model, base_price, unit_label, icon, sort_order)
    VALUES ('SVC-110', 'Online Services', 'online-services', c_svc_online, 'E-loading, bills payment, and online application assistance (PSA, NBI, passport).',
            'FIXED', 50.00, 'service fee', 'Globe', 10) RETURNING id INTO sv_online;
    PERFORM setval('service_code_seq', 111, false);

    -- Bill of materials -----------------------------------------------------
    INSERT INTO service_materials (service_id, product_id, qty_per_unit, notes) VALUES
        (sv_tarp, p_tarp, 1, '1 sq ft of tarp per sq ft printed'),
        (sv_tarp, p_eco, 3, '~3 ml ink per sq ft'),
        (sv_stk, p_stk, 1, '1 sheet per sheet printed'),
        (sv_stk, p_dye, 2, '~2 ml ink per sheet'),
        (sv_doc, p_bond, 1, '1 sheet per page'),
        (sv_doc, p_dye, 0.5, '~0.5 ml ink per page'),
        (sv_copy, p_bond, 1, '1 sheet per page'),
        (sv_lam, p_lam, 1, '1 film per piece'),
        (sv_id, p_photo, 1, '1 sheet 4R per package'),
        (sv_bc, p_card, 0.1, '10 cards per sheet'),
        (sv_inv, p_card, 1, '1 sheet per invitation'),
        (sv_inv, p_dye, 1, '~1 ml ink per invitation');

    -- Add-ons ---------------------------------------------------------------
    INSERT INTO service_addons (service_id, name, charge_type, amount) VALUES
        (sv_tarp, 'Eyelets / grommets (each)', 'PER_PIECE', 5.00),
        (sv_tarp, 'Layout / design fee', 'FIXED', 100.00),
        (sv_stk, 'Matte lamination (per sheet)', 'PER_UNIT', 10.00),
        (sv_stk, 'Kiss-cut', 'PERCENT', 15.00),
        (sv_doc, 'Lamination (per page)', 'PER_UNIT', 20.00),
        (sv_bc, 'Layout / design fee', 'FIXED', 150.00),
        (sv_bc, 'Matte lamination', 'PERCENT', 20.00),
        (sv_inv, 'Layout / design fee', 'FIXED', 200.00),
        (sv_inv, 'Envelope (each)', 'PER_PIECE', 5.00),
        (sv_tee, 'Back print', 'PER_PIECE', 120.00);

    -- Customers -------------------------------------------------------------
    INSERT INTO customers (name, phone, facebook_name, notes) VALUES ('Maria Santos', '0917 555 0101', 'Maria Santos', 'Regular — barangay events') RETURNING id INTO cid; custs := custs || cid;
    INSERT INTO customers (name, phone, facebook_name) VALUES ('Juan Dela Cruz', '0918 555 0102', 'Juan DC') RETURNING id INTO cid; custs := custs || cid;
    INSERT INTO customers (name, phone, facebook_name, notes) VALUES ('St. Joseph Academy', '0919 555 0103', 'SJA Official', 'School — bulk printing') RETURNING id INTO cid; custs := custs || cid;
    INSERT INTO customers (name, phone, facebook_name) VALUES ('Ana Reyes', '0920 555 0104', 'Ana Reyes') RETURNING id INTO cid; custs := custs || cid;
    INSERT INTO customers (name, phone, facebook_name, notes) VALUES ('Kape Kanto Café', '0921 555 0105', 'Kape Kanto', 'Menu boards, stickers') RETURNING id INTO cid; custs := custs || cid;
    INSERT INTO customers (name, phone, facebook_name) VALUES ('Paolo Garcia', '0922 555 0106', 'Pao Garcia') RETURNING id INTO cid; custs := custs || cid;

    -- 60 days of sales (plus today up to the current time) -------------------
    FOR d IN 0..60 LOOP
        day_start := start_ts + make_interval(days => d);

        -- Mid-period restock: received PO on day 30
        IF d = 30 THEN
            v_po := gen_random_uuid();
            v_po_no := 'PO-' || lpad(nextval('po_no_seq')::TEXT, 5, '0');
            INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, total_amount, amount_paid,
                                         ordered_at, received_at, created_at, updated_at, notes)
            VALUES (v_po, v_po_no, s_print, 'RECEIVED', (day_start - interval '3 days')::DATE, 7840.00, 5000.00,
                    day_start - interval '3 days', day_start + interval '9 hours', day_start - interval '3 days',
                    day_start + interval '9 hours', 'Monthly material restock');
            INSERT INTO purchase_order_items (purchase_order_id, product_id, qty_ordered, qty_received, unit_cost) VALUES
                (v_po, p_tarp, 1000, 1000, 6.20),
                (v_po, p_lam, 200, 200, 2.60),
                (v_po, p_stk, 100, 100, 8.20);
            UPDATE purchase_orders SET total_amount = 1000 * 6.20 + 200 * 2.60 + 100 * 8.20 WHERE id = v_po;
            PERFORM seed_move(p_tarp, 'IN', 'PURCHASE_RECEIVED', 1000, 6.20, 'PURCHASE_ORDER', v_po, v_po_no, day_start + interval '9 hours');
            PERFORM seed_move(p_lam, 'IN', 'PURCHASE_RECEIVED', 200, 2.60, 'PURCHASE_ORDER', v_po, v_po_no, day_start + interval '9 hours');
            PERFORM seed_move(p_stk, 'IN', 'PURCHASE_RECEIVED', 100, 8.20, 'PURCHASE_ORDER', v_po, v_po_no, day_start + interval '9 hours');
            INSERT INTO supplier_payments (purchase_order_id, amount, method, paid_at, notes)
            VALUES (v_po, 5000.00, 'BANK_TRANSFER', day_start + interval '10 hours', 'Partial payment');
        END IF;

        n := 9 + floor(random() * 10)::INT;  -- 9..18 sales per day
        FOR i IN 1..n LOOP
            sold := day_start + interval '8 hours' + random() * interval '10 hours';
            IF sold > now() THEN CONTINUE; END IF;
            v_sale := gen_random_uuid();
            v_sale_no := 'S-' || lpad(nextval('sale_no_seq')::TEXT, 6, '0');
            INSERT INTO sales (id, sale_number, customer_id, source, status, sold_at, created_at, updated_at)
            VALUES (v_sale, v_sale_no,
                    CASE WHEN random() < 0.15 THEN custs[1 + floor(random() * array_length(custs, 1))::INT] END,
                    'POS', 'COMPLETED', sold, sold, sold);
            v_sub := 0; v_cost := 0;
            lines := 1 + floor(random() * 3)::INT;

            FOR j IN 1..lines LOOP
                r := random();
                IF r < 0.38 THEN
                    -- Retail product
                    v_prod := retail[1 + floor(random() * array_length(retail, 1))::INT];
                    v_qty := 1 + floor(random() * 3);
                    SELECT selling_price, stock_on_hand, name INTO v_price, v_stock, v_name FROM products WHERE id = v_prod;
                    IF v_stock >= v_qty THEN
                        v_ucost := seed_move(v_prod, 'OUT', 'SALE', -v_qty, NULL, 'SALE', v_sale, v_sale_no, sold);
                        INSERT INTO sale_items (sale_id, line_type, product_id, description, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                        VALUES (v_sale, 'PRODUCT', v_prod, v_name, v_qty, v_price, v_price * v_qty, v_ucost, round(v_ucost * v_qty, 2), sold, sold);
                        v_sub := v_sub + v_price * v_qty;
                        v_cost := v_cost + round(v_ucost * v_qty, 2);
                    END IF;
                ELSIF r < 0.62 THEN
                    -- Photocopy B&W
                    v_pages := 5 + floor(random() * 46)::INT;
                    v_line := v_pages * 2.00;
                    v_mcost := round(seed_move(p_bond, 'OUT', 'SALE', -v_pages, NULL, 'SALE', v_sale, v_sale_no, sold) * v_pages, 2);
                    INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                    VALUES (v_sale, 'SERVICE', sv_copy, 'Photocopy — ' || v_pages || ' pages (B&W, short)',
                            jsonb_build_object('pages', v_pages, 'colored', false, 'paperSize', 'SHORT', 'quantity', 1),
                            1, v_line, v_line, v_mcost, v_mcost, sold, sold);
                    v_sub := v_sub + v_line; v_cost := v_cost + v_mcost;
                ELSIF r < 0.76 THEN
                    -- Colored document printing
                    v_pages := 1 + floor(random() * 20)::INT;
                    v_line := v_pages * 10.00;
                    v_mcost := round(seed_move(p_bond, 'OUT', 'SALE', -v_pages, NULL, 'SALE', v_sale, v_sale_no, sold) * v_pages, 2);
                    v_mcost := v_mcost + round(seed_move(p_dye, 'OUT', 'SALE', -(v_pages * 0.5), NULL, 'SALE', v_sale, v_sale_no, sold) * v_pages * 0.5, 2);
                    INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                    VALUES (v_sale, 'SERVICE', sv_doc, 'Document Printing — ' || v_pages || ' pages (colored, A4)',
                            jsonb_build_object('pages', v_pages, 'colored', true, 'paperSize', 'A4', 'quantity', 1),
                            1, v_line, v_line, v_mcost, v_mcost, sold, sold);
                    v_sub := v_sub + v_line; v_cost := v_cost + v_mcost;
                ELSIF r < 0.87 THEN
                    -- Tarpaulin
                    v_w := (ARRAY[2, 3, 3, 4])[1 + floor(random() * 4)::INT];
                    v_h := (ARRAY[3, 4, 5, 6, 8])[1 + floor(random() * 5)::INT];
                    v_area := v_w * v_h;
                    v_line := GREATEST(v_area * 15.00, 150.00);
                    v_mcost := round(seed_move(p_tarp, 'OUT', 'SALE', -v_area, NULL, 'SALE', v_sale, v_sale_no, sold) * v_area, 2);
                    v_mcost := v_mcost + round(seed_move(p_eco, 'OUT', 'SALE', -(v_area * 3), NULL, 'SALE', v_sale, v_sale_no, sold) * v_area * 3, 2);
                    INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                    VALUES (v_sale, 'SERVICE', sv_tarp, 'Tarpaulin ' || v_w || 'x' || v_h || ' ft',
                            jsonb_build_object('widthFt', v_w, 'heightFt', v_h, 'quantity', 1, 'rush', false),
                            1, v_line, v_line, v_mcost, v_mcost, sold, sold);
                    v_sub := v_sub + v_line; v_cost := v_cost + v_mcost;
                ELSIF r < 0.94 THEN
                    -- Lamination
                    v_qty := 1 + floor(random() * 4);
                    IF (SELECT stock_on_hand FROM products WHERE id = p_lam) >= v_qty THEN
                        v_line := v_qty * 20.00;
                        v_mcost := round(seed_move(p_lam, 'OUT', 'SALE', -v_qty, NULL, 'SALE', v_sale, v_sale_no, sold) * v_qty, 2);
                        INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                        VALUES (v_sale, 'SERVICE', sv_lam, 'Lamination', jsonb_build_object('quantity', v_qty),
                                v_qty, 20.00, v_line, round(v_mcost / v_qty, 2), v_mcost, sold, sold);
                        v_sub := v_sub + v_line; v_cost := v_cost + v_mcost;
                    END IF;
                ELSIF r < 0.97 THEN
                    -- ID photo
                    IF (SELECT stock_on_hand FROM products WHERE id = p_photo) >= 1 THEN
                        v_mcost := round(seed_move(p_photo, 'OUT', 'SALE', -1, NULL, 'SALE', v_sale, v_sale_no, sold), 2);
                        INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                        VALUES (v_sale, 'SERVICE', sv_id, 'ID Photo Package', jsonb_build_object('quantity', 1),
                                1, 80.00, 80.00, v_mcost, v_mcost, sold, sold);
                        v_sub := v_sub + 80.00; v_cost := v_cost + v_mcost;
                    END IF;
                ELSE
                    -- Stickers
                    v_qty := 1 + floor(random() * 8);
                    IF (SELECT stock_on_hand FROM products WHERE id = p_stk) >= v_qty THEN
                        v_line := v_qty * 35.00;
                        v_mcost := round(seed_move(p_stk, 'OUT', 'SALE', -v_qty, NULL, 'SALE', v_sale, v_sale_no, sold) * v_qty, 2);
                        v_mcost := v_mcost + round(seed_move(p_dye, 'OUT', 'SALE', -(v_qty * 2), NULL, 'SALE', v_sale, v_sale_no, sold) * v_qty * 2, 2);
                        INSERT INTO sale_items (sale_id, line_type, service_id, description, specs, quantity, unit_price, line_total, unit_cost, cost_total, created_at, updated_at)
                        VALUES (v_sale, 'SERVICE', sv_stk, 'Sticker Printing (A4 glossy)', jsonb_build_object('quantity', v_qty),
                                v_qty, 35.00, v_line, round(v_mcost / v_qty, 2), v_mcost, sold, sold);
                        v_sub := v_sub + v_line; v_cost := v_cost + v_mcost;
                    END IF;
                END IF;
            END LOOP;

            IF v_sub = 0 THEN
                DELETE FROM sales WHERE id = v_sale;
                CONTINUE;
            END IF;

            r := random();
            v_method := CASE WHEN r < 0.58 THEN 'CASH' WHEN r < 0.88 THEN 'GCASH' WHEN r < 0.96 THEN 'MAYA' ELSE 'BANK_TRANSFER' END;
            UPDATE sales
               SET subtotal = v_sub, total = v_sub, cost_total = v_cost,
                   amount_tendered = CASE WHEN v_method = 'CASH' THEN ceil(v_sub / 50.0) * 50 ELSE v_sub END,
                   change_due = CASE WHEN v_method = 'CASH' THEN ceil(v_sub / 50.0) * 50 - v_sub ELSE 0 END
             WHERE id = v_sale;
            INSERT INTO payments (sale_id, method, amount, paid_at, created_at, updated_at)
            VALUES (v_sale, v_method, v_sub, sold, sold, sold);
        END LOOP;
    END LOOP;

    -- Open purchase orders --------------------------------------------------
    v_po := gen_random_uuid();
    v_po_no := 'PO-' || lpad(nextval('po_no_seq')::TEXT, 5, '0');
    INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, expected_date, total_amount, ordered_at, notes)
    VALUES (v_po, v_po_no, s_ink, 'ORDERED', current_date - 2, current_date + 3, 0, now() - interval '2 days', 'Ink restock');
    INSERT INTO purchase_order_items (purchase_order_id, product_id, qty_ordered, unit_cost) VALUES
        (v_po, p_eco, 4000, 1.25), (v_po, p_dye, 2000, 0.85);
    UPDATE purchase_orders SET total_amount = 4000 * 1.25 + 2000 * 0.85 WHERE id = v_po;

    v_po := gen_random_uuid();
    v_po_no := 'PO-' || lpad(nextval('po_no_seq')::TEXT, 5, '0');
    INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, total_amount, notes)
    VALUES (v_po, v_po_no, s_depot, 'DRAFT', current_date, 0, 'School opening stock-up');
    INSERT INTO purchase_order_items (purchase_order_id, product_id, qty_ordered, unit_cost) VALUES
        (v_po, p_nb, 100, 17.50), (v_po, p_pen, 200, 5.80), (v_po, p_usb, 10, 175.00);
    UPDATE purchase_orders SET total_amount = 100 * 17.50 + 200 * 5.80 + 10 * 175.00 WHERE id = v_po;

    -- Job orders across the pipeline -----------------------------------------
    -- 1) Pending, overdue
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid, notes, created_at)
    VALUES (v_job, v_job_no, custs[1], 'Maria Santos', '0917 555 0101', 'PENDING', now() - interval '1 day', 540, 540, 270,
            'Barangay fiesta tarp, use provided logo', now() - interval '3 days');
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total)
    VALUES (v_job, sv_tarp, 'Tarpaulin 4x8 ft + 8 eyelets', '{"widthFt":4,"heightFt":8,"quantity":1,"rush":false}', 1, 540, 540);
    INSERT INTO payments (job_order_id, method, amount, paid_at, notes) VALUES (v_job, 'GCASH', 270, now() - interval '3 days', 'Downpayment');

    -- 2) Designing
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid, notes)
    VALUES (v_job, v_job_no, custs[5], 'Kape Kanto Café', '0921 555 0105', 'DESIGNING', now() + interval '2 days', 1240, 1240, 600,
            'Logo stickers 2in round, brown/cream palette');
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total)
    VALUES (v_job, sv_stk, 'Sticker Printing — round logo, kiss-cut', '{"quantity":20}', 20, 62, 1240);
    INSERT INTO payments (job_order_id, method, amount, paid_at, notes) VALUES (v_job, 'CASH', 600, now() - interval '1 day', 'Downpayment');

    -- 3) For approval
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid, notes)
    VALUES (v_job, v_job_no, custs[4], 'Ana Reyes', '0920 555 0104', 'FOR_APPROVAL', now() + interval '5 days', 3200, 3200, 1600,
            'Debut invitations, gold foil look, 120 pcs');
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total)
    VALUES (v_job, sv_inv, 'Debut invitations (with envelope) + layout', '{"quantity":120}', 120, 26.67, 3200);
    INSERT INTO payments (job_order_id, method, amount, paid_at, notes) VALUES (v_job, 'GCASH', 1600, now() - interval '2 days', 'Downpayment');

    -- 4) Printing, due today
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid, notes)
    VALUES (v_job, v_job_no, custs[3], 'St. Joseph Academy', '0919 555 0103', 'PRINTING', now() + interval '6 hours', 1050, 1050, 500,
            'Recognition day tarp');
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total)
    VALUES (v_job, sv_tarp, 'Tarpaulin 5x14 ft', '{"widthFt":5,"heightFt":14,"quantity":1,"rush":false}', 1, 1050, 1050);
    INSERT INTO payments (job_order_id, method, amount, paid_at, notes) VALUES (v_job, 'BANK_TRANSFER', 500, now() - interval '1 day', 'Downpayment');

    -- 5) Ready for pickup — materials already consumed
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid,
                            materials_consumed, printed_at, notes)
    VALUES (v_job, v_job_no, custs[2], 'Juan Dela Cruz', '0918 555 0102', 'READY_FOR_PICKUP', now() + interval '1 day', 350, 350, 200,
            TRUE, now() - interval '2 hours', 'Business cards, matte');
    v_mcost := round(seed_move(p_card, 'OUT', 'JOB_CONSUMPTION', -10, NULL, 'JOB_ORDER', v_job, v_job_no, now() - interval '2 hours') * 10, 2);
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total, material_cost)
    VALUES (v_job, sv_bc, 'Business Cards — 100 pcs', '{"quantity":100}', 100, 3.50, 350, v_mcost);
    INSERT INTO payments (job_order_id, method, amount, paid_at, notes) VALUES (v_job, 'CASH', 200, now() - interval '2 days', 'Downpayment');

    -- 6) Pending, due in 3 days
    v_job := gen_random_uuid(); v_job_no := 'JO-' || lpad(nextval('job_no_seq')::TEXT, 5, '0');
    INSERT INTO job_orders (id, job_number, customer_id, customer_name, customer_phone, status, due_at, subtotal, total, amount_paid, notes)
    VALUES (v_job, v_job_no, custs[6], 'Paolo Garcia', '0922 555 0106', 'PENDING', now() + interval '3 days', 1000, 1000, 0,
            'Basketball team shirts, front print only');
    INSERT INTO job_order_items (job_order_id, service_id, description, specs, quantity, unit_price, line_total)
    VALUES (v_job, sv_tee, 'T-shirt print (front)', '{"quantity":4}', 4, 250, 1000);

    -- Expenses (monthly) ----------------------------------------------------
    FOR m_start IN SELECT generate_series(date_trunc('month', start_ts)::DATE, current_date, interval '1 month')::DATE LOOP
        INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
        SELECT id, 'Monthly shop rent', 8000, m_start, 'CASH' FROM expense_categories WHERE name = 'Rent';
        INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
        SELECT id, 'Electric bill', round((3200 + random() * 900)::NUMERIC, 2), LEAST(m_start + 14, current_date), 'GCASH' FROM expense_categories WHERE name = 'Electricity';
        INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
        SELECT id, 'Fiber internet plan', 1699, LEAST(m_start + 9, current_date), 'GCASH' FROM expense_categories WHERE name = 'Internet';
        INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
        SELECT id, 'Staff wage (1st half)', 6500, LEAST(m_start + 14, current_date), 'CASH' FROM expense_categories WHERE name = 'Wages';
        IF m_start + 27 <= current_date THEN
            INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
            SELECT id, 'Staff wage (2nd half)', 6500, m_start + 27, 'CASH' FROM expense_categories WHERE name = 'Wages';
        END IF;
    END LOOP;
    INSERT INTO expenses (category_id, description, amount, expense_date, payment_method)
    SELECT id, 'Printer head cleaning service', 1500, current_date - 20, 'CASH' FROM expense_categories WHERE name = 'Maintenance';

    -- Inquiries -------------------------------------------------------------
    INSERT INTO inquiries (name, email, phone, subject, service_interest, message, status, created_at) VALUES
        ('Liza Mendoza', 'liza.m@example.com', '0917 888 1111', 'Tarp for birthday', 'Tarpaulin Printing',
         'Hi! How much for a 3x5 tarp for my son''s 7th birthday? Need it by Saturday.', 'NEW', now() - interval '3 hours'),
        ('Barangay San Isidro', 'brgy.sanisidro@example.com', '0918 888 2222', 'Bulk printing quote', 'Document Printing',
         'We need 500 copies of a 4-page newsletter, colored. Please send a quotation.', 'READ', now() - interval '1 day'),
        ('Carlo Tan', NULL, '0919 888 3333', 'Business cards', 'Business Cards',
         'Do you have same-day business cards? 200 pcs.', 'REPLIED', now() - interval '4 days');
END $$;

DROP FUNCTION seed_move(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TIMESTAMPTZ);
