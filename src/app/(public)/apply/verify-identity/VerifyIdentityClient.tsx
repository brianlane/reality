"use client";

import { useRouter } from "next/navigation";
import IdentityVerification from "@/components/apply/IdentityVerification";

type Props = {
  applicationId: string;
  initialStatus: "PENDING" | "IN_PROGRESS" | "FAILED";
};

export default function VerifyIdentityClient({
  applicationId,
  initialStatus,
}: Props) {
  const router = useRouter();

  const handleStatusChange = (status: string) => {
    if (status === "PASSED") {
      // Identity verified — proceed to waitlist
      router.push(`/apply/waitlist?id=${applicationId}`);
    }
  };

  return (
    <IdentityVerification
      applicationId={applicationId}
      initialStatus={initialStatus}
      onStatusChange={handleStatusChange}
    />
  );
}
