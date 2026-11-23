package com.jfmprinthub.service;

/**
 * <ul>
 *   <li>FIXED — basePrice × quantity (e.g. ID photo package)</li>
 *   <li>PER_SQFT — max(width × height × rate, minCharge) × quantity (tarpaulin)</li>
 *   <li>PER_PIECE — ceil(quantity / piecesPerBatch) × rate, at least minCharge (stickers, business cards per 100)</li>
 *   <li>PER_PAGE — pages × quantity × (B&amp;W or color rate + long surcharge), at least minCharge</li>
 * </ul>
 */
public enum PricingModel {
    FIXED, PER_SQFT, PER_PIECE, PER_PAGE
}
