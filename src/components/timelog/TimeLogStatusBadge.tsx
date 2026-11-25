import { Badge, Icon } from "@chakra-ui/react";
import { LuTimer, LuCircleCheckBig, LuLock } from "react-icons/lu";

import { TimeLogDTO } from "@/lib/data/timelog-dto"

export default function TimeLogStatusBadge(props: { status: TimeLogDTO["status"] }) {

  if (props.status === "CURRENTLY_IN") {
    return <Badge colorPalette="green"><Icon><LuTimer /></Icon>Currently In</Badge>;
  } else if (props.status === "DONE") {
    return <Badge colorPalette="purple"><Icon><LuCircleCheckBig /></Icon>Done</Badge>;
  } else if (props.status === "LOCKED") {
    return <Badge colorPalette="red"><Icon><LuLock /></Icon>Locked</Badge>;
  } else {
    return <Badge colorPalette="gray">Unknown</Badge>;
  }
}
