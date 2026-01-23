"use client";
import { Button } from "@chakra-ui/react";
import { useState } from "react";
import { createTeamAction } from "./actions";

export default function CreateTeamButton() {

  const [loading, setLoading] = useState(false);

  return <Button
    onClick={() => {
      setLoading(true);
      createTeamAction().finally(() => {
        setLoading(false);
      });
    }}
    loading={loading}
  > Create team</Button >;
}
