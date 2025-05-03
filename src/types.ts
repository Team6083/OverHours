interface TimeLogBase {
    id: string;
    userId: string;

    status: 'CurrentlyIn' | 'Done' | 'Locked';
    inTime: Date;

    notes?: string;
}

export type InTimeLog = TimeLogBase & {
    status: 'CurrentlyIn';
};

export type OutTimeLog = TimeLogBase & {
    status: 'Done' | 'Locked';
    outTime: Date;
};

export type TimeLog = InTimeLog | OutTimeLog;

export type UserInfo = {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
}
