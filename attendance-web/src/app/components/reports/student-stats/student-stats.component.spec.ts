import { DateTime } from "luxon";
import { ReplaySubject, Subject, take } from "rxjs";
import { MeetingStudentCount, StudentStats } from "src/app/models/report-models";
import { Student } from "src/app/models/student.model";
import { ReportsService } from "src/app/services/reports.service";
import { StudentsService } from "src/app/services/students.service";
import { StudentStatsComponent } from "./student-stats.component";

describe('StudentStatsComponent', () => {
    let reportsServiceSpy: jasmine.SpyObj<ReportsService>;
    let component: StudentStatsComponent;

    const now = DateTime.fromISO('2026-01-02T03:04:05Z');
    const student = { id: 2, name: 'Student Two' } as Student;

    beforeEach(() => {
        const studentsServiceSpy = jasmine.createSpyObj<StudentsService>('StudentsService', ['getStudentMap']);
        reportsServiceSpy = jasmine.createSpyObj<ReportsService>('ReportsService', ['getMeetingList', 'getStudentStats']);

        // The students service's cache is a ReplaySubject, which never completes
        const students = new ReplaySubject<Map<number, Student>>(1);
        students.next(new Map([[student.id, student]]));
        studentsServiceSpy.getStudentMap.and.returnValue(students);

        component = new StudentStatsComponent(studentsServiceSpy, reportsServiceSpy);
        component.ngOnInit();
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    function currentCheckinCounts(): number[]|null {
        let counts: number[]|null = null;
        component.report.pipe(take(1)).subscribe(it => counts = it?.report.map(row => row.stats.checkin_count) ?? null);
        return counts;
    }

    function meetings(count: number): MeetingStudentCount[] {
        return Array.from({ length: count }, (_, i) => ({ meeting_date: now.minus({ days: i }), student_count: 1 }));
    }

    function stats(checkinCount: number): StudentStats[] {
        return [{ student_id: student.id, checkin_count: checkinCount, missed_checkout_count: 0, meeting_time: 0 }];
    }

    it('should not show stale stats while the stats for a new date range are loading', () => {
        const firstMeetings = new Subject<MeetingStudentCount[]>();
        const firstStats = new Subject<StudentStats[]>();
        const secondMeetings = new Subject<MeetingStudentCount[]>();
        const secondStats = new Subject<StudentStats[]>();
        reportsServiceSpy.getMeetingList.and.returnValues(firstMeetings, secondMeetings);
        reportsServiceSpy.getStudentStats.and.returnValues(firstStats, secondStats);

        component.updateDateSelection({ since: now.minus({ days: 7 }), until: now });
        firstMeetings.next(meetings(1));
        firstMeetings.complete();
        firstStats.next(stats(1));
        firstStats.complete();
        expect(currentCheckinCounts()).toEqual([1]);

        component.updateDateSelection({ since: now.minus({ years: 5 }), until: now });
        secondMeetings.next(meetings(5));
        secondMeetings.complete();
        expect(currentCheckinCounts()).toBeNull();

        secondStats.next(stats(5));
        secondStats.complete();
        expect(currentCheckinCounts()).toEqual([5]);
    });
});
