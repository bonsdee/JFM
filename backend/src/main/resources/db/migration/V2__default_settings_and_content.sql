-- Default business settings, expense categories and landing page content.
-- These are required in every environment (dev and prod).

INSERT INTO business_settings (id, business_name, tagline, address, phone, email, facebook_url,
                               receipt_header, receipt_footer)
VALUES (1, 'JFM PrintHub', 'Print. Stock. Grow.',
        'Rizal St., Poblacion, Your City, Philippines', '0917 000 0000', 'hello@jfmprinthub.ph',
        'https://facebook.com/jfmprinthub',
        'JFM PrintHub' || chr(10) || 'Printing & Online Services',
        'Thank you! Please come again.' || chr(10) || 'This is not an official receipt.');

INSERT INTO expense_categories (name, description) VALUES
    ('Rent', 'Shop space rent'),
    ('Electricity', 'Meralco / electric bill'),
    ('Internet', 'Fiber / mobile data'),
    ('Wages', 'Staff salaries and allowances'),
    ('Maintenance', 'Printer servicing, repairs'),
    ('Miscellaneous', 'Other operating expenses');

INSERT INTO site_content (content_key, content) VALUES
('hero', '{
  "headline": "Print. Stock. Grow.",
  "subtext": "Same-day tarpaulin, stickers, documents and ID photos — plus e-loading, bills payment and online application help, all in one friendly shop.",
  "primaryCta": "View Services",
  "secondaryCta": "Get a Quote"
}'),
('stats', '[
  {"label": "Tarps printed", "value": 5000, "suffix": "+"},
  {"label": "Happy customers", "value": 3200, "suffix": "+"},
  {"label": "Services offered", "value": 10, "suffix": "+"},
  {"label": "Same-day printing", "value": 1, "suffix": "", "display": "Same-day"}
]'),
('howItWorks', '[
  {"title": "Send your design", "description": "Message us on Facebook or drop by with your file on a flash drive."},
  {"title": "Approve the proof", "description": "We send a layout preview. Request changes until it is perfect."},
  {"title": "We print", "description": "High-resolution eco-solvent and laser printing, done in-house."},
  {"title": "Pick up", "description": "Get a text when it is ready. Pay the balance and claim your order."}
]'),
('faq', '[
  {"q": "How fast can you print a tarpaulin?", "a": "Most tarps are ready the same day if ordered before 2 PM. Rush orders are available for a small fee."},
  {"q": "What file formats do you accept?", "a": "PDF, PNG, JPG, AI and PSD. For best results, send high-resolution files at actual size."},
  {"q": "Do you offer layout or design services?", "a": "Yes. Our in-house designer can create your layout for a minimal design fee."},
  {"q": "Do I need to pay a downpayment?", "a": "For job orders, a 50% downpayment is required. Walk-in printing and photocopy are paid upon release."},
  {"q": "What payment methods do you accept?", "a": "Cash, GCash, Maya and bank transfer."}
]'),
('gallery', '[]'),
('marquee', '["Tarpaulin", "Stickers", "Business Cards", "ID Photos", "Lamination", "Photocopy", "Invitations", "T-shirt Print", "E-loading", "Bills Payment"]'),
('contact', '{
  "address": "Rizal St., Poblacion, Your City, Philippines",
  "phone": "0917 000 0000",
  "email": "hello@jfmprinthub.ph",
  "facebook": "https://facebook.com/jfmprinthub",
  "hours": [
    {"days": "Mon – Sat", "time": "8:00 AM – 7:00 PM"},
    {"days": "Sunday", "time": "9:00 AM – 3:00 PM"}
  ],
  "mapEmbedUrl": "https://www.google.com/maps?q=14.5995,120.9842&z=15&output=embed"
}');
