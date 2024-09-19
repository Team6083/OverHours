
export interface SignInLog {
    id: string;
    name: string;
    signInTime: Date;
    signOutTime?: Date;
    season: string;

    lockStatus?: "auto" | "manual";
    lockedBy?: string;

    accumSec?: number;
    accumNotes?: string;
}
