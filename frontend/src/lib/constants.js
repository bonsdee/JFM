/** Shared enums and display metadata (labels + badge tones). */

export const UNITS = ['PCS', 'REAM', 'ROLL', 'SQFT', 'ML', 'BOX', 'PACK']
export const UNIT_LABEL = { PCS: 'pcs', REAM: 'ream', ROLL: 'roll', SQFT: 'sq ft', ML: 'ml', BOX: 'box', PACK: 'pack' }

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
]
export const PAYMENT_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]))

export const STOCK_STATUS = {
  IN_STOCK: { label: 'In stock', tone: 'success' },
  LOW: { label: 'Low', tone: 'warning' },
  OUT: { label: 'Out of stock', tone: 'danger' },
}

export const JOB_STATUSES = ['PENDING', 'DESIGNING', 'FOR_APPROVAL', 'PRINTING', 'READY_FOR_PICKUP', 'CLAIMED', 'CANCELLED']
export const JOB_STATUS = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  DESIGNING: { label: 'Designing', tone: 'violet' },
  FOR_APPROVAL: { label: 'For approval', tone: 'warning' },
  PRINTING: { label: 'Printing', tone: 'primary' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'accent' },
  CLAIMED: { label: 'Claimed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
}

export const PO_STATUS = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ORDERED: { label: 'Ordered', tone: 'primary' },
  PARTIALLY_RECEIVED: { label: 'Partially received', tone: 'warning' },
  RECEIVED: { label: 'Received', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
}

export const MOVEMENT_REASONS = {
  PURCHASE_RECEIVED: 'Purchase received',
  SALE: 'Sale',
  SALE_VOID: 'Sale voided',
  JOB_CONSUMPTION: 'Job consumption',
  DAMAGED: 'Damaged',
  EXPIRED: 'Expired',
  RETURN_FROM_CUSTOMER: 'Customer return',
  RETURN_TO_SUPPLIER: 'Return to supplier',
  MANUAL_ADJUSTMENT: 'Manual adjustment',
  PHYSICAL_COUNT: 'Physical count',
  INITIAL: 'Opening balance',
}
export const MANUAL_IN_REASONS = ['PURCHASE_RECEIVED', 'RETURN_FROM_CUSTOMER', 'MANUAL_ADJUSTMENT', 'INITIAL']
export const MANUAL_OUT_REASONS = ['DAMAGED', 'EXPIRED', 'RETURN_TO_SUPPLIER', 'JOB_CONSUMPTION', 'MANUAL_ADJUSTMENT']

export const PRICING_MODELS = {
  FIXED: { label: 'Fixed price', hint: 'One price per package' },
  PER_SQFT: { label: 'Per sq ft', hint: 'Width × height × rate (e.g. tarpaulin)' },
  PER_PIECE: { label: 'Per piece / batch', hint: 'Rate per batch of N pieces (e.g. 100 business cards)' },
  PER_PAGE: { label: 'Per page', hint: 'B&W / colored page rate, long paper surcharge' },
}

export const ADDON_TYPES = {
  FIXED: 'Flat fee',
  PERCENT: '% of base price',
  PER_UNIT: 'Per sq ft / page',
  PER_PIECE: 'Per piece (e.g. eyelets)',
}

export const SERVICE_ICONS = ['Image', 'Sticker', 'FileText', 'Copy', 'Layers', 'Camera', 'CreditCard', 'Mail', 'Shirt', 'Globe', 'Printer', 'Scissors']
