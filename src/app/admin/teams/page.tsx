import { EmptyState } from "@team6083/ui";
import { LuMousePointerClick } from "react-icons/lu";

export default function TeamsPage() {
  return (
    <EmptyState
      icon={<LuMousePointerClick />}
      title="Select a team"
      description="Pick a team from the tree to edit it and manage its members."
    />
  );
}
