import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

/**
 * Centralized error handler — logs context + shows user-friendly toast.
 * Never exposes technical details to the user.
 */
export function showErrorToast(error: unknown, context: string): void {
  logger.error(context, "Error occurred", error);

  let userMessage: string;

  if (error instanceof Error) {
    if (error.message.includes("JWT") || error.message.includes("token")) {
      userMessage = ERROR_MESSAGES.AUTH_SESSION_EXPIRED;
    } else if (error.message.includes("network") || error.message.includes("fetch") || error.message.includes("Failed to fetch")) {
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error.message.includes("permission") || error.message.includes("authorized")) {
      userMessage = ERROR_MESSAGES.AUTH_UNAUTHORIZED;
    } else {
      userMessage = ERROR_MESSAGES.GENERIC_ERROR;
    }
  } else {
    userMessage = ERROR_MESSAGES.GENERIC_ERROR;
  }

  toast.error(userMessage);
}
