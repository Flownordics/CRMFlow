-- =========================================
-- Email Templates System
-- =========================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('quote', 'order', 'invoice', 'general')),
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  is_default boolean DEFAULT false,
  variables jsonb DEFAULT '[]'::jsonb, -- Available variables for this template
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (type, name)
);

-- Create trigger for updated_at
CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view templates"
ON public.email_templates
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow authenticated users to create templates"
ON public.email_templates
FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow users to update templates"
ON public.email_templates
FOR UPDATE
USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow users to delete templates"
ON public.email_templates
FOR DELETE
USING ((SELECT auth.role()) = 'authenticated');

-- Create indexes
CREATE INDEX idx_email_templates_type ON public.email_templates(type);
CREATE INDEX idx_email_templates_default ON public.email_templates(type, is_default) WHERE is_default = true;

-- Insert default templates
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, is_default, variables)
VALUES 
(
  'Default Quote Template',
  'quote',
  'Quote {{quote_number}} from {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Quote {{quote_number}}</h2>
    <p>Dear {{customer_name}},</p>
    <p>Thank you for your interest. Please find your quote attached to this email.</p>
    {{#if custom_message}}
    <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4A90E2;">
      {{custom_message}}
    </div>
    {{/if}}
    <p>Quote Details:</p>
    <ul>
      <li><strong>Quote Number:</strong> {{quote_number}}</li>
      <li><strong>Total Amount:</strong> {{total_amount}} {{currency}}</li>
      <li><strong>Valid Until:</strong> {{valid_until}}</li>
    </ul>
    <p>If you have any questions or would like to proceed with this quote, please don''t hesitate to contact us.</p>
    <p>Best regards,<br>
    {{sender_name}}<br>
    {{company_name}}</p>
  </div>',
  'Quote {{quote_number}}

Dear {{customer_name}},

Thank you for your interest. Please find your quote attached to this email.

{{custom_message}}

Quote Details:
- Quote Number: {{quote_number}}
- Total Amount: {{total_amount}} {{currency}}
- Valid Until: {{valid_until}}

If you have any questions or would like to proceed with this quote, please don''t hesitate to contact us.

Best regards,
{{sender_name}}
{{company_name}}',
  true,
  '["quote_number", "customer_name", "company_name", "total_amount", "currency", "valid_until", "sender_name", "custom_message"]'::jsonb
),
(
  'Default Order Template',
  'order',
  'Order Confirmation {{order_number}} from {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Order Confirmation</h2>
    <p>Dear {{customer_name}},</p>
    <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
    {{#if custom_message}}
    <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4A90E2;">
      {{custom_message}}
    </div>
    {{/if}}
    <p>Order Details:</p>
    <ul>
      <li><strong>Order Number:</strong> {{order_number}}</li>
      <li><strong>Order Date:</strong> {{order_date}}</li>
      <li><strong>Total Amount:</strong> {{total_amount}} {{currency}}</li>
    </ul>
    <p>You will receive another email once your order has been shipped.</p>
    <p>Best regards,<br>
    {{sender_name}}<br>
    {{company_name}}</p>
  </div>',
  'Order Confirmation

Dear {{customer_name}},

Thank you for your order! Your order has been confirmed and is being processed.

{{custom_message}}

Order Details:
- Order Number: {{order_number}}
- Order Date: {{order_date}}
- Total Amount: {{total_amount}} {{currency}}

You will receive another email once your order has been shipped.

Best regards,
{{sender_name}}
{{company_name}}',
  true,
  '["order_number", "customer_name", "company_name", "order_date", "total_amount", "currency", "sender_name", "custom_message"]'::jsonb
),
(
  'Default Invoice Template',
  'invoice',
  'Invoice {{invoice_number}} from {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Invoice {{invoice_number}}</h2>
    <p>Dear {{customer_name}},</p>
    <p>Please find your invoice attached to this email.</p>
    {{#if custom_message}}
    <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4A90E2;">
      {{custom_message}}
    </div>
    {{/if}}
    <p>Invoice Details:</p>
    <ul>
      <li><strong>Invoice Number:</strong> {{invoice_number}}</li>
      <li><strong>Invoice Date:</strong> {{invoice_date}}</li>
      <li><strong>Due Date:</strong> {{due_date}}</li>
      <li><strong>Amount Due:</strong> {{total_amount}} {{currency}}</li>
    </ul>
    <p>Payment can be made via bank transfer or credit card. Please reference the invoice number in your payment.</p>
    <p>Thank you for your business!</p>
    <p>Best regards,<br>
    {{sender_name}}<br>
    {{company_name}}</p>
  </div>',
  'Invoice {{invoice_number}}

Dear {{customer_name}},

Please find your invoice attached to this email.

{{custom_message}}

Invoice Details:
- Invoice Number: {{invoice_number}}
- Invoice Date: {{invoice_date}}
- Due Date: {{due_date}}
- Amount Due: {{total_amount}} {{currency}}

Payment can be made via bank transfer or credit card. Please reference the invoice number in your payment.

Thank you for your business!

Best regards,
{{sender_name}}
{{company_name}}',
  true,
  '["invoice_number", "customer_name", "company_name", "invoice_date", "due_date", "total_amount", "currency", "sender_name", "custom_message"]'::jsonb
);

-- Comments
COMMENT ON TABLE public.email_templates IS 'Email templates for quotes, orders, and invoices';
COMMENT ON COLUMN public.email_templates.type IS 'Type of template: quote, order, invoice, or general';
COMMENT ON COLUMN public.email_templates.subject IS 'Email subject line with variable placeholders';
COMMENT ON COLUMN public.email_templates.body_html IS 'HTML version of email body';
COMMENT ON COLUMN public.email_templates.body_text IS 'Plain text version of email body';
COMMENT ON COLUMN public.email_templates.is_default IS 'Whether this is the default template for its type';
COMMENT ON COLUMN public.email_templates.variables IS 'JSON array of available variables for this template';

