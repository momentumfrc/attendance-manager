import { CheckIn } from './check-in.model';
import { CheckOut } from './check-out.model';

export interface Student {
    id: number,
    name: string,
    created_at: Date,
    updated_at: Date,
    last_check_in: CheckIn,
    last_check_out: CheckOut
}
