"use client";
import { ComponentProps, Fragment } from "react";
import { GridItem, Grid } from "@chakra-ui/react";
import { useColorMode } from "@/components/ui/color-mode";

import { Tooltip } from "./ui/tooltip";

// Light mode: high value → dark green (900); dark mode: high value → light green (200)
function calculateColor(value: number, isDark: boolean): string {
  if (value === 0) return "bg.muted";

  const intensity = Math.min(Math.max(value, 0), 1);
  const shade = isDark
    ? Math.round((1 - intensity) * 7 + 2) * 100
    : Math.round(intensity * 7 + 2) * 100;

  return `green.${shade}`;
}

// Collapse consecutive empty labels after a non-empty one into a single colSpan group.
// Leading empties stay as individual cells so column alignment is preserved.
function toColspanGroups(headers: React.ReactNode[]): { label: React.ReactNode; span: number }[] {
  const result: { label: React.ReactNode; span: number }[] = [];
  let i = 0;
  while (i < headers.length) {
    const label = headers[i];
    const isEmpty = label === "" || label == null;
    if (isEmpty) {
      result.push({ label: "", span: 1 });
      i++;
    } else {
      let span = 1;
      while (i + span < headers.length) {
        const next = headers[i + span];
        if (next === "" || next == null) span++;
        else break;
      }
      result.push({ label, span });
      i += span;
    }
  }
  return result;
}

export default function Heatmap(props: {
  rows: number;
  columns: number;
  gridData: (number | { value: number, label: string })[][];
  headerProps?: ComponentProps<typeof GridItem>;
  cellProps?: ComponentProps<typeof GridItem>;
  rowHeaders?: React.ReactNode[];
  columnHeaders?: React.ReactNode[];
}) {
  const { rows, columns, gridData, headerProps, cellProps, rowHeaders, columnHeaders } = props;
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const actualCols = columns + (rowHeaders ? 1 : 0);
  const actualRows = rows + (columnHeaders ? 1 : 0);
  const colHeaderGroups = columnHeaders ? toColspanGroups(columnHeaders) : [];

  return (
    <Grid templateColumns={`repeat(${actualCols}, 20px)`} templateRows={`repeat(${actualRows}, 20px)`} gap={1}>
      {/* Top-Left Corner */}
      {(rowHeaders && columnHeaders) && (<GridItem />)}

      {/* Column Headers — non-empty labels span until the next label */}
      {columnHeaders && gridData.length > 0 && colHeaderGroups.map((group, idx) => (
        <GridItem
          key={idx}
          colSpan={group.span > 1 ? group.span : undefined}
          textAlign="left"
          alignSelf="end"
          overflow="visible"
          whiteSpace="nowrap"
          {...headerProps}
        >
          {group.label}
        </GridItem>
      ))}

      {gridData.map((row, rowIdx) => (
        <Fragment key={`row-${rowIdx}`}>
          {/* Row Header */}
          {rowHeaders && (
            <GridItem alignSelf="center" textAlign="right" {...headerProps}>
              {rowHeaders[rowIdx]}
            </GridItem>
          )}

          {row.map((value, colIdx) => (
            <Tooltip
              key={`${rowIdx}-${colIdx}`}
              showArrow
              content={typeof value === "number" ? `${value}` : value.label}
              openDelay={300}
            >
              <GridItem
                bg={calculateColor(typeof value === "number" ? value : value.value, isDark)}
                {...cellProps}
              />
            </Tooltip>
          ))}
        </Fragment>
      ))}
    </Grid>
  );
}
