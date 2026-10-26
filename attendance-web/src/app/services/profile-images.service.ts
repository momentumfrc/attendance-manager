import { HttpClient, HttpContext, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { buffer, catchError, debounceTime, filter, map, mergeMap, Observable, of, ReplaySubject, Subject, take } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { ProfileImageData, StudentProfileImage } from '../models/student.model';

interface DeleteProfileImageResponse {
  status: string
}

const NO_IMAGE: Observable<string|null> = of(null);

export enum UploadStatus {
  IN_PROGRESS,
  DONE
};

export interface UploadResponse {
  status: UploadStatus;
  progress: number;
  photoResponse?: StudentProfileImage;
};

export class UploadValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, UploadValidationError.prototype);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProfileImagesService {

  // One subject per requested image, keyed by image id. Each emits the image's object URL once it
  // loads, or null if it couldn't be loaded. Failed images are not retried, so a failure can't cause a request loop.
  private images = new Map<number, ReplaySubject<string|null>>();
  private requestedIds = new Subject<number>();

  constructor(private httpClient: HttpClient) {
    // Images are not served individually, as that makes pages showing every student's image very
    // slow. Instead, every image requested in the same tick is fetched in a single request.
    this.requestedIds.pipe(
      buffer(this.requestedIds.pipe(debounceTime(0))),
      // Capture the subjects now, so images deleted while the request is in flight still emit (and get revoked)
      map(ids => new Map(ids.map(id => [id, this.images.get(id)]))),
      mergeMap(subjects => this.fetchImages([...subjects.keys()]).pipe(
        map(images => ({subjects, images}))
      ))
    ).subscribe(({subjects, images}) => {
      const urls = new Map(images.map(image => {
        const bytes = Uint8Array.from(atob(image.data), c => c.charCodeAt(0));
        return [image.id, URL.createObjectURL(new Blob([bytes], {type: 'image/png'}))];
      }));
      subjects.forEach((subject, id) => subject?.next(urls.get(id) ?? null));
    });
  }

  /**
   * Get a URL for displaying an image. Emits nothing until the image is loaded, then emits its
   * URL, or null if it couldn't be loaded (or there is no image). The same observable is returned
   * for every call with the same image, so templates can use it with the async pipe.
   */
  getImageUrl(profileImage: StudentProfileImage|null|undefined): Observable<string|null> {
    if(!profileImage) {
      return NO_IMAGE;
    }

    let image = this.images.get(profileImage.id);
    if(image === undefined) {
      image = new ReplaySubject<string|null>(1);
      this.images.set(profileImage.id, image);
      this.requestedIds.next(profileImage.id);
    }
    return image;
  }

  private fetchImages(ids: number[]): Observable<ProfileImageData[]> {
    // Sort the ids, so the request url (and so the browser's cached response) is stable between page loads
    const sortedIds = [...ids].sort((a, b) => a - b);

    return this.httpClient.get<ProfileImageData[]>(environment.apiRoot + '/student-profile-images', {
      params: { ids: sortedIds.join(',') },
      // A missing image shouldn't take the user to the error page, it just shows the placeholder
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      catchError(error => {
        console.error("Failed to load profile images", error);
        return of([]);
      })
    );
  }

  deleteImage(photoId: number): Observable<void> {
    return this.httpClient.delete<DeleteProfileImageResponse>(environment.apiRoot + '/student-profile-images/' + photoId).pipe(
      map(response => {
        if(response.status !== "ok") {
          throw new Error(`Unexpected response, status="${response.status}"`);
        }

        // If the image is still loading, this revokes its URL once it arrives
        this.images.get(photoId)?.pipe(take(1)).subscribe(url => {
          if(url) {
            URL.revokeObjectURL(url);
          }
        });
        this.images.delete(photoId);
      })
    );
  }

  uploadImage(studentId: number, image: Blob): Observable<UploadResponse> {

    // Files must be <= 1024 kb
    // TODO: move this value to the environment instead of hard-coding it here
    if(image.size >= 1024 * 1000) {
      throw new UploadValidationError("File size exceeds limit of 1MB");
    }


    const formData = new FormData();
    formData.append("student_id", studentId.toString());
    formData.append("image", image);

    return this.httpClient.post(environment.apiRoot + "/student-profile-images", formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      filter(event => {
        const relevantEvents = [HttpEventType.UploadProgress, HttpEventType.Response];
        return relevantEvents.includes(event.type);
      }),
      map(event => {
        if(event.type == HttpEventType.UploadProgress) {
          return {
            status: UploadStatus.IN_PROGRESS,
            progress: Math.round(100 * event.loaded / (event.total ?? 1))
          };
        } else if(event.type == HttpEventType.Response) {
          return {
            status: UploadStatus.DONE,
            progress: 1,
            photoResponse: event.body as StudentProfileImage
          };
        } else {
          throw new Error("Unexpected event type " + event.type.toString());
        }
      })
    )
  }
}
