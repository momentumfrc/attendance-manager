import { DateTime } from "luxon";

export interface User {
    id: number,
    name: string,
    slack_id: string,
    avatar: string,
    created_at: DateTime,
    updated_at: DateTime,
    role_names: Array<string>
}
