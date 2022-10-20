import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http'

import { Observable, ReplaySubject, share } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';

export interface StudentUpdate {
  id: number,
  name: string
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {

  constructor(private httpClient: HttpClient) {
  }

  private students = new ReplaySubject<Array<Student>>(1)
  private lastRefresh: Date|null = null;

  private hiddenStudents = new Set<number>();

  getAllStudents(): Observable<Array<Student>> {
    const now = new Date();
    if(this.lastRefresh == null || (now.getTime() - this.lastRefresh.getTime()) > environment.pollInterval) {
      this.refreshStudents();
    }
    return this.students;
  }

  hideStudent(studentId: number) {
    this.hiddenStudents.add(studentId);
    this.refreshStudents();
  }

  unhideStudent(studentId: number) {
    this.hiddenStudents.delete(studentId);
    this.refreshStudents();
  }

  refreshStudents(): void {
    this.httpClient.get<Array<Student>>(environment.apiRoot + '/students').subscribe(students => {
      const filtered = students.filter(it => !this.hiddenStudents.has(it.id));
      this.students.next(filtered);
      this.lastRefresh = new Date();
    })
  }

  getStudent(studentId: number): Observable<Student> {
    return this.httpClient.get<Student>(environment.apiRoot + '/students/' + studentId);
  }

  updateStudent(student: StudentUpdate): Observable<Student> {
    return this.httpClient.put<Student>(environment.apiRoot + '/students/' + student.id, student);
  }

  deleteStudent(studentId: number): Observable<HttpResponse<any>> {
    return this.httpClient.delete(environment.apiRoot + '/students/' + studentId, {
      observe: 'response'
    });
  }

  registerNewStudent(name: string): Observable<Student> {
    let postBody = {
      'name': name
    };
    return this.httpClient.post<Student>(environment.apiRoot + '/students', postBody);
  }
}
