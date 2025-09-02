-- Insert test data for companies and people
-- This will help test the search functionality

-- Insert test companies
INSERT INTO public.companies (id, name, email, phone, address, city, country, industry, website, domain, vat, created_by, created_at, updated_at)
VALUES 
  ('test-company-1', 'Acme Corporation', 'info@acme.com', '+1-555-0123', '123 Business St', 'New York', 'USA', 'Technology', 'https://acme.com', 'acme.com', 'US123456789', auth.uid(), NOW(), NOW()),
  ('test-company-2', 'TechStart Inc', 'hello@techstart.com', '+1-555-0456', '456 Innovation Ave', 'San Francisco', 'USA', 'Software', 'https://techstart.com', 'techstart.com', 'US987654321', auth.uid(), NOW(), NOW()),
  ('test-company-3', 'Global Solutions Ltd', 'contact@globalsolutions.com', '+44-20-7946-0958', '789 Enterprise Rd', 'London', 'UK', 'Consulting', 'https://globalsolutions.com', 'globalsolutions.com', 'GB123456789', auth.uid(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test people
INSERT INTO public.people (id, first_name, last_name, email, phone, title, company_id, created_by, created_at, updated_at)
VALUES 
  ('test-person-1', 'John', 'Smith', 'john.smith@acme.com', '+1-555-0001', 'CEO', 'test-company-1', auth.uid(), NOW(), NOW()),
  ('test-person-2', 'Sarah', 'Johnson', 'sarah.johnson@techstart.com', '+1-555-0002', 'CTO', 'test-company-2', auth.uid(), NOW(), NOW()),
  ('test-person-3', 'Michael', 'Brown', 'michael.brown@globalsolutions.com', '+44-20-7946-0003', 'Managing Director', 'test-company-3', auth.uid(), NOW(), NOW()),
  ('test-person-4', 'Emily', 'Davis', 'emily.davis@acme.com', '+1-555-0004', 'VP of Sales', 'test-company-1', auth.uid(), NOW(), NOW()),
  ('test-person-5', 'Andreas', 'Nielsen', 'andreas@example.com', '+45-12345678', 'Developer', 'test-company-1', auth.uid(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
