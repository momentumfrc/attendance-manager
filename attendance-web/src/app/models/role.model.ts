export type Permission = string;

export interface Role {
    name: string,
    permissions: Permission[]
};

export interface RolesResponse {
    roles: Role[],
    permissions: Permission[]
};
