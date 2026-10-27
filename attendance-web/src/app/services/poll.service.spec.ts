import { HttpClient, HttpParams } from "@angular/common/http";
import { fakeAsync, tick } from "@angular/core/testing";
import { delay, of } from "rxjs";
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

    it('should deliver responses slower than the poll interval without overlapping requests', fakeAsync(() => {
        const latency = environment.pollInterval * 3;
        httpClientSpy.get.and.returnValue(of({updated_students: [], meeting_events: []}).pipe(delay(latency)));
        let responses = 0;
        const subscription = service.getPollingObservable().subscribe(() => responses++);

        tick(latency * 3);
        expect(responses).toBeGreaterThanOrEqual(2);
        expect(pollCount()).toBeLessThanOrEqual(responses + 1);

        subscription.unsubscribe();
    }));

    it('should ask for changes since the previous request was sent, not when its response arrived', fakeAsync(() => {
        const latency = 5000;
        httpClientSpy.get.and.returnValue(of({updated_students: [], meeting_events: []}).pipe(delay(latency)));
        const subscription = service.getPollingObservable().subscribe();

        tick(0);
        const firstRequestAt = Date.now();
        tick(latency + environment.pollInterval);
        expect(pollCount()).toBe(2);
        expect(lastSince()).toBeLessThanOrEqual(Math.floor(firstRequestAt / 1000));

        subscription.unsubscribe();
        tick(latency);
    }));

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
