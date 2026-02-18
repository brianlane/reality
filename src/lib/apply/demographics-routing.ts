import {
  APP_STATUS,
  DEMOGRAPHICS_TO_DASHBOARD_STATUSES,
  type AppStatus,
} from "@/lib/application-status";

export type DemographicsRouteDecision =
  | { type: "allow_demographics" }
  | { type: "redirect"; href: string }
  | { type: "reset_session_for_invite_recovery" };

export function getDemographicsRouteDecision(params: {
  status?: string;
  dashboardStatusCode: number;
  hasInviteContext: boolean;
}): DemographicsRouteDecision {
  const { status, dashboardStatusCode, hasInviteContext } = params;

  if (dashboardStatusCode === 401 && hasInviteContext) {
    return { type: "reset_session_for_invite_recovery" };
  }

  if (dashboardStatusCode >= 400) {
    return { type: "redirect", href: "/dashboard" };
  }

  if (status === APP_STATUS.DRAFT) {
    return { type: "redirect", href: "/apply/questionnaire" };
  }

  if (status === APP_STATUS.PAYMENT_PENDING) {
    return { type: "redirect", href: "/apply/payment" };
  }

  if (status === APP_STATUS.WAITLIST_INVITED) {
    // Authenticated waitlist-invited users should continue to questionnaire
    return { type: "redirect", href: "/apply/questionnaire" };
  }

  if (DEMOGRAPHICS_TO_DASHBOARD_STATUSES.includes(status as AppStatus)) {
    return { type: "redirect", href: "/dashboard" };
  }

  return { type: "redirect", href: "/dashboard" };
}
