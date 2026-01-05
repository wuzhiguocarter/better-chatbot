import { auth } from "auth/server";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { resolveTenantId } from "@/lib/auth/tenant";
import { userRepository } from "lib/db/repository";

const handler = toNextJsHandler(auth.handler);

const validateTenantEmailSignIn = async (request: NextRequest) => {
  const isEmailSignIn = request.nextUrl.pathname.endsWith("/sign-in/email");
  if (!isEmailSignIn) {
    return null;
  }

  const body = await request
    .clone()
    .json()
    .catch(() => null);
  const email = body?.email;
  if (!email) {
    return new Response("Missing email", { status: 400 });
  }

  const tenantId = resolveTenantId(request.headers);
  const exists = await userRepository.existsByEmail(email, tenantId);
  if (!exists) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
};

export const GET = (request: NextRequest) => handler.GET(request);
export const POST = async (request: NextRequest) => {
  const validationResponse = await validateTenantEmailSignIn(request);
  if (validationResponse) {
    return validationResponse;
  }
  return handler.POST(request);
};
