// ── Order Status ──────────────────────────────────────────────
export const ORDER_STATUSES = {
  draft: "Bozza",
  confirmed: "Confermato",
  processing: "In lavorazione",
  ready_to_ship: "Pronto per spedizione",
  shipped: "Spedito",
  delivered: "Consegnato",
  cancelled: "Annullato",
  returned: "Reso",
} as const;

/** @deprecated Use ORDER_STATUSES instead */
export const ORDER_STATUS_MAP = ORDER_STATUSES as Record<string, string>;

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  ready_to_ship: "bg-orange-100 text-orange-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-pink-100 text-pink-700",
};

// ── Payment Status ───────────────────────────────────────────
export const PAYMENT_STATUS_MAP: Record<string, string> = {
  unpaid: "Non pagato",
  pending: "In attesa",
  paid: "Pagato",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
};

// ── Chart Colors (hex for recharts) ──────────────────────────
export const ORDER_STATUS_CHART_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  confirmed: "#3b82f6",
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

// ── Helpers ──────────────────────────────────────────────────
export const getOrderStatusLabel = (dbStatus: string): string =>
  ORDER_STATUSES[dbStatus as keyof typeof ORDER_STATUSES] ?? dbStatus;

export const getOrderStatusColor = (dbStatus: string): string =>
  ORDER_STATUS_COLORS[dbStatus] ?? "bg-gray-100 text-gray-800";

export const getPaymentStatusLabel = (dbStatus: string): string =>
  PAYMENT_STATUS_MAP[dbStatus] ?? dbStatus;

export const getPaymentStatusColor = (dbStatus: string): string =>
  PAYMENT_STATUS_COLORS[dbStatus] ?? "bg-gray-100 text-gray-800";
