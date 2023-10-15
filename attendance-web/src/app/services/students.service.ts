import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http'

import { catchError, filter, map, Observable, of, OperatorFunction, ReplaySubject, shareReplay, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';
import { DateTime } from 'luxon';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { ErrorService } from './error.service';
import { PollService } from './poll.service';

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private cachedStudents = new ReplaySubject<Map<number, Student>>(1);
  private lastRefresh: DateTime;

  private areDeletedStudentsCached: boolean = false;

  constructor(
    private httpClient: HttpClient,
    private pollService: PollService,
    private errorService: ErrorService
  ) {
    this.invalidateCache();
    this.lastRefresh = DateTime.now();
  }

  private checkForUpdates(retrieveDeletedStudents: boolean) {
    const now = DateTime.now();
    if(retrieveDeletedStudents && !this.areDeletedStudentsCached) {
      this.invalidateCache(true);
      this.areDeletedStudentsCached = true;
      return;
    }
    if(now.diff(this.lastRefresh).toMillis() > environment.pollInterval) {
      this.pollService.getUpdates({since: this.lastRefresh}).subscribe(response => {
        this.lastRefresh = now;
        this.updateStudentsInCache(response.updated_students);
      })
    }
  }

  public invalidateCache(retrieveDeletedStudents: boolean = false) {
    let params = new HttpParams();
    params = params.set('includeDeleted', retrieveDeletedStudents ? 1 : 0);

    this.lastRefresh = DateTime.now();
    this.httpClient.get<Array<Student>>(environment.apiRoot + '/students', {
      params,
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

  private querySingleStudent(id: number): Observable<Student|undefined> {
    return this.httpClient.get<Student>(environment.apiRoot + '/students/' + id, {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      catchError(error => {
        if(error instanceof HttpErrorResponse) {
          if(error.status == 404) {
            return of(undefined);
          }
        }
        throw error;
      }),
      this.errorService.interceptErrors()
    );
  }

  public refreshSingleStudent(id: number) {
    const request = this.querySingleStudent(id).pipe(
      filter(it => it !== undefined) as OperatorFunction<Student|undefined, Student>
    ).subscribe(student => this.updateStudentsInCache([student]));
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

  public getStudentMap(includeDeleted: boolean = true): Observable<Map<number, Student>> {
    this.checkForUpdates(includeDeleted);
    if(includeDeleted) {
      return this.cachedStudents;
    } else {
      return this.cachedStudents.pipe(
        map(students => new Map([...students].filter(([_, value]) => value.deleted_at == null)))
      );
    }
  }

  public getAllStudents(includeDeleted: boolean = true): Observable<Array<Student>> {
    this.checkForUpdates(includeDeleted);
    return this.cachedStudents.pipe(map(student_map => {
      let student_arr = Array.from(student_map.values());
      if(!includeDeleted) {
        student_arr = student_arr.filter(student => student.deleted_at == null)
      }
      return student_arr;
    }));
  }

  public getStudent(studentId: number): Observable<Student|undefined> {
    this.checkForUpdates(false);
    return this.cachedStudents.pipe(
      map(students => students.get(studentId)),
      // If we get undefined, it doesn't necessarily mean the student doesn't exist. It could be
      // that the student is deleted and we haven't retrieved deleted students from the backend.
      // So if we get undefined, we need to check with the backend.
      switchMap(student => {
        if(student) {
          return of(student);
        } else {
          return this.querySingleStudent(studentId).pipe(
            tap(student => {
              if(student !== undefined) {
                this.updateStudentsInCache([student]);
              }
            })
          );
        }
      })
    );
  }

  public updateStudent(id: number, update: {
    name: string,
    graduation_year?: number
  }): Observable<Student> {
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

  public registerNewStudent(student: {
    name: string,
    graduation_year?: number
  }): Observable<Student> {
    let params = {
      action: "create",
      ...student
    };

    const request = this.httpClient.post<Student>(environment.apiRoot + '/students', params)
      .pipe(shareReplay(1));

    request.subscribe(newStudent => this.updateStudentsInCache([newStudent]));

    return request;
  }
}
