export function verifyCheckrSignature(signature: string, payload: string) {
  return Boolean(signature && payload);
}

export function mapCheckrResult(result: string) {
  return result === "clear" ? "PASSED" : "FAILED";
}
