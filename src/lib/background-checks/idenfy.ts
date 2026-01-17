export function verifyIdenfySignature(signature: string, payload: string) {
  return Boolean(signature && payload);
}

export function mapIdenfyStatus(status: string) {
  return status === "APPROVED" ? "PASSED" : "FAILED";
}
