export type APITimeLog = {
    id: string;
    userId: string;
    status: 'currently-in' | 'done' | 'locked';
    inTime: string;
    outTime: string | null;
    notes: string;
}

interface TimeLogBase {
    id: string;
    userId: string;

    status: 'currently-in' | 'done' | 'locked';
    inTime: Date;

    notes?: string;

    season: string;
}

export type InTimeLog = TimeLogBase & {
    status: 'currently-in';
};

export type OutTimeLog = TimeLogBase & {
    status: 'done' | 'locked';
    outTime: Date;
};

export type TimeLog = InTimeLog | OutTimeLog;

export type UserInfo = {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
}
