// ── Order Status ──────────────────────────────────────────────
export const ORDER_STATUSES = {
  draft: "Draft",
  submitted: "Submitted",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
} as const;

/** @deprecated Use ORDER_STATUSES instead */
export const ORDER_STATUS_MAP = ORDER_STATUSES as Record<string, string>;

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  processing: "bg-yellow-100 text-yellow-700",
  ready_to_ship: "bg-orange-100 text-orange-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-pink-100 text-pink-700",
};

// ── Payment Status ───────────────────────────────────────────
export const PAYMENT_STATUSES = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
} as const;

/** @deprecated Use PAYMENT_STATUSES instead */
export const PAYMENT_STATUS_MAP = PAYMENT_STATUSES as Record<string, string>;

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

// ── Chart Colors (hex for recharts) ──────────────────────────
export const ORDER_STATUS_CHART_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  submitted: "#3b82f6",
  confirmed: "#10b981",
  processing: "#f59e0b",
  ready_to_ship: "#f97316",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  returned: "#ec4899",
};

// ── Client Status ────────────────────────────────────────────
export const CLIENT_STATUS_COLORS: Record<string, string> = {
  lead: "bg-primary/20 text-primary",
  qualifying: "bg-warning/20 text-warning",
  onboarding: "bg-chart-4/20 text-chart-4",
  active: "bg-success/20 text-success",
  at_risk: "bg-destructive/20 text-destructive",
  churned: "bg-muted text-muted-foreground",
  disqualified: "bg-muted text-muted-foreground",
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  qualifying: "Qualifying",
  onboarding: "Onboarding",
  active: "Active",
  at_risk: "At Risk",
  churned: "Churned",
  disqualified: "Disqualified",
};

export const getClientStatusColor = (status: string): string =>
  CLIENT_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";

export const getClientStatusLabel = (status: string): string =>
  CLIENT_STATUS_LABELS[status] ?? status;

// ── Order Status Transitions ─────────────────────────────────
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function getAvailableTransitions(currentStatus: string): string[] {
  return VALID_ORDER_TRANSITIONS[currentStatus] || [];
}

export function canTransitionTo(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

// ── Helpers ──────────────────────────────────────────────────
export const getOrderStatusLabel = (dbStatus: string): string =>
  ORDER_STATUSES[dbStatus as keyof typeof ORDER_STATUSES] ?? dbStatus;

export const getOrderStatusColor = (dbStatus: string): string =>
  ORDER_STATUS_COLORS[dbStatus] ?? "bg-gray-100 text-gray-800";

export const getPaymentStatusLabel = (dbStatus: string): string =>
  PAYMENT_STATUS_MAP[dbStatus] ?? dbStatus;

export const getPaymentStatusColor = (dbStatus: string): string =>
  PAYMENT_STATUS_COLORS[dbStatus] ?? "bg-gray-100 text-gray-800";
