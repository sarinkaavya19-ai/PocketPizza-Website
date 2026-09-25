"use client";

import {
  ErrorEnvelopeSchema,
  SuccessEnvelopeSchema,
  type ErrorEnvelope,
} from "@shared/contract/contract";
import type { ZodType } from "zod";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export type ApiErrorShape = ErrorEnvelope["error"];

export class ApiError extends Error {
  code: string;
  status: number;
  details?: ApiErrorShape["details"];
  requestId?: string;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorShape["details"];
    requestId?: string;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.requestId = opts.requestId;
  }
}

export class ContractMismatchError extends ApiError {
  endpoint: string;
  issues?: unknown;

  constructor(opts: {
    endpoint: string;
    message: string;
    status: number;
    requestId?: string;
    issues?: unknown;
  }) {
    super({
      code: "CONTRACT_MISMATCH",
      message: opts.message,
      status: opts.status,
      requestId: opts.requestId,
    });
    this.name = "ContractMismatchError";
    this.endpoint = opts.endpoint;
    this.issues = opts.issues;
  }
}

type EnvelopeError = ErrorEnvelope;

type RequestContext = {
  method: string;
  path: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRequestId(body: unknown, response: Response): string | undefined {
  const bodyRequestId = isRecord(body) && typeof body.requestId === "string" ? body.requestId : undefined;
  return bodyRequestId || response.headers.get("x-request-id") || undefined;
}

function logResponse(
  context: RequestContext,
  response: Response,
  requestId: string | undefined,
  outcome: "success" | "error"
): void {
  console.log(
    `[api] ${context.method} ${context.path} -> ${response.status} ${outcome}; requestId=${requestId || "unavailable"}`
  );
}

async function parseEnvelope<T>(
  response: Response,
  context: RequestContext,
  dataSchema?: ZodType<T>
): Promise<T> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    const requestId = response.headers.get("x-request-id") || undefined;
    const error = new ApiError({
      code: "INVALID_RESPONSE",
      message: `Unexpected response (HTTP ${response.status}). Please try again.`,
      status: response.status,
      requestId,
    });
    logResponse(context, response, requestId, "error");
    console.error(`[api] ${context.method} ${context.path} returned invalid JSON`, error);
    throw error;
  }

  const requestId = getRequestId(body, response);
  const createContractError = (issues: unknown) => {
    const error = new ContractMismatchError({
      endpoint: context.path,
      message: `${context.method} ${context.path} returned a response that violates the shared API contract.`,
      status: response.status,
      requestId,
      issues,
    });
    logResponse(context, response, requestId, "error");
    console.error(`[api] ${context.method} ${context.path} contract mismatch`, error);
    return error;
  };

  if (isRecord(body) && body.success === true) {
    const envelopeResult = SuccessEnvelopeSchema.safeParse(body);
    if (!envelopeResult.success) throw createContractError(envelopeResult.error.issues);

    if (!response.ok) {
      const error = new ApiError({
        code: "HTTP_ERROR",
        message: `Request failed (HTTP ${response.status}).`,
        status: response.status,
        requestId,
      });
      logResponse(context, response, requestId, "error");
      console.error(`[api] ${context.method} ${context.path} failed`, error);
      throw error;
    }

    const dataResult = dataSchema?.safeParse(envelopeResult.data.data) ?? {
      success: true as const,
      data: envelopeResult.data.data as T,
    };
    if (!dataResult.success) throw createContractError(dataResult.error.issues);

    logResponse(context, response, requestId, "success");
    return dataResult.data;
  }

  if (isRecord(body) && body.success === false) {
    const envelopeResult = ErrorEnvelopeSchema.safeParse(body);
    if (!envelopeResult.success) throw createContractError(envelopeResult.error.issues);

    const errorEnvelope = envelopeResult.data as EnvelopeError;
    const error = new ApiError({
      code: errorEnvelope.error.code,
      message: errorEnvelope.error.message,
      status: response.status,
      details: errorEnvelope.error.details,
      requestId: errorEnvelope.requestId,
    });
    logResponse(context, response, errorEnvelope.requestId, "error");
    console.error(`[api] ${context.method} ${context.path} failed`, error);
    throw error;
  }

  throw createContractError(["Expected an envelope with success=true or success=false."]);
}

/**
 * Canonical fetch wrapper per Backend Master Reference §8.
 * - Envelope-aware ({ success, data, requestId })
 * - Logs the requestId for every response to make API failures traceable
 * - Sends cookies (required for admin JWT via __Host- cookies, §9.8/§20.1)
 * - Never sends client-computed totals; server recomputes pricing (§16.2)
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
  dataSchema?: ZodType<T>
): Promise<T> {
  const { auth, ...rest } = init;
  // `auth` remains a call-site compatibility option; requests use cookies.
  void auth;

  const method = (rest.method || "GET").toUpperCase();
  const context: RequestContext = { method, path };
  const headers = new Headers(rest.headers);
  if (rest.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      method,
      headers,
      // Admin + auth endpoints rely on HttpOnly cookies; always include.
      credentials: "include",
    });
    return await parseEnvelope<T>(response, context, dataSchema);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;

    console.error(`[api] ${method} ${path} could not reach the server; requestId=unavailable`, error);
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Unable to reach the server. Please try again.",
      status: 0,
    });
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}