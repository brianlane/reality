import { POST as uploadUrlPOST } from "../upload-url/route";

/**
 * Backwards-compatible alias for older clients using /upload-photo.
 * Newer clients should use /api/applications/upload-url.
 */
export const POST = uploadUrlPOST;
