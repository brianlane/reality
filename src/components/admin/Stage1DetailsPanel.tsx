import type { Stage1Responses } from "@/types/stage1";

type Stage1DetailsPanelProps = {
  stage1Responses: Stage1Responses | null | undefined;
  completedAt: string | null;
};

export default function Stage1DetailsPanel({
  stage1Responses,
  completedAt,
}: Stage1DetailsPanelProps) {
  const s = stage1Responses;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-soft">
        Stage 1 Details
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {s?.firstName != null && (
          <>
            <dt className="text-navy-soft">First name</dt>
            <dd className="font-medium text-navy">{s.firstName}</dd>
          </>
        )}
        {s?.lastName != null && (
          <>
            <dt className="text-navy-soft">Last name</dt>
            <dd className="font-medium text-navy">{s.lastName}</dd>
          </>
        )}
        {s?.email != null && (
          <>
            <dt className="text-navy-soft">Email</dt>
            <dd className="font-medium text-navy">{s.email}</dd>
          </>
        )}
        {s?.phone != null && (
          <>
            <dt className="text-navy-soft">Phone</dt>
            <dd className="font-medium text-navy">{s.phone}</dd>
          </>
        )}
        {s?.age != null && (
          <>
            <dt className="text-navy-soft">Age</dt>
            <dd className="font-medium text-navy">{s.age}</dd>
          </>
        )}
        {s?.gender != null && (
          <>
            <dt className="text-navy-soft">Gender</dt>
            <dd className="font-medium text-navy">{s.gender}</dd>
          </>
        )}
        {s?.location != null && (
          <>
            <dt className="text-navy-soft">Location</dt>
            <dd className="font-medium text-navy">{s.location}</dd>
          </>
        )}
        {s?.instagram != null && (
          <>
            <dt className="text-navy-soft">Instagram</dt>
            <dd className="font-medium text-navy">{s.instagram}</dd>
          </>
        )}
        {completedAt != null && (
          <>
            <dt className="text-navy-soft">Completed at</dt>
            <dd className="font-medium text-navy">
              {new Date(completedAt).toLocaleString()}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
