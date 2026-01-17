import { NextResponse } from "next/server";

type ErrorDetail = {
  field?: string;
  message: string;
};

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: ErrorDetail[],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
