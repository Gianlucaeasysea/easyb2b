export const crmQueryKeys = {
  organizations: {
    all: ["crm-organizations"] as const,
    detail: (id: string) => ["crm-org", id] as const,
    orders: (id: string) => ["crm-org-orders", id] as const,
    contacts: (id: string) => ["crm-org-contacts", id] as const,
    addresses: (id: string) => ["crm-org-addresses", id] as const,
    activities: (id: string) => ["crm-org-activities", id] as const,
    tasks: (id: string) => ["crm-org-tasks", id] as const,
    deals: (id: string) => ["crm-org-deals", id] as const,
    documents: (id: string) => ["crm-org-documents", id] as const,
    priceLists: (id: string) => ["crm-org-pricelists", id] as const,
  },
  leads: {
    all: ["crm-leads"] as const,
  },
  deals: {
    all: ["crm-deals"] as const,
  },
  tasks: {
    all: ["crm-tasks"] as const,
    overdueCount: ["crm-overdue-tasks-count"] as const,
  },
  shared: {
    allPriceLists: ["all-price-lists"] as const,
    priceListItemCounts: ["price-list-item-counts"] as const,
    discountTiers: ["discount-tiers"] as const,
    primaryContacts: ["crm-org-primary-contacts"] as const,
  },
};
