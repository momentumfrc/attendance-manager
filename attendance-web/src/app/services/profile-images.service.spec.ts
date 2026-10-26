import { HttpClient } from "@angular/common/http";
import { fakeAsync, tick } from "@angular/core/testing";
import { DateTime } from "luxon";
import { Observable, of, Subject, throwError } from "rxjs";
import { StudentProfileImage } from "../models/student.model";
import { ProfileImagesService } from "./profile-images.service";

describe('ProfileImagesService', () => {
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let service: ProfileImagesService;

    const profileImage = (id: number): StudentProfileImage => {
        const now = DateTime.now();
        return { id, student_id: id, uploaded_by: 1, created_at: now, updated_at: now };
    };
    const imageData = (id: number) => ({ id, student_id: id, data: btoa('png-' + id) });
    const requestedIds = (call: number) => (httpClientSpy.get.calls.argsFor(call)[1]?.params as Record<string, string>)['ids'];

    // Subscribe, and record every value emitted
    const watch = (urls: Observable<string|null>) => {
        const values: Array<string|null> = [];
        urls.subscribe(url => values.push(url));
        return values;
    };

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'delete']);
        service = new ProfileImagesService(httpClientSpy);
    });

    it('should fetch every image requested in the same tick in one request', fakeAsync(() => {
        httpClientSpy.get.and.returnValue(of([imageData(1), imageData(3)]));

        const three = watch(service.getImageUrl(profileImage(3)));
        const one = watch(service.getImageUrl(profileImage(1)));
        const threeAgain = watch(service.getImageUrl(profileImage(3)));
        expect(httpClientSpy.get).not.toHaveBeenCalled();
        expect(three).toEqual([]);

        tick();

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
        expect(requestedIds(0)).toBe('1,3');
        expect(one).toEqual([jasmine.stringMatching(/^blob:/)]);
        expect(three).toEqual([jasmine.stringMatching(/^blob:/)]);
        expect(threeAgain).toEqual(three);
        expect(one).not.toEqual(three);

        // loaded images are not fetched again
        expect(watch(service.getImageUrl(profileImage(1)))).toEqual(one);
        tick();
        expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
    }));

    it('should return the same observable for the same image', () => {
        httpClientSpy.get.and.returnValue(of([]));

        expect(service.getImageUrl(profileImage(1))).toBe(service.getImageUrl(profileImage(1)));
        expect(service.getImageUrl(null)).toBe(service.getImageUrl(undefined));
    });

    it('should emit null without a request when there is no image', fakeAsync(() => {
        expect(watch(service.getImageUrl(null))).toEqual([null]);
        tick();
        expect(httpClientSpy.get).not.toHaveBeenCalled();
    }));

    it('should not refetch images which are in flight', fakeAsync(() => {
        httpClientSpy.get.and.returnValue(new Subject<any>());

        service.getImageUrl(profileImage(1));
        tick();
        service.getImageUrl(profileImage(1));
        service.getImageUrl(profileImage(2));
        tick();

        expect(httpClientSpy.get).toHaveBeenCalledTimes(2);
        expect(requestedIds(1)).toBe('2');
    }));

    it('should emit null for images which are missing or failed, and not retry them', fakeAsync(() => {
        httpClientSpy.get.and.returnValue(of([imageData(1)]));
        const missing = watch(service.getImageUrl(profileImage(2)));
        service.getImageUrl(profileImage(1));
        tick();

        httpClientSpy.get.and.returnValue(throwError(() => new Error("request failed")));
        spyOn(console, 'error');
        const failed = watch(service.getImageUrl(profileImage(3)));
        tick();

        expect(missing).toEqual([null]);
        expect(failed).toEqual([null]);
        expect(console.error).toHaveBeenCalled();

        service.getImageUrl(profileImage(2));
        service.getImageUrl(profileImage(3));
        tick();
        expect(httpClientSpy.get).toHaveBeenCalledTimes(2);
    }));

    it('should forget deleted images', fakeAsync(() => {
        httpClientSpy.get.and.returnValue(of([imageData(1)]));
        httpClientSpy.delete.and.returnValue(of({ status: 'ok' }));
        const before = service.getImageUrl(profileImage(1));
        const urls = watch(before);
        tick();
        spyOn(URL, 'revokeObjectURL');

        service.deleteImage(1).subscribe();

        expect(URL.revokeObjectURL).toHaveBeenCalledWith(urls[0]!);
        expect(service.getImageUrl(profileImage(1))).not.toBe(before);
        tick();
    }));

    it('should revoke images deleted while they are loading', fakeAsync(() => {
        const response = new Subject<any>();
        httpClientSpy.get.and.returnValue(response);
        httpClientSpy.delete.and.returnValue(of({ status: 'ok' }));
        const urls = watch(service.getImageUrl(profileImage(1)));
        tick();
        spyOn(URL, 'revokeObjectURL');

        service.deleteImage(1).subscribe();
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();

        response.next([imageData(1)]);

        expect(URL.revokeObjectURL).toHaveBeenCalledWith(urls[0]!);
    }));
});
