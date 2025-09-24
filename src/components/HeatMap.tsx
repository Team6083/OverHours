"use client";
import { ComponentProps, Fragment } from "react";
import { GridItem, Grid } from "@chakra-ui/react";

import { Tooltip } from "./ui/tooltip";

function calculateColor(value: number): string {
  if (value === 0) return "bg.muted";

  const clampedValue = Math.min(Math.max(value, 0), 1);

  const greenValue = Math.round(clampedValue * 7 + 2) * 100; // Scale 0-1 to 200-900

  return `green.${greenValue}`;
}

export default
  function Heatmap(props: {
    rows: number;
    columns: number;
    gridData: (number | { value: number, label: string })[][];
    headerProps?: ComponentProps<typeof GridItem>;
    cellProps?: ComponentProps<typeof GridItem>;
    rowHeaders?: React.ReactNode[];
    columnHeaders?: React.ReactNode[];
  }) {
  const { rows, columns, gridData, headerProps, cellProps, rowHeaders, columnHeaders } = props;

  const actualCols = columns + (rowHeaders ? 1 : 0);
  const actualRows = rows + (columnHeaders ? 1 : 0);

  return (
    <Grid templateColumns={`repeat(${actualCols}, 20px)`} templateRows={`repeat(${actualRows}, 20px)`} gap={1}>
      {/* Top-Left Corner */}
      {(rowHeaders && columnHeaders) && (<GridItem />)}

      {/* Column Headers */}
      {columnHeaders && gridData.length > 0 && gridData[0].map((_, idx) => (
        <GridItem key={idx} textAlign="center" alignSelf="end" {...headerProps}>
          {columnHeaders[idx]}
        </GridItem>
      ))}

      {gridData.map((row, rowIdx) => {
        return <Fragment key={`row-${rowIdx}`}>
          {/* Row Header */}
          {rowHeaders &&
            <GridItem alignSelf="center" textAlign="right" {...headerProps}>
              {rowHeaders[rowIdx]}
            </GridItem>
          }

          {row.map((value, colIdx) => (
            <Tooltip
              key={`${rowIdx}-${colIdx}`}
              showArrow
              content={typeof value === "number" ? `${value}` : value.label}
              openDelay={300}
            >
              <GridItem
                bg={calculateColor(typeof value === "number" ? value : value.value)}
                {...cellProps}
              ></GridItem>
            </Tooltip>
          ))}
        </Fragment>;
      })}
    </Grid>
  );
}

