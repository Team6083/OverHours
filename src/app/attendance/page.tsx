import { isCalendarDate, weekStartOf } from "@/lib/attendance";
import { getMyPattern, getMyReliability, getMyWeek, getToday, getWeekBoard } from "@/lib/data/attendance-dto";
import AttendanceView from "./AttendanceView";
import MyReliability from "./MyReliability";

const RELIABILITY_DAYS = 30;

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [board, mine, pattern, reliability] = await Promise.all([
    getWeekBoard(weekStart),
    getMyWeek(weekStart),
    getMyPattern().catch((error) => {
      console.error("Failed to load the usual week", error);
      return {};
    }),
    getMyReliability(RELIABILITY_DAYS).catch((error) => {
      console.error("Failed to load answer reliability", error);
      return null;
    }),
  ]);

  return (<>
    <AttendanceView key={weekStart} weekStart={weekStart} today={today} board={board} mine={mine} pattern={pattern} />
    <MyReliability row={reliability} days={RELIABILITY_DAYS} />
  </>);
}
