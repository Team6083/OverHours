import { ComponentProps, useMemo, useState } from "react";
import { createListCollection, Stack, usePaginationContext, HStack, Select, Portal, Table, Checkbox, ButtonGroup, Pagination, IconButton, ActionBar, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useTranslations } from "next-intl";

const itemsPerPage = createListCollection({
  items: [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
  ],
});

export type Column<T> = {
  dataKey: string;
  sortable?: boolean;
  renderHeader?: (sort: 1 | -1 | null, t?: ReturnType<typeof useTranslations>) => React.ReactNode;
  renderCell?: (row: T, t?: ReturnType<typeof useTranslations>) => React.ReactNode;
  headerColSpan?: number;
  bodyColSpan?: number;
};

type CheckboxOptions = {
  show: boolean;
  showActionBar?: boolean;
  renderActionBarContent?: (selection: string[]) => React.ReactNode;
};

export default function GenericTable<T>(props: {
  items: T[];
  columns: Column<T>[];
  keyFn: (item: T) => string;
  sortingFn?: (a: T, b: T, sortBy: [string, 1 | -1]) => number;
  defaultSortBy?: [string, 1 | -1];
  checkboxOptions?: CheckboxOptions;
  topRightElement?: React.ReactNode;
  t?: ReturnType<typeof useTranslations>
} & ComponentProps<typeof Stack>) {
  const { items, columns, sortingFn, keyFn, defaultSortBy, checkboxOptions, topRightElement, t, ...stackProps } = props;
  const genericTableTranslate = useTranslations("GenericTable");

  // Sorting state: [columnKey, direction]
  const [sortBy, setSortBy] = useState<[string, 1 | -1] | null>(defaultSortBy || null);

  // Pagination state from context
  const { pageSize, pageRange, setPageSize } = usePaginationContext();

  // Get current page data with sorting and pagination
  const tableData = useMemo(() =>
    items.slice()
      .sort((a, b) => (sortBy && sortingFn ? sortingFn(a, b, sortBy) : 0))
      .slice(pageRange.start, pageRange.end)
    , [items, pageRange.start, pageRange.end, sortingFn, sortBy]);

  // Selection state
  const showCheckbox = checkboxOptions?.show ?? false;
  const [selection, setSelection] = useState<string[]>([]);
  const hasSelection = selection.length > 0;
  const indeterminate = hasSelection && selection.length < tableData.length;

  return <Stack gap={4} {...stackProps}>
    <HStack px={2}>
      {/* Entries per page select */}
      <HStack>
        <Select.Root
          collection={itemsPerPage}
          size="xs"
          minW="60px"
          w="60px"
          value={[pageSize.toString()]}
          onValueChange={({ value }) => setPageSize(parseInt(value[0], 10))}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Select framework" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {itemsPerPage.items.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    {item.label}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
        <Text fontSize="sm" fontWeight="medium" minW="fit-content">
          {genericTableTranslate("entriesPerPage")}
        </Text>
      </HStack>
      {topRightElement}
    </HStack>

    <Table.ScrollArea>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            {showCheckbox && (
              <Table.ColumnHeader>
                <Checkbox.Root
                  size="sm"
                  mt="0.5"
                  aria-label="Select all rows"
                  checked={indeterminate ? "indeterminate" : selection.length > 0}
                  onCheckedChange={(changes) => {
                    setSelection(
                      changes.checked ? tableData.map(keyFn) : [],
                    )
                  }}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>
            )}

            {/* Render all header columns */}
            {columns.map((col) => {
              if (!col.renderHeader) return null;

              return (
                <Table.ColumnHeader
                  key={col.dataKey}
                  colSpan={col.headerColSpan}
                  onClick={col.sortable ? () => setSortBy(sortBy?.[1] === 1 ? [col.dataKey, -1] : [col.dataKey, 1]) : undefined}
                  cursor={col.sortable ? "pointer" : undefined}
                >
                  {col.renderHeader(sortBy?.[0] === col.dataKey ? sortBy[1] : null, t)}
                </Table.ColumnHeader>
              );
            })}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tableData.map((row) => {
            const key = keyFn(row);

            return (
              <Table.Row key={key} data-selected={selection.includes(key) ? "" : undefined}>
                {showCheckbox && (
                  <Table.Cell>
                    <Checkbox.Root
                      size="sm"
                      mt="0.5"
                      aria-label="Select row"
                      checked={selection.includes(key)}
                      onCheckedChange={(changes) => {
                        setSelection((prev) =>
                          changes.checked
                            ? [...prev, key]
                            : selection.filter((name) => name !== key),
                        )
                      }}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                )}

                {/* Render all data columns */}
                {columns.map((col) => {
                  if (!col.renderCell) return null;

                  return (
                    <Table.Cell key={col.dataKey} colSpan={col.bodyColSpan}>
                      {col.renderCell(row, t)}
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>

    <HStack justify={{ base: "space-around", md: "space-between" }} px={2} flexWrap="wrap">
      <StatText as="span" fontSize="sm" fontWeight="medium" color="fg.muted" />
      <PaginationButtons />
    </HStack>

    {checkboxOptions?.showActionBar && (
      <ActionBar.Root open={hasSelection}>
        <Portal>
          <ActionBar.Positioner>
            <ActionBar.Content>
              <ActionBar.SelectionTrigger>
                {genericTableTranslate("selectedCount", { count: selection.length })}
              </ActionBar.SelectionTrigger>
              {
                checkboxOptions.renderActionBarContent && (<>
                  <ActionBar.Separator />
                  {checkboxOptions.renderActionBarContent(selection)}
                </>)
              }
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Portal>
      </ActionBar.Root>
    )}

  </Stack>;
}

function StatText(props: ComponentProps<typeof Text>) {
  const t = useTranslations("GenericTable");
  const { count, pageRange } = usePaginationContext();

  return <Text {...props}>
    {t("showingEntries", { start: pageRange.start + 1, end: pageRange.end, count })}
  </Text>;
}

function PaginationButtons() {
  return <>
    <ButtonGroup variant="ghost" size="sm" wrap="wrap" hideBelow="sm">
      <Pagination.PrevTrigger asChild>
        <IconButton>
          <LuChevronLeft />
        </IconButton>
      </Pagination.PrevTrigger>

      <Pagination.Items
        render={(page) => (
          <IconButton variant={{ base: "ghost", _selected: "outline" }}>
            {page.value}
          </IconButton>
        )}
      />

      <Pagination.NextTrigger asChild>
        <IconButton>
          <LuChevronRight />
        </IconButton>
      </Pagination.NextTrigger>
    </ButtonGroup>

    <ButtonGroup variant="ghost" size="sm" wrap="wrap" hideFrom="sm">
      <Pagination.PrevTrigger asChild>
        <IconButton>
          <LuChevronLeft />
        </IconButton>
      </Pagination.PrevTrigger>

      <Pagination.PageText />

      <Pagination.NextTrigger asChild>
        <IconButton>
          <LuChevronRight />
        </IconButton>
      </Pagination.NextTrigger>
    </ButtonGroup>
  </>;
}
