import { format, isValid } from "date-fns";

export const contactTypeColors: Record<string, string> = {
  decision_maker: "bg-destructive/20 text-destructive",
  buyer: "bg-primary/20 text-primary",
  operations: "bg-success/20 text-success",
  accounting: "bg-warning/20 text-warning",
  technical: "bg-chart-4/20 text-chart-4",
  general: "bg-muted text-muted-foreground",
};

export const contactTypeLabels: Record<string, string> = {
  decision_maker: "Decision Maker",
  buyer: "Buyer",
  operations: "Operations",
  accounting: "Accounting",
  technical: "Technical",
  general: "General",
};

export const stageColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  closed_won: "bg-success/20 text-success",
  closed_lost: "bg-destructive/20 text-destructive",
};

export const stageLabels: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  closed_won: "Won",
  closed_lost: "Lost",
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return isValid(date) ? format(date, "dd MMM yyyy") : "—";
  } catch {
    return "—";
  }
};
