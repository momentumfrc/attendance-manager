export interface User {
    id: number,
    name: string,
    slack_id: string,
    avatar: string,
    created_at: Date,
    updated_at: Date,
    role_names: Array<string>
}
