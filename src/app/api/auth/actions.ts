"use server";

import { auth } from "@/lib/auth/server";
import { resolveTenantId } from "@/lib/auth/tenant";
import { BasicUser, UserZodSchema } from "app-types/user";
import { userRepository } from "lib/db/repository";
import { ActionState } from "lib/action-utils";
import { headers } from "next/headers";

export async function existsByEmailAction(email: string) {
  const requestHeaders = await headers();
  const tenantId = resolveTenantId(requestHeaders);
  const exists = await userRepository.existsByEmail(email, tenantId);
  return exists;
}

type SignUpActionResponse = ActionState & {
  user?: BasicUser;
};

export async function signUpAction(data: {
  email: string;
  name: string;
  password: string;
}): Promise<SignUpActionResponse> {
  const { success, data: parsedData } = UserZodSchema.safeParse(data);
  if (!success) {
    return {
      success: false,
      message: "Invalid data",
    };
  }
  try {
    const requestHeaders = await headers();
    const tenantId = resolveTenantId(requestHeaders);
    const { user } = await auth.api.signUpEmail({
      body: {
        email: parsedData.email,
        password: parsedData.password,
        name: parsedData.name,
        tenantId,
      },
      headers: requestHeaders,
    });
    return {
      user,
      success: true,
      message: "Successfully signed up",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sign up",
    };
  }
}
