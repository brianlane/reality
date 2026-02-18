import { describe, it, expect } from "vitest";
import { getDemographicsRouteDecision } from "./demographics-routing";
import { APP_STATUS } from "@/lib/application-status";

describe("getDemographicsRouteDecision", () => {
  describe("recovery and error handling", () => {
    it("should reset session when 401 with invite context", () => {
      const result = getDemographicsRouteDecision({
        status: undefined,
        dashboardStatusCode: 401,
        hasInviteContext: true,
      });

      expect(result).toEqual({
        type: "reset_session_for_invite_recovery",
      });
    });

    it("should redirect to dashboard when 401 without invite context", () => {
      const result = getDemographicsRouteDecision({
        status: undefined,
        dashboardStatusCode: 401,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard on any 4xx/5xx error", () => {
      const errorCodes = [400, 403, 404, 500, 502];

      errorCodes.forEach((code) => {
        const result = getDemographicsRouteDecision({
          status: undefined,
          dashboardStatusCode: code,
          hasInviteContext: false,
        });

        expect(result).toEqual({
          type: "redirect",
          href: "/dashboard",
        });
      });
    });
  });

  describe("status-based routing", () => {
    it("should redirect to questionnaire when status is DRAFT", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.DRAFT,
        dashboardStatusCode: 200,
        hasInviteContext: true,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/apply/questionnaire",
      });
    });

    it("should redirect to payment when status is PAYMENT_PENDING", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.PAYMENT_PENDING,
        dashboardStatusCode: 200,
        hasInviteContext: true,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/apply/payment",
      });
    });

    it("should redirect to dashboard for SUBMITTED status", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.SUBMITTED,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for SCREENING_IN_PROGRESS status", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.SCREENING_IN_PROGRESS,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for APPROVED status", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.APPROVED,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for REJECTED status", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.REJECTED,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for WAITLIST status", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.WAITLIST,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for WAITLIST_INVITED status without invite context", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.WAITLIST_INVITED,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should reset session for WAITLIST_INVITED status with invite context", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.WAITLIST_INVITED,
        dashboardStatusCode: 200,
        hasInviteContext: true,
      });

      expect(result).toEqual({
        type: "reset_session_for_invite_recovery",
      });
    });

    it("should redirect to dashboard for research statuses", () => {
      const researchStatuses = [
        APP_STATUS.RESEARCH_INVITED,
        APP_STATUS.RESEARCH_IN_PROGRESS,
        APP_STATUS.RESEARCH_COMPLETED,
      ];

      researchStatuses.forEach((status) => {
        const result = getDemographicsRouteDecision({
          status,
          dashboardStatusCode: 200,
          hasInviteContext: false,
        });

        expect(result).toEqual({
          type: "redirect",
          href: "/dashboard",
        });
      });
    });

    it("should redirect to dashboard for unknown/undefined status", () => {
      const result = getDemographicsRouteDecision({
        status: undefined,
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });

    it("should redirect to dashboard for invalid status string", () => {
      const result = getDemographicsRouteDecision({
        status: "INVALID_STATUS",
        dashboardStatusCode: 200,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });
  });

  describe("priority of decision making", () => {
    it("should prioritize 401 recovery over status-based routing", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.DRAFT, // Would normally redirect to questionnaire
        dashboardStatusCode: 401,
        hasInviteContext: true,
      });

      expect(result).toEqual({
        type: "reset_session_for_invite_recovery",
      });
    });

    it("should prioritize error handling over status-based routing", () => {
      const result = getDemographicsRouteDecision({
        status: APP_STATUS.DRAFT,
        dashboardStatusCode: 500,
        hasInviteContext: false,
      });

      expect(result).toEqual({
        type: "redirect",
        href: "/dashboard",
      });
    });
  });
});
