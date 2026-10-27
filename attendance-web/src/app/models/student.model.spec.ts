import { DateTime } from "luxon";
import { areStudentsEqual, Student, StudentProfileImage } from "./student.model";

describe('areStudentsEqual', () => {
    const now = DateTime.now();

    const student = (profile_image?: StudentProfileImage): Student => ({
        id: 1,
        name: "Foo Bar",
        registered_by: 1,
        created_at: now,
        updated_at: now,
        profile_image
    });

    const image = (id: number): StudentProfileImage => ({
        id,
        student_id: 1,
        uploaded_by: 1,
        created_at: now,
        updated_at: now
    });

    it('should consider students with the same profile image equal', () => {
        expect(areStudentsEqual(student(image(1)), student(image(1)))).toBeTrue();
        expect(areStudentsEqual(student(), student())).toBeTrue();
    });

    it('should notice profile image changes', () => {
        expect(areStudentsEqual(student(image(1)), student(image(2)))).toBeFalse();
        expect(areStudentsEqual(student(), student(image(1)))).toBeFalse();
        expect(areStudentsEqual(student(image(1)), student())).toBeFalse();
    });
});
