"use server";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createUser, updateUser } from "@/lib/data/user-dto";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().nonempty(),
  email: z.email().toLowerCase(),
});

export type CreateUserFormState = {
  issues?: z.ZodError["issues"];
  prevValues?: z.infer<typeof schema>
}

export async function formSubmit(state: CreateUserFormState, formData: FormData): Promise<CreateUserFormState> {
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
    throw e;
  }
}
