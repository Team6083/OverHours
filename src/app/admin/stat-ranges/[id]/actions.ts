"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { createStatRange, updateStatRange } from "@/lib/data/statrange-dto";

const schema = z
  .object({
    id: z.string().optional(),
    tzOffset: z.coerce.number(),
    name: z.string().min(1, "Name is required"),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    status: z.enum(["ACTIVE", "ARCHIVED"]),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type StatRangeFormState = {
  issues?: z.ZodError["issues"];
  prevValues?: Omit<z.infer<typeof schema>, "tzOffset">;
}

export async function formSubmit(state: StatRangeFormState, formData: FormData): Promise<StatRangeFormState> {
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const parsed: z.infer<typeof schema> = schema.parse(formDataObj);

    const formTzOffset = parsed.tzOffset;
    const localTzOffset = new Date().getTimezoneOffset();
    const tzOffset = formTzOffset - localTzOffset;

    const startDate = new Date(new Date(parsed.startDate).getTime() + tzOffset * 60 * 1000);
    const endDate = new Date(new Date(parsed.endDate).getTime() + tzOffset * 60 * 1000);

    if (parsed.id) {
      await updateStatRange(parsed.id, {
        name: parsed.name,
        startDate: startDate,
        endDate: endDate,
        status: parsed.status,
      });
    } else {
      await createStatRange({
        name: parsed.name,
        startDate: startDate,
        endDate: endDate,
        status: parsed.status,
      });
    }

    revalidatePath("/admin/stat-ranges");
    redirect("/admin/stat-ranges");
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log("Validation errors:", e.issues);
      return { issues: e.issues, prevValues: formDataObj as never };
    }
    throw e;
  }
}
