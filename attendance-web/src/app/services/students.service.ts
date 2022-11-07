import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http'

import { BehaviorSubject, combineLatest, map, Observable, ReplaySubject, share, Subject, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';

export interface StudentUpdate {
  id: number,
  name: string
}

export enum PendingUpdateType {
  UPDATE,
  DELETE
}

export class PendingUpdate {
  constructor(
    public student: Student,
    public updateType: PendingUpdateType,
    public commitAction: (update: PendingUpdate) => Observable<void>
  ) {}

  private committed = false;

  commit(): Observable<void> {
    if(this.committed) {
      return throwError(() => new Error("Attempt to commit already-committed update"));
    }
    this.committed = true;
    return this.commitAction(this);
  }
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private backendStudents = new Subject<Array<Student>>();

  private pendingUpdates = new BehaviorSubject(new Map<number, PendingUpdate>());
  private nextUpdateId = 1;

  private students = new ReplaySubject<Array<Student>>(1);

  private lastRefresh: Date|null = null;

  constructor(private httpClient: HttpClient) {
    // Apply the current pending updates to the backendStudents and save it in students
    combineLatest({
      students: this.backendStudents,
      updates: this.pendingUpdates
    }).pipe(
      map(({students, updates}) => {
        let updated = students;
        updates.forEach( update => {
          switch(update.updateType) {
            case PendingUpdateType.DELETE:
              updated = updated.filter(it => it.id != update.student.id);
              break;
            case PendingUpdateType.UPDATE:
              updated = updated.map(it => {
                if(it.id == update.student.id) {
                  return update.student;
                } else {
                  return it;
                }
              });
              break;
          }
        });
        return updated;
      })
    ).subscribe(this.students);
  }

  getAllStudents(): Observable<Array<Student>> {
    const now = new Date();
    if(this.lastRefresh == null || (now.getTime() - this.lastRefresh.getTime()) > environment.pollInterval) {
      this.refreshStudents();
    }
    return this.students;
  }

  addPendingUpdate(update: PendingUpdate): number {
    let id = this.nextUpdateId;
    this.nextUpdateId += 1;

    let updates = this.pendingUpdates.getValue();
    updates.set(id, update);

    this.pendingUpdates.next(updates);

    return id;
  }

  clearPendingUpdate(id: number): PendingUpdate|undefined {
    let updates = this.pendingUpdates.getValue();
    let update = updates.get(id);
    updates.delete(id);
    this.pendingUpdates.next(updates);
    return update;
  }

  commitPendingUpdate(id: number): void {
    let update = this.pendingUpdates.getValue().get(id);
    if(update) {
      update.commit().subscribe(() => {
        this.refreshStudents().subscribe(() => {
          this.clearPendingUpdate(id);
        })
      })
    }
  }

  isUpdatePending(): boolean {
    return this.pendingUpdates.getValue().size > 0;
  }

  refreshStudents(): Observable<void> {
    const request = this.httpClient.get<Array<Student>>(environment.apiRoot + '/students').pipe(share());
    request.subscribe(students => {
      this.backendStudents.next(students);
      this.lastRefresh = new Date();
    })
    return request.pipe(map(it => void 0));
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
