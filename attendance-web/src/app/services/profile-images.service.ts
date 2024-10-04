import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StudentProfileImage } from '../models/student.model';

interface DeleteProfileImageResponse {
  status: string
}

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

  constructor(private httpClient: HttpClient) { }

  deleteImage(photoId: number): Observable<void> {
    return this.httpClient.delete<DeleteProfileImageResponse>(environment.apiRoot + '/student-profile-images/' + photoId).pipe(
      map(response => {
        if(response.status !== "ok") {
          throw new Error(`Unexpected response, status="${response.status}"`);
        }
      })
    );
  }

  uploadImage(studentId: number, image: File): Observable<UploadResponse> {
    const allowed_mimetypes = ['image/png', 'image/jpeg'];
    if(!allowed_mimetypes.includes(image.type)) {
      throw new UploadValidationError("File has invalid type");
    }

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
