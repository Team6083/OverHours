"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { unlinkAccount } from "@/lib/data/account-dto";
import { removeCard } from "@/lib/data/card-dto";
import { createUser, EmailManagedByProviderError, updateUser } from "@/lib/data/user-dto";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().nonempty(),
  email: z.email().toLowerCase(),
});

export type UserFormState = {
  issues?: z.ZodError["issues"];
  prevValues?: z.infer<typeof schema>
}

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

export async function formSubmit(state: UserFormState, formData: FormData): Promise<UserFormState> {
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const parsed: z.infer<typeof schema> = schema.parse(formDataObj);

    if (parsed.id) {
      await updateUser(parsed.id, {
        email: parsed.email,
        name: parsed.name,
      });
    } else {
      await createUser({
        email: parsed.email,
        name: parsed.name,
      });
    }

    redirect("/admin/users");
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log("Validation errors:", e.issues);
      return { issues: e.issues, prevValues: formDataObj as never };
    }
    const emailIssue = (message: string): UserFormState => ({
      issues: [{ code: "custom", path: ["email"], message, input: formDataObj.email }],
      prevValues: formDataObj as never,
    });

    if (e instanceof EmailManagedByProviderError) return emailIssue(e.message);
    // `email` is the only unique field on User.
    if (prismaErrorCode(e) === "P2002") return emailIssue("Another user already has this email.");
    throw e;
  }
}

export async function handleUnlinkAccount(userId: string, accountId: string) {
  await unlinkAccount(userId, accountId);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function handleRemoveCard(userId: string, cardId: string) {
  await removeCard(cardId);
  revalidatePath(`/admin/users/${userId}`);
}
