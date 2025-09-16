import { UserDTO } from "@/lib/data/user-dto";
import UsersTable from "./UsersTable";
import { Pagination } from "@chakra-ui/react";

const data: UserDTO[] = [
  {
    id: "1",
    email: "alice.johnson@example.com",
    name: "Alice Johnson",
    createdAt: new Date("2024-01-15T09:30:00"),
    updatedAt: new Date("2024-01-15T09:30:00"),
  },
  {
    id: "2",
    email: "bob.smith@example.com",
    name: "Bob Smith",
    createdAt: new Date("2024-01-16T14:20:00"),
    updatedAt: new Date("2024-01-16T14:20:00"),
  },
  {
    id: "3",
    email: "carol.davis@example.com",
    name: "Carol Davis",
    createdAt: new Date("2024-01-17T11:45:00"),
    updatedAt: new Date("2024-01-17T11:45:00"),
  },
  {
    id: "4",
    email: "david.wilson@example.com",
    name: "David Wilson",
    createdAt: new Date("2024-01-18T16:10:00"),
    updatedAt: new Date("2024-01-18T16:10:00"),
  },
  {
    id: "5",
    email: "emma.brown@example.com",
    name: "Emma Brown",
    createdAt: new Date("2024-01-19T08:25:00"),
    updatedAt: new Date("2024-01-19T08:25:00"),
  },
  {
    id: "6",
    email: "frank.miller@example.com",
    name: "Frank Miller",
    createdAt: new Date("2024-01-20T13:50:00"),
    updatedAt: new Date("2024-01-20T13:50:00"),
  },
  {
    id: "7",
    email: "grace.taylor@example.com",
    name: "Grace Taylor",
    createdAt: new Date("2024-01-21T10:15:00"),
    updatedAt: new Date("2024-01-21T10:15:00"),
  },
  {
    id: "8",
    email: "henry.anderson@example.com",
    name: "Henry Anderson",
    createdAt: new Date("2024-01-22T15:40:00"),
    updatedAt: new Date("2024-01-22T15:40:00"),
  },
  {
    id: "9",
    email: "ivy.thomas@example.com",
    name: "Ivy Thomas",
    createdAt: new Date("2024-01-23T12:05:00"),
    updatedAt: new Date("2024-01-23T12:05:00"),
  },
  {
    id: "10",
    email: "jack.martinez@example.com",
    name: "Jack Martinez",
    createdAt: new Date("2024-01-24T09:55:00"),
    updatedAt: new Date("2024-01-24T09:55:00"),
  },
  {
    id: "11",
    email: "kate.garcia@example.com",
    name: "Kate Garcia",
    createdAt: new Date("2024-01-25T14:30:00"),
    updatedAt: new Date("2024-01-25T14:30:00"),
  },
  {
    id: "12",
    email: "liam.rodriguez@example.com",
    name: "Liam Rodriguez",
    createdAt: new Date("2024-01-26T11:20:00"),
    updatedAt: new Date("2024-01-26T11:20:00"),
  },
  {
    id: "13",
    email: "mia.lopez@example.com",
    name: "Mia Lopez",
    createdAt: new Date("2024-01-27T16:45:00"),
    updatedAt: new Date("2024-01-27T16:45:00"),
  },
  {
    id: "14",
    email: "noah.lee@example.com",
    name: "Noah Lee",
    createdAt: new Date("2024-01-28T08:10:00"),
    updatedAt: new Date("2024-01-28T08:10:00"),
  },
  {
    id: "15",
    email: "olivia.white@example.com",
    name: "Olivia White",
    createdAt: new Date("2024-01-29T13:35:00"),
    updatedAt: new Date("2024-01-29T13:35:00"),
  },
  {
    id: "16",
    email: "paul.harris@example.com",
    name: "Paul Harris",
    createdAt: new Date("2024-01-30T10:00:00"),
    updatedAt: new Date("2024-01-30T10:00:00"),
  },
  {
    id: "17",
    email: "quinn.clark@example.com",
    name: "Quinn Clark",
    createdAt: new Date("2024-01-31T15:25:00"),
    updatedAt: new Date("2024-01-31T15:25:00"),
  },
  {
    id: "18",
    email: "ruby.lewis@example.com",
    name: "Ruby Lewis",
    createdAt: new Date("2024-02-01T12:15:00"),
    updatedAt: new Date("2024-02-01T12:15:00"),
  },
  {
    id: "19",
    email: "sam.walker@example.com",
    name: "Sam Walker",
    createdAt: new Date("2024-02-02T09:40:00"),
    updatedAt: new Date("2024-02-02T09:40:00"),
  },
  {
    id: "20",
    email: "tina.hall@example.com",
    name: "Tina Hall",
    createdAt: new Date("2024-02-03T14:05:00"),
    updatedAt: new Date("2024-02-03T14:05:00"),
  },
  {
    id: "21",
    email: "victor.young@example.com",
    name: "Victor Young",
    createdAt: new Date("2024-02-04T11:50:00"),
    updatedAt: new Date("2024-02-04T11:50:00"),
  },
];

export default function UsersPage() {
  return <>
    <Pagination.Root count={data.length} defaultPageSize={10} defaultPage={1}>
      <UsersTable users={data} />
    </Pagination.Root>
  </>;
}
