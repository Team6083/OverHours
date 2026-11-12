import { isCalendarDate, weekStartOf } from "@/lib/attendance";
import { getMyAccuracy, getMyWeek, getToday, getWeekBoard } from "@/lib/data/attendance-dto";
import AttendanceView from "./AttendanceView";
import MyAccuracy from "./MyAccuracy";

const ACCURACY_DAYS = 30;

export default async function AttendancePage(props: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await props.searchParams;

  const today = getToday();
  const weekStart = weekStartOf(week && isCalendarDate(week) ? week : today);

  const [board, mine, accuracy] = await Promise.all([
    getWeekBoard(weekStart), getMyWeek(weekStart), getMyAccuracy(ACCURACY_DAYS),
  ]);

  return (<>
    <AttendanceView key={weekStart} weekStart={weekStart} today={today} board={board} mine={mine} />
    <MyAccuracy row={accuracy} days={ACCURACY_DAYS} />
  </>);
}
