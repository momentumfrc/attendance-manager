import { HttpClient, HttpParams } from "@angular/common/http";
import { DateTime } from "luxon";
import { of } from "rxjs";
import { ReportsService } from "./reports.service";

describe('ReportsService', () => {
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let service: ReportsService;

    const requestParams = () => httpClientSpy.get.calls.mostRecent().args[1]?.params as HttpParams;
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
        httpClientSpy.get.and.returnValue(of([]));
        service = new ReportsService(httpClientSpy);
    });

    it('should send the browser timezone and exact range when listing meetings', () => {
        const since = DateTime.fromISO('2024-01-01T00:00:00');
        const until = DateTime.fromISO('2024-02-01T00:00:00');

        service.getMeetingList({ since, until }).subscribe();

        expect(requestParams().get('timezone')).toBe(browserTimezone);
        expect(requestParams().get('since')).toBe(String(since.toSeconds()));
        expect(requestParams().get('until')).toBe(String(until.toSeconds()));
    });

    it('should send the browser timezone for meeting attendance', () => {
        service.getMeetingAttendance({ meeting_date: DateTime.fromISO('2024-07-02') }).subscribe();
        expect(requestParams().get('timezone')).toBe(browserTimezone);
        expect(requestParams().get('on')).toBe('2024-07-02');

        service.getMeetingAttendance().subscribe();
        expect(requestParams().get('timezone')).toBe(browserTimezone);
    });
});
