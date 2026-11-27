"use client";
import { createContext, useContext, useState } from "react";

import { NEW_TABLES_COOKIE } from "@/lib/table-preference";

const NewTablesContext = createContext<{ newTables: boolean; setNewTables: (on: boolean) => void }>({
  newTables: false,
  setNewTables: () => {},
});

/**
 * Holds the choice on the client so the menu and the tables switch at once; the cookie makes the next server render
 * match it.
 */
export function TablePreferenceProvider(props: { newTables: boolean; children: React.ReactNode }) {
  const [newTables, setState] = useState(props.newTables);

  const setNewTables = (on: boolean) => {
    document.cookie = on
      ? `${NEW_TABLES_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
      : `${NEW_TABLES_COOKIE}=; path=/; max-age=0; samesite=lax`;
    setState(on);
  };

  return <NewTablesContext.Provider value={{ newTables, setNewTables }}>{props.children}</NewTablesContext.Provider>;
}

/** Whether to show the DataTable tables instead of the legacy ones. */
export function useNewTables() {
  return useContext(NewTablesContext).newTables;
}

/** Saves the choice and switches the tables. */
export function useSetNewTables() {
  return useContext(NewTablesContext).setNewTables;
}
