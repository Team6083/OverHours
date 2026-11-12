"use client";
import { createContext, ReactNode, useContext } from "react";

const TopRanksContext = createContext<string[]>([]);

/** Gives client components the all-time top user ids, worked out once on the server in the root layout. */
export function TopRanksProvider(props: { userIds: string[]; children: ReactNode }) {
  return <TopRanksContext.Provider value={props.userIds}>{props.children}</TopRanksContext.Provider>;
}

/** Turns a user id into its 1-based place in the top list, or undefined when the user isn't in it. */
export function useRankOf(): (userId: string) => number | undefined {
  const userIds = useContext(TopRanksContext);
  return userId => {
    const index = userIds.indexOf(userId);
    return index >= 0 ? index + 1 : undefined;
  };
}
