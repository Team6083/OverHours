import { Stat } from "@chakra-ui/react";

export default function StatValueTextDuration(props: {
  durationMs: number,
  showSeconds?: boolean,
}) {
  const { durationMs, showSeconds } = props;

  const totalSeconds = Math.floor(durationMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hours = Math.floor(totalSeconds / 3600);

  return (
    <Stat.ValueText alignItems="baseline">
      {hours > 0 && <>{`${hours} `}<Stat.ValueUnit>hr</Stat.ValueUnit></>}
      {minutes > 0 && <>{`${minutes} `}<Stat.ValueUnit>min</Stat.ValueUnit></>}
      {seconds > 0 && showSeconds && <>{`${seconds} `}<Stat.ValueUnit>sec</Stat.ValueUnit></>}
      {hours === 0 && minutes === 0 && seconds === 0 && <>Less than 1 sec</>}
    </Stat.ValueText>
  );
}
