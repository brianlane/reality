import { describe, it, expect } from "vitest";
import {
  APP_STATUS,
  isResearchStatus,
  isDashboardRedirectStatus,
  isQuestionnaireAccessibleStatus,
} from "./application-status";

describe("Application Status Helpers", () => {
  describe("isResearchStatus", () => {
    it("should return true for RESEARCH_INVITED", () => {
      expect(isResearchStatus(APP_STATUS.RESEARCH_INVITED)).toBe(true);
    });

    it("should return true for RESEARCH_IN_PROGRESS", () => {
      expect(isResearchStatus(APP_STATUS.RESEARCH_IN_PROGRESS)).toBe(true);
    });

    it("should return true for RESEARCH_COMPLETED", () => {
      expect(isResearchStatus(APP_STATUS.RESEARCH_COMPLETED)).toBe(true);
    });

    it("should return false for non-research statuses", () => {
      const nonResearchStatuses = [
        APP_STATUS.DRAFT,
        APP_STATUS.SUBMITTED,
        APP_STATUS.PAYMENT_PENDING,
        APP_STATUS.SCREENING_IN_PROGRESS,
        APP_STATUS.APPROVED,
        APP_STATUS.REJECTED,
        APP_STATUS.WAITLIST,
        APP_STATUS.WAITLIST_INVITED,
      ];

      nonResearchStatuses.forEach((status) => {
        expect(isResearchStatus(status)).toBe(false);
      });
    });

    it("should return false for invalid status strings", () => {
      expect(isResearchStatus("INVALID_STATUS")).toBe(false);
      expect(isResearchStatus("")).toBe(false);
    });
  });

  describe("isDashboardRedirectStatus", () => {
    it("should return true for SUBMITTED", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.SUBMITTED)).toBe(true);
    });

    it("should return true for SCREENING_IN_PROGRESS", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.SCREENING_IN_PROGRESS)).toBe(
        true,
      );
    });

    it("should return true for APPROVED", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.APPROVED)).toBe(true);
    });

    it("should return true for REJECTED", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.REJECTED)).toBe(true);
    });

    it("should return true for WAITLIST", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.WAITLIST)).toBe(true);
    });

    it("should return false for WAITLIST_INVITED", () => {
      // WAITLIST_INVITED users should access questionnaire, not dashboard
      expect(isDashboardRedirectStatus(APP_STATUS.WAITLIST_INVITED)).toBe(false);
    });

    it("should return true for all research statuses", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.RESEARCH_INVITED)).toBe(true);
      expect(isDashboardRedirectStatus(APP_STATUS.RESEARCH_IN_PROGRESS)).toBe(
        true,
      );
      expect(isDashboardRedirectStatus(APP_STATUS.RESEARCH_COMPLETED)).toBe(
        true,
      );
    });

    it("should return false for DRAFT", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.DRAFT)).toBe(false);
    });

    it("should return false for PAYMENT_PENDING", () => {
      expect(isDashboardRedirectStatus(APP_STATUS.PAYMENT_PENDING)).toBe(false);
    });

    it("should return false for invalid status strings", () => {
      expect(isDashboardRedirectStatus("INVALID_STATUS")).toBe(false);
      expect(isDashboardRedirectStatus("")).toBe(false);
    });
  });

  describe("isQuestionnaireAccessibleStatus", () => {
    it("should return true for WAITLIST_INVITED", () => {
      expect(isQuestionnaireAccessibleStatus(APP_STATUS.WAITLIST_INVITED)).toBe(
        true,
      );
    });

    it("should return true for PAYMENT_PENDING", () => {
      expect(isQuestionnaireAccessibleStatus(APP_STATUS.PAYMENT_PENDING)).toBe(
        true,
      );
    });

    it("should return true for DRAFT", () => {
      expect(isQuestionnaireAccessibleStatus(APP_STATUS.DRAFT)).toBe(true);
    });

    it("should return false for non-accessible statuses", () => {
      const nonAccessibleStatuses = [
        APP_STATUS.SUBMITTED,
        APP_STATUS.SCREENING_IN_PROGRESS,
        APP_STATUS.APPROVED,
        APP_STATUS.REJECTED,
        APP_STATUS.WAITLIST,
        APP_STATUS.RESEARCH_INVITED,
        APP_STATUS.RESEARCH_IN_PROGRESS,
        APP_STATUS.RESEARCH_COMPLETED,
      ];

      nonAccessibleStatuses.forEach((status) => {
        expect(isQuestionnaireAccessibleStatus(status)).toBe(false);
      });
    });

    it("should return false for invalid status strings", () => {
      expect(isQuestionnaireAccessibleStatus("INVALID_STATUS")).toBe(false);
      expect(isQuestionnaireAccessibleStatus("")).toBe(false);
    });
  });

  describe("APP_STATUS constants", () => {
    it("should have all expected status values", () => {
      expect(APP_STATUS.DRAFT).toBe("DRAFT");
      expect(APP_STATUS.SUBMITTED).toBe("SUBMITTED");
      expect(APP_STATUS.PAYMENT_PENDING).toBe("PAYMENT_PENDING");
      expect(APP_STATUS.SCREENING_IN_PROGRESS).toBe("SCREENING_IN_PROGRESS");
      expect(APP_STATUS.APPROVED).toBe("APPROVED");
      expect(APP_STATUS.REJECTED).toBe("REJECTED");
      expect(APP_STATUS.WAITLIST).toBe("WAITLIST");
      expect(APP_STATUS.WAITLIST_INVITED).toBe("WAITLIST_INVITED");
      expect(APP_STATUS.RESEARCH_INVITED).toBe("RESEARCH_INVITED");
      expect(APP_STATUS.RESEARCH_IN_PROGRESS).toBe("RESEARCH_IN_PROGRESS");
      expect(APP_STATUS.RESEARCH_COMPLETED).toBe("RESEARCH_COMPLETED");
    });
  });
});
