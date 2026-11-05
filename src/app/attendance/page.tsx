import { isCalendarDate, weekStartOf } from "@/lib/attendance";
import { getMyWeek, getToday, getWeekBoard } from "@/lib/data/attendance-dto";
import AttendanceView from "./AttendanceView";

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [board, mine] = await Promise.all([getWeekBoard(weekStart), getMyWeek(weekStart)]);

  return <AttendanceView key={weekStart} weekStart={weekStart} today={today} board={board} mine={mine} />;
}
