"use server";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createTeam, updateTeam } from "@/lib/data/team-dto";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().nonempty(),
});

export type TeamFormState = {
  issues?: z.ZodError["issues"];
  prevValues?: z.infer<typeof schema>
}

export async function formSubmit(state: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const parsed: z.infer<typeof schema> = schema.parse(formDataObj);

    if (parsed.id) {
      await updateTeam(parsed.id, {
        name: parsed.name,
      });
    } else {
      await createTeam(
        parsed.name,
      );
    }

    redirect("/admin/teams");
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log("Validation errors:", e.issues);
      return { issues: e.issues, prevValues: formDataObj as never };
    }
    throw e;
  }
}
