"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type Overview = {
  applicants: { total: number; approvalRate: number; waitlist: number };
  events: { total: number; upcoming: number };
  revenue: { total: number };
};

type Funnel = {
  applications: {
    draft: number;
    submitted: number;
    screening: number;
    approved: number;
    rejected: number;
    waitlist: number;
  };
  invitations: { sent: number; accepted: number; attended: number };
};

type EventsSummary = {
  totals: {
    events: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  attendance: { avgAttendanceRate: number; avgNoShowRate: number };
  financials: {
    expectedRevenue: number;
    actualRevenue: number;
    totalCost: number;
    profit: number;
  };
};

type MatchesSummary = {
  overall: { totalMatches: number };
  outcomes: { distribution: Record<string, number> };
};

type RevenueSummary = {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, { count: number; amount: number }>;
};

type EngagementSummary = {
  applicants: { newLast30Days: number; activeLast30Days: number };
  invitations: { avgResponseHours: number; repeatParticipants: number };
};

export default function AdminAnalyticsSummary() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [events, setEvents] = useState<EventsSummary | null>(null);
  const [matches, setMatches] = useState<MatchesSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const responses = await Promise.all([
          fetch("/api/admin/analytics/overview", {
            headers,
            signal: controller.signal,
          }),
          fetch("/api/admin/analytics/funnel", {
            headers,
            signal: controller.signal,
          }),
          fetch("/api/admin/analytics/events", {
            headers,
            signal: controller.signal,
          }),
          fetch("/api/admin/analytics/matches", {
            headers,
            signal: controller.signal,
          }),
          fetch("/api/admin/analytics/revenue", {
            headers,
            signal: controller.signal,
          }),
          fetch("/api/admin/analytics/engagement", {
            headers,
            signal: controller.signal,
          }),
        ]);

        const json = await Promise.all(responses.map((res) => res.json()));
        const hasError = responses.some(
          (res, index) => !res.ok || json[index]?.error,
        );
        if (hasError) {
          setError("Failed to load analytics.");
          return;
        }

        setOverview(json[0]);
        setFunnel(json[1]);
        setEvents(json[2]);
        setMatches(json[3]);
        setRevenue(json[4]);
        setEngagement(json[5]);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load analytics.");
        }
      }
    };

    loadAnalytics();

    return () => controller.abort();
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!overview || !funnel || !events || !matches || !revenue || !engagement) {
    return <Card>Loading analytics...</Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-navy">Overview</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-navy-soft">
          <div>
            <div className="text-xl font-semibold">
              {overview.applicants.total}
            </div>
            <div>Applicants</div>
          </div>
          <div>
            <div className="text-xl font-semibold">{overview.events.total}</div>
            <div>Events</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              ${(overview.revenue.total / 100).toFixed(2)}
            </div>
            <div>Revenue</div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Funnel</h2>
        <div className="mt-4 grid gap-3 text-sm text-navy-soft md:grid-cols-3">
          <div>Submitted: {funnel.applications.submitted}</div>
          <div>Screening: {funnel.applications.screening}</div>
          <div>Approved: {funnel.applications.approved}</div>
          <div>Rejected: {funnel.applications.rejected}</div>
          <div>Waitlist: {funnel.applications.waitlist}</div>
          <div>Invitations Sent: {funnel.invitations.sent}</div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Events</h2>
        <div className="mt-4 grid gap-3 text-sm text-navy-soft md:grid-cols-3">
          <div>Upcoming: {events.totals.upcoming}</div>
          <div>Completed: {events.totals.completed}</div>
          <div>Cancelled: {events.totals.cancelled}</div>
          <div>
            Avg Attendance: {events.attendance.avgAttendanceRate.toFixed(1)}%
          </div>
          <div>Avg No-Show: {events.attendance.avgNoShowRate.toFixed(1)}%</div>
          <div>Profit: ${(events.financials.profit / 100).toFixed(2)}</div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Matches</h2>
        <div className="mt-4 text-sm text-navy-soft">
          Total Matches: {matches.overall.totalMatches}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Revenue</h2>
        <div className="mt-4 grid gap-3 text-sm text-navy-soft md:grid-cols-3">
          <div>Total: ${(revenue.total / 100).toFixed(2)}</div>
          {Object.entries(revenue.byType).map(([type, amount]) => (
            <div key={type}>
              {type}: ${(amount / 100).toFixed(2)}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Engagement</h2>
        <div className="mt-4 grid gap-3 text-sm text-navy-soft md:grid-cols-3">
          <div>New Applicants (30d): {engagement.applicants.newLast30Days}</div>
          <div>
            Active Applicants (30d): {engagement.applicants.activeLast30Days}
          </div>
          <div>
            Avg Invite Response:{" "}
            {engagement.invitations.avgResponseHours.toFixed(1)}h
          </div>
          <div>
            Repeat Participants: {engagement.invitations.repeatParticipants}
          </div>
        </div>
      </Card>
    </div>
  );
}
