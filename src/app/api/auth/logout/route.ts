import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";

// Stateless JWT — logout is client-side; optionally blacklist tokens here.
export const POST = withErrorHandling(async () => {
  return successResponse({ message: "Logged out successfully" });
});
