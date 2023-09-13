import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http'

import { catchError, map, Observable, of, ReplaySubject, shareReplay, take } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';
import { DateTime } from 'luxon';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private cachedStudents = new ReplaySubject<Map<number, Student>>(1);

  private lastRefresh: DateTime;

  constructor(
    private httpClient: HttpClient,
    private errorService: ErrorService
  ) {
    this.refreshStudents();
    this.lastRefresh = DateTime.now();
  }

  private checkCacheAge() {
    const now = DateTime.now();
    if(now.diff(this.lastRefresh).toMillis() > environment.pollInterval) {
      this.refreshStudents();
    }
  }

  public refreshStudents() {
    this.lastRefresh = DateTime.now();
    this.httpClient.get<Array<Student>>(environment.apiRoot + '/students', {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      catchError(error => {
        if(error instanceof HttpErrorResponse) {
          if(error.status == 401) {
            return of([]);
          }
        }
        throw error;
      }),
      this.errorService.interceptErrors(),
      map(students => new Map(students.map(student => [student.id, student])))
    ).subscribe(students => this.cachedStudents.next(students));
  }

  public refreshSingleStudent(id: number) {
    const request = this.httpClient.get<Student>(environment.apiRoot + '/students/' + id)
      .subscribe(student => this.updateStudentsInCache([student]));
  }

  public updateStudentsInCache(new_students: Student[]) {
    this.cachedStudents.pipe(
      take(1),
      map(student_map => {
        const student_map_copy = new Map(student_map);
        new_students.forEach(student => {
          student_map_copy.set(student.id, student);
        })
        return student_map_copy;
      })
    ).subscribe(students => this.cachedStudents.next(students));
  }

  public getStudentMap(includeDeleted: boolean = false): Observable<Map<number, Student>> {
    this.checkCacheAge();
    if(includeDeleted) {
      return this.cachedStudents;
    } else {
      return this.cachedStudents.pipe(
        map(students => new Map([...students].filter(([_, value]) => value.deleted_at == null)))
      );
    }
  }

  public getAllStudents(includeDeleted: boolean = false): Observable<Array<Student>> {
    this.checkCacheAge();
    return this.cachedStudents.pipe(map(student_map => {
      let student_arr = Array.from(student_map.values());
      if(!includeDeleted) {
        student_arr = student_arr.filter(student => student.deleted_at == null)
      }
      return student_arr;
    }));
  }

  public getStudent(studentId: number): Observable<Student|undefined> {
    this.checkCacheAge();
    return this.cachedStudents.pipe(map(students => students.get(studentId)));
  }

  public updateStudent(id: number, update: {name: string}): Observable<Student> {
    const request = this.httpClient.put<Student>(environment.apiRoot + '/students/' + id, update)
      .pipe(shareReplay(1));

    request.subscribe(updatedStudent => this.updateStudentsInCache([updatedStudent]));

    return request;
  }

  public deleteStudent(studentId: number): Observable<Student> {
    const request = this.httpClient.delete<Student>(environment.apiRoot + '/students/' + studentId, {})
      .pipe(shareReplay(1));

    request.subscribe(student => this.updateStudentsInCache([student]));

    return request;
  }

  public undoDeleteStudent(studentId: number): Observable<Student> {
    const postBody = {
      'action': 'restore',
      'id': studentId
    };
    const request = this.httpClient.post<Student>(environment.apiRoot + '/students', postBody)
      .pipe(shareReplay(1));

    request.subscribe(restoredStudent => this.updateStudentsInCache([restoredStudent]));

    return request;
  }

  public registerNewStudent(name: string): Observable<Student> {
    const postBody = {
      'action': 'create',
      'name': name
    };
    const request = this.httpClient.post<Student>(environment.apiRoot + '/students', postBody)
      .pipe(shareReplay(1));

    request.subscribe(newStudent => this.updateStudentsInCache([newStudent]));

    return request;
  }
}
