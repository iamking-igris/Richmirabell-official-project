import type { ApiUser } from "@/lib/backend";

export function postAuthDestination(
  user: Pick<ApiUser, "onboarding_complete"> & { role: string },
): "/admin" | "/studio" | "/start" {
  if (user.role === "ADMIN") return "/admin";
  return user.onboarding_complete ? "/studio" : "/start";
}
