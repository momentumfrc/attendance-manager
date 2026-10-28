import { DateTime } from "luxon";
import { areStudentsEqual, hasSignedContract, isRegistered, RegistrationStep, Student, StudentProfileImage } from "./student.model";

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

    it('should notice registration changes', () => {
        const registered = (contract: number|null): Student => ({
            ...student(),
            registration: {student_contract: contract, shared_science: null, first_cr: null}
        });

        expect(areStudentsEqual(registered(1), registered(1))).toBeTrue();
        expect(areStudentsEqual(registered(1), registered(2))).toBeFalse();
        expect(areStudentsEqual(registered(1), registered(null))).toBeFalse();
        expect(areStudentsEqual(student(), registered(null))).toBeTrue();
    });
});

describe('registration status', () => {
    const now = DateTime.now();

    const student = (steps: RegistrationStep[]): Student => ({
        id: 1,
        name: "Foo Bar",
        registered_by: 1,
        created_at: now,
        updated_at: now,
        registration: {
            student_contract: steps.includes(RegistrationStep.STUDENT_CONTRACT) ? 1 : null,
            shared_science: steps.includes(RegistrationStep.SHARED_SCIENCE) ? 2 : null,
            first_cr: steps.includes(RegistrationStep.FIRST_CR) ? 3 : null
        }
    });

    const {STUDENT_CONTRACT, SHARED_SCIENCE, FIRST_CR} = RegistrationStep;

    it('should know whether the contract is signed', () => {
        expect(hasSignedContract(student([STUDENT_CONTRACT]))).toBeTrue();
        expect(hasSignedContract(student([SHARED_SCIENCE, FIRST_CR]))).toBeFalse();
        expect(hasSignedContract({...student([]), registration: undefined})).toBeFalse();
    });

    it('should require every step to be registered', () => {
        expect(isRegistered(student([STUDENT_CONTRACT, SHARED_SCIENCE, FIRST_CR]))).toBeTrue();
        expect(isRegistered(student([STUDENT_CONTRACT, SHARED_SCIENCE]))).toBeFalse();
        expect(isRegistered(student([]))).toBeFalse();
        expect(isRegistered({...student([]), registration: undefined})).toBeFalse();
    });

});
