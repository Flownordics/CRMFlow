import React from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCompany } from "@/services/companies";
import { useDeal } from "@/services/deals";
import { useQuote } from "@/services/quotes";
import { useOrder } from "@/services/orders";
import { usePerson } from "@/services/people";
import { Skeleton } from "@/components/ui/skeleton";

interface BreadcrumbItem {
  label: string | React.ReactNode;
  href?: string;
}

/**
 * Smart breadcrumb navigation component that dynamically generates breadcrumbs
 * based on the current route and entity relationships.
 * 
 * Examples:
 * - /companies/123 → Home > Companies > Company Name
 * - /companies/123/deals/456 → Home > Companies > Company Name > Deals > Deal #123
 * - /quotes/789 → Home > Quotes > Quote #789
 * - /people/123 → Home > People > Person Name
 */
export function BreadcrumbNavigation() {
  const location = useLocation();
  const params = useParams();

  // Skip breadcrumbs for certain routes
  const skipRoutes = ["/", "/login", "/register", "/forgot", "/settings"];
  if (skipRoutes.includes(location.pathname)) {
    return null;
  }

  const pathname = location.pathname;
  const pathSegments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items based on route
  const breadcrumbItems = buildBreadcrumbs(pathSegments, params);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Builds breadcrumb items based on route segments and params
 */
function buildBreadcrumbs(
  segments: string[],
  params: Record<string, string | undefined>
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Always start with Home
  items.push({ label: "Home", href: "/" });

  if (segments.length === 0) {
    return items;
  }

  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Handle entity detail pages
    if (segment === "companies" && segments[i + 1]) {
      const companyId = segments[i + 1];
      items.push({ label: "Companies", href: "/companies" });
      
      // Add company name if we have the ID
      if (companyId && companyId !== "new") {
        items.push({
          label: <CompanyName id={companyId} />,
          href: `/companies/${companyId}`,
        });
        i++; // Skip the ID segment
        continue;
      }
    } else if (segment === "people" && segments[i + 1]) {
      const personId = segments[i + 1];
      items.push({ label: "People", href: "/people" });
      
      if (personId && personId !== "new") {
        items.push({
          label: <PersonName id={personId} />,
          href: `/people/${personId}`,
        });
        i++;
        continue;
      }
    } else if (segment === "deals" && segments[i + 1]) {
      const dealId = segments[i + 1];
      items.push({ label: "Deals", href: "/deals" });
      
      if (dealId && dealId !== "new") {
        items.push({
          label: <DealName id={dealId} />,
          href: `/deals/${dealId}`,
        });
        i++;
        continue;
      }
    } else if (segment === "quotes" && segments[i + 1]) {
      const quoteId = segments[i + 1];
      items.push({ label: "Quotes", href: "/quotes" });
      
      if (quoteId && quoteId !== "new") {
        items.push({
          label: <QuoteName id={quoteId} />,
          href: `/quotes/${quoteId}`,
        });
        i++;
        continue;
      }
    } else if (segment === "orders" && segments[i + 1]) {
      const orderId = segments[i + 1];
      items.push({ label: "Orders", href: "/orders" });
      
      if (orderId && orderId !== "new") {
        items.push({
          label: <OrderName id={orderId} />,
          href: `/orders/${orderId}`,
        });
        i++;
        continue;
      }
    } else if (segment === "invoices" && segments[i + 1]) {
      const invoiceId = segments[i + 1];
      items.push({ label: "Invoices", href: "/invoices" });
      
      if (invoiceId && invoiceId !== "new") {
        items.push({
          label: `Invoice #${invoiceId.slice(0, 8)}`,
          href: `/invoices/${invoiceId}`,
        });
        i++;
        continue;
      }
    } else if (segment === "projects" && segments[i + 1]) {
      const projectId = segments[i + 1];
      items.push({ label: "Projects", href: "/projects" });
      
      if (projectId && projectId !== "new") {
        items.push({
          label: `Project #${projectId.slice(0, 8)}`,
          href: `/projects/${projectId}`,
        });
        i++;
        continue;
      }
    } else {
      // Handle list pages
      const routeLabels: Record<string, string> = {
        companies: "Companies",
        people: "People",
        deals: "Deals",
        quotes: "Quotes",
        orders: "Orders",
        invoices: "Invoices",
        projects: "Projects",
        calendar: "Calendar",
        accounting: "Accounting",
        analytics: "Analytics",
        settings: "Settings",
        "call-lists": "Call Lists",
      };

      if (routeLabels[segment]) {
        items.push({
          label: routeLabels[segment],
          href: currentPath,
        });
      }
    }
  }

  return items;
}

/**
 * Component to display company name with loading state
 */
function CompanyName({ id }: { id: string }) {
  const { data: company, isLoading } = useCompany(id);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  return <>{company?.name || `Company #${id.slice(0, 8)}`}</>;
}

/**
 * Component to display person name with loading state
 */
function PersonName({ id }: { id: string }) {
  const { data: person, isLoading } = usePerson(id);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!person) {
    return <>Person #${id.slice(0, 8)}</>;
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return <>{fullName || person.email || `Person #${id.slice(0, 8)}`}</>;
}

/**
 * Component to display deal name with loading state
 */
function DealName({ id }: { id: string }) {
  const { data: deal, isLoading } = useDeal(id);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!deal) {
    return <>Deal #${id.slice(0, 8)}</>;
  }

  // Try to get a meaningful name
  const name = deal.title || deal.name || `Deal #${id.slice(0, 8)}`;
  return <>{name}</>;
}

/**
 * Component to display quote name with loading state
 */
function QuoteName({ id }: { id: string }) {
  const { data: quote, isLoading } = useQuote(id);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!quote) {
    return <>Quote #${id.slice(0, 8)}</>;
  }

  const name = quote.number || `Quote #${id.slice(0, 8)}`;
  return <>{name}</>;
}


/**
 * Component to display order name with loading state
 */
function OrderName({ id }: { id: string }) {
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!order) {
    return <>Order #${id.slice(0, 8)}</>;
  }

  const name = order.number || `Order #${id.slice(0, 8)}`;
  return <>{name}</>;
}
