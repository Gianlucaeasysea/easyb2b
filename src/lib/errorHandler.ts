import { toast } from "sonner";

/**
 * Extracts a user-friendly message from any error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Errore sconosciuto";
}

/**
 * Centralized error handler — logs context + shows toast.
 *
 * @param error  The caught error (any type)
 * @param context  A short label like "AdminOrders.bulkUpdate"
 */
export function showErrorToast(error: unknown, context: string): void {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, message);
  toast.error(message);
}
