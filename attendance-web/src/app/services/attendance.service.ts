import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';

import { CheckIn } from 'src/app/models/check-in.model';
import { CheckOut } from 'src/app/models/check-out.model';


@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  constructor(private httpClient: HttpClient) { }

  registerCheckIn(studentId: number): Observable<CheckIn> {
    return this.httpClient.post<CheckIn>(environment.apiRoot + '/attendance/check-in', {
      'student_id': studentId
    });
  }

  registerCheckOut(studentId: number): Observable<CheckOut> {
    return this.httpClient.post<CheckOut>(environment.apiRoot + '/attendance/check-out', {
      'student_id': studentId
    });
  }
}
