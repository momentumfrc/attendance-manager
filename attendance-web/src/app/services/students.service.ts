import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'

import { Observable, share } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';

@Injectable({
  providedIn: 'root'
})
export class StudentsService {

  constructor(private httpClient: HttpClient) { }

  getAllStudents(): Observable<Array<Student>> {
    return this.httpClient.get<Array<Student>>(environment.apiRoot + '/students').pipe(share());
  }

  registerNewStudent(name: string): Observable<Student> {
    let postBody = {
      'name': name
    };
    return this.httpClient.post<Student>(environment.apiRoot + '/students', postBody);
  }
}
