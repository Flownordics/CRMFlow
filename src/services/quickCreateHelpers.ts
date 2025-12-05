/**
 * Helper functions for quickly creating quotes and orders with minimal data
 * and navigating directly to the editor instead of using modals.
 * 
 * This provides better UX for complex forms with line items.
 */

import { createQuote } from "./quotes";
import { createOrder } from "./orders";
import { createDealWithStage } from "./dealCreationHelpers";
import { logger } from "@/lib/logger";
import { addDays } from "date-fns";

/**
 * Creates a minimal quote and navigates to the editor
 */
export async function quickCreateQuoteAndNavigate(
  companyId: string,
  navigate: (path: string) => void,
  contactId?: string,
  dealId?: string
): Promise<void> {
  try {
    // If no dealId, create a deal first
    let finalDealId = dealId;
    if (!finalDealId) {
      const deal = await createDealWithStage(
        companyId,
        "Proposal",
        contactId,
        `Quote for company`
      );
      finalDealId = deal.id;
    }

    // Create minimal quote with default values
    const issueDate = new Date().toISOString();
    const validUntil = addDays(new Date(), 30).toISOString();

    const quote = await createQuote({
      status: "draft",
      currency: "DKK",
      issue_date: issueDate,
      valid_until: validUntil,
      notes: "",
      company_id: companyId,
      contact_id: contactId || null,
      deal_id: finalDealId || null,
      subtotal_minor: 0,
      tax_minor: 0,
      total_minor: 0,
      lines: [
        {
          description: "Item",
          qty: 1,
          unit_minor: 0,
          tax_rate_pct: 25,
          discount_pct: 0,
        },
      ],
    });

    // Navigate to editor
    navigate(`/quotes/${quote.id}`);
  } catch (error) {
    logger.error("Failed to quick create quote:", error);
    throw error;
  }
}

/**
 * Creates a minimal order and navigates to the editor
 */
export async function quickCreateOrderAndNavigate(
  companyId: string,
  navigate: (path: string) => void,
  contactId?: string,
  dealId?: string
): Promise<void> {
  try {
    // If no dealId, create a deal first
    let finalDealId = dealId;
    if (!finalDealId) {
      const deal = await createDealWithStage(
        companyId,
        "Negotiation",
        contactId,
        `Order for company`
      );
      finalDealId = deal.id;
    }

    // Create minimal order with default values
    const orderDate = new Date().toISOString();

    const order = await createOrder({
      status: "draft",
      currency: "DKK",
      order_date: orderDate,
      notes: "",
      company_id: companyId,
      contact_id: contactId || null,
      deal_id: finalDealId || null,
      quote_id: null,
      subtotal_minor: 0,
      tax_minor: 0,
      total_minor: 0,
      lines: [
        {
          description: "Item",
          qty: 1,
          unit_minor: 0,
          tax_rate_pct: 25,
          discount_pct: 0,
        },
      ],
    });

    // Navigate to editor
    navigate(`/orders/${order.id}`);
  } catch (error) {
    logger.error("Failed to quick create order:", error);
    throw error;
  }
}
