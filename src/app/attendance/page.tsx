import { isCalendarDate, weekStartOf } from "@/lib/attendance";
import { getMyPattern, getMyWeek, getToday, getWeekBoard } from "@/lib/data/attendance-dto";
import AttendanceView from "./AttendanceView";

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [board, mine, pattern] = await Promise.all([
    getWeekBoard(weekStart),
    getMyWeek(weekStart),
    getMyPattern().catch((error) => {
      console.error("Failed to load the usual week", error);
      return {};
    }),
  ]);

  return <AttendanceView key={weekStart} weekStart={weekStart} today={today} board={board} mine={mine} pattern={pattern} />;
}
