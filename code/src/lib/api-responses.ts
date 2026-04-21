import { NextResponse } from 'next/server';

/**
 * Standardized API response helpers for consistent JSON responses
 */

export const success = (data: any, statusCode: number = 200) => {
  return NextResponse.json(data, { status: statusCode });
};

export const created = (data: any) => {
  return success(data, 201);
};

export const badRequest = (message: string, data?: any) => {
  return NextResponse.json(
    {
      error: message,
      ...(data && { data }),
    },
    { status: 400 }
  );
};

export const unauthorized = (message: string = 'Unauthorized') => {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
};

export const forbidden = (message: string = 'Forbidden') => {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
};

export const notFound = (message: string = 'Not found') => {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
};

export const serverError = (message: string = 'Internal server error', data?: any) => {
  return NextResponse.json(
    {
      error: message,
      ...(data && { data }),
    },
    { status: 500 }
  );
};

export const conflict = (message: string = 'Conflict') => {
  return NextResponse.json(
    { error: message },
    { status: 409 }
  );
};
