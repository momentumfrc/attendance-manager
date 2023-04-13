import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'

import { map, Observable, ReplaySubject, shareReplay, take } from 'rxjs';
import { environment } from 'src/environments/environment';

import { Student } from 'src/app/models/student.model';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private cachedStudents = new ReplaySubject<Map<number, Student>>(1);

  private lastRefresh: DateTime;

  constructor(private httpClient: HttpClient) {
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
    this.httpClient.get<Array<Student>>(environment.apiRoot + '/students').pipe(
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

  private deleteStudentsFromCache(deleted: number[]) {
    this.cachedStudents.pipe(
      take(1),
      map(student_map => {
        const student_map_copy = new Map(student_map);
        deleted.forEach(id => {
          student_map_copy.delete(id);
        })
        return student_map_copy;
      })
    ).subscribe(students => this.cachedStudents.next(students));
  }

  public getStudentMap(): Observable<Map<number, Student>> {
    this.checkCacheAge();
    return this.cachedStudents;
  }

  public getAllStudents(): Observable<Array<Student>> {
    this.checkCacheAge();
    return this.cachedStudents.pipe(map(student_map => Array.from(student_map.values())));
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

  public deleteStudent(studentId: number): Observable<boolean> {
    const request = this.httpClient.delete(environment.apiRoot + '/students/' + studentId, {
      observe: 'response'
    }).pipe(
      map(response => response.status == 200),
      shareReplay(1)
    );

    request.subscribe(success => {
      if(success) {
        this.deleteStudentsFromCache([studentId]);
      }
    })

    return request;
  }

  public registerNewStudent(name: string): Observable<Student> {
    const postBody = {
      'name': name
    };
    const request = this.httpClient.post<Student>(environment.apiRoot + '/students', postBody)
      .pipe(shareReplay(1));

    request.subscribe(newStudent => this.updateStudentsInCache([newStudent]));

    return request;
  }
}
