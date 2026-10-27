import { HttpClient, HttpParams } from "@angular/common/http";
import { fakeAsync, tick } from "@angular/core/testing";
import { of } from "rxjs";
import { environment } from "src/environments/environment";
import { PollService } from "./poll.service";

describe('PollService', () => {
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let service: PollService;
    let visibility: DocumentVisibilityState;

    const pollCount = () => httpClientSpy.get.calls.count();
    const lastSince = () => Number((httpClientSpy.get.calls.mostRecent().args[1]?.params as HttpParams).get('since'));
    const setVisibility = (state: DocumentVisibilityState) => {
        visibility = state;
        document.dispatchEvent(new Event('visibilitychange'));
    };

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
        httpClientSpy.get.and.returnValue(of({updated_students: [], meeting_events: []}));
        service = new PollService(httpClientSpy);
        visibility = 'visible';
        spyOnProperty(document, 'visibilityState', 'get').and.callFake(() => visibility);
    });

    it('should poll repeatedly while the page is visible', fakeAsync(() => {
        const subscription = service.getPollingObservable().subscribe();
        tick(environment.pollInterval * 4);
        expect(pollCount()).toBeGreaterThanOrEqual(4);
        subscription.unsubscribe();
    }));

    it('should not poll while the page is hidden', fakeAsync(() => {
        visibility = 'hidden';
        const subscription = service.getPollingObservable().subscribe();
        tick(environment.pollInterval * 10);
        expect(pollCount()).toBe(0);
        subscription.unsubscribe();
    }));

    it('should resume when visible again and catch up on changes made while hidden', fakeAsync(() => {
        const subscription = service.getPollingObservable().subscribe();
        tick(environment.pollInterval * 2);

        setVisibility('hidden');
        const hiddenAt = Date.now();
        const countWhenHidden = pollCount();
        tick(60_000);
        expect(pollCount()).toBe(countWhenHidden);

        setVisibility('visible');
        tick(0);
        expect(pollCount()).toBe(countWhenHidden + 1);
        expect(lastSince()).toBeLessThanOrEqual(Math.floor(hiddenAt / 1000));

        subscription.unsubscribe();
    }));

    for(const event of ['pageshow', 'focus']) {
        it(`should resume on ${event} if visibilitychange was missed`, fakeAsync(() => {
            const subscription = service.getPollingObservable().subscribe();
            tick(0);
            setVisibility('hidden');
            const countWhenHidden = pollCount();

            visibility = 'visible';
            tick(60_000);
            expect(pollCount()).toBe(countWhenHidden);

            window.dispatchEvent(new Event(event));
            tick(0);
            expect(pollCount()).toBe(countWhenHidden + 1);

            subscription.unsubscribe();
        }));
    }

    it('should not restart polling on focus while already visible', fakeAsync(() => {
        const subscription = service.getPollingObservable().subscribe();
        tick(0);
        const count = pollCount();

        window.dispatchEvent(new Event('focus'));
        tick(0);
        expect(pollCount()).toBe(count);

        subscription.unsubscribe();
    }));
});
