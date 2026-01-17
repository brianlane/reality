"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

type ApplicationItem = {
  id: string;
  firstName: string;
  lastName: string;
  applicationStatus: string;
};

export default function AdminApplicationsTable() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/applications", {
      headers: { "x-mock-user-role": "ADMIN" },
    })
      .then((res) => res.json())
      .then((json) => setApplications(json.applications ?? []));
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Applications</h2>
      <Table className="mt-4">
        <thead>
          <tr className="border-b text-xs uppercase text-slate-400">
            <th className="py-2 text-left">Applicant</th>
            <th className="py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b text-sm text-slate-600">
              <td className="py-2">
                {app.firstName} {app.lastName}
              </td>
              <td className="py-2">{app.applicationStatus}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
