import { getAutoLockConfig, getTimeZone } from "@/lib/config";
import LockedReportContent from "./LockedReportContent";

export default async function LockedReport() {
  const autoLock = getAutoLockConfig();
  const autoLockTime = autoLock
    ? `${String(autoLock.hour).padStart(2, "0")}:${String(autoLock.minute).padStart(2, "0")}`
    : undefined;

  return <LockedReportContent autoLockTime={autoLockTime} timeZone={getTimeZone()} />;
}
