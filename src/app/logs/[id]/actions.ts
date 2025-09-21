
"use server";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createTimeLog, updateTimeLog } from "@/lib/data/timelog-dto";

const schema = z
  .object({
    id: z.string().optional(),
    tzOffset: z.coerce.number(),
    user: z.string().nonempty(),
    status: z.enum(["CURRENTLY_IN", "DONE", "LOCKED"]).nonoptional(),
    clockInTime: z.iso.datetime({ local: true }).nonempty(),
    clockOutTime: z.iso.datetime({ local: true }).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => typeof data.clockOutTime === "string", {
    message: "Clock out time is required when status is not 'CURRENTLY_IN'",
    path: ["clockOutTime"],
    when(payload): boolean { return (payload.value as z.infer<typeof schema>).status !== "CURRENTLY_IN"; },
  })
  .refine((data) => new Date(data.clockOutTime || 0) > new Date(data.clockInTime), {
    message: "Clock out time must be after clock in time",
    path: ["clockOutTime"],
    when(payload): boolean {
      return typeof (payload.value as z.infer<typeof schema>).clockOutTime === "string"
        && z.iso.datetime({ local: true }).safeParse((payload.value as z.infer<typeof schema>).clockOutTime).success;
    },
  });

export type LogFormState = {
  issues?: z.ZodError["issues"];
  prevValues?: Omit<z.infer<typeof schema>, "tzOffset">;
}

export async function formSubmit(state: LogFormState, formData: FormData): Promise<LogFormState> {
  const formDataObj = Object.fromEntries(formData.entries());

  try {
    const parsed: z.infer<typeof schema> = schema.parse(formDataObj);

    const formTzOffset = parsed.tzOffset;
    const localTzOffset = new Date().getTimezoneOffset();
    const tzOffset = formTzOffset - localTzOffset;

    const inTime = new Date(new Date(parsed.clockInTime).getTime() + tzOffset * 60 * 1000);
    const outTime = parsed.clockOutTime ? new Date(new Date(parsed.clockOutTime).getTime() + tzOffset * 60 * 1000) : undefined;

    if (parsed.id) {
      await updateTimeLog(parsed.id, {
        userId: parsed.user,
        status: parsed.status,
        inTime: inTime,
        outTime: outTime,
        notes: parsed.notes || null,
      });
    } else {
      await createTimeLog({
        userId: parsed.user,
        status: parsed.status,
        inTime: inTime,
        outTime: outTime,
        notes: parsed.notes || null,
      });
    }

    redirect("/logs");
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log("Validation errors:", e.issues);
      return { issues: e.issues, prevValues: formDataObj as never };
    }
    throw e;
  }
}
