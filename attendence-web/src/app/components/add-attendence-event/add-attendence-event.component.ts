import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, map, Observable, startWith, Subject, tap } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AttendenceService } from 'src/app/services/attendence.service';
import { CheckIn } from 'src/app/models/check-in.model';
import { CheckOut } from 'src/app/models/check-out.model';

@Component({
  selector: 'app-add-attendence-event',
  templateUrl: './add-attendence-event.component.html',
  styleUrls: ['./add-attendence-event.component.scss']
})
export class AddAttendenceEventComponent implements OnInit {
  allStudents : Array<Student> = []
  allStudentsSubject = new Subject<Array<Student>>()

  filteredStudents: Observable<Array<Student>>

  searchControl = new FormControl();

  constructor(
    private studentsService : StudentsService,
    private attendenceService : AttendenceService,
    private router: Router
  ) {
    studentsService.getAllStudents().subscribe((students: Array<Student>) => {
      this.allStudents = students;
      this.allStudentsSubject.next(this.allStudents);
    })
    this.filteredStudents = combineLatest([
      this.allStudentsSubject,
      (this.searchControl.valueChanges as Observable<string | null>).pipe(startWith(""))
    ]).pipe(map((values : Array<Array<Student> | string | null>) => {
      let students = (values[0] as Array<Student>);
      let search = ((values[1] as string | null) ?? "").toLocaleLowerCase();

      if(search == "") {
        return students;
      }

      return students.filter(student => student.name.split(" ")
        .some(namePart => namePart.toLocaleLowerCase().startsWith(search)));
    }));
  }

  ngOnInit(): void {
  }

  checkIn(student: Student): void {
    this.attendenceService.registerCheckIn(student.id).subscribe((checkin: CheckIn) => {
      let modIdx = this.allStudents.findIndex(student => student.id == checkin.student_id);
      this.allStudents[modIdx].last_check_in = checkin;
      this.allStudentsSubject.next(this.allStudents);
    })
  }

  checkOut(student: Student): void {
    this.attendenceService.registerCheckOut(student.id).subscribe((checkout: CheckOut) => {
      let modIdx = this.allStudents.findIndex(student => student.id == checkout.student_id);
      this.allStudents[modIdx].last_check_out = checkout;
      this.allStudentsSubject.next(this.allStudents);
    })
  }

  shouldDisableCheckIn(student: Student): boolean {
    if(student.last_check_in == null) {
      return false;
    }

    if(student.last_check_out == null) {
      return true;
    }

    return student.last_check_out.updated_at < student.last_check_in.updated_at;
  }

  shouldDisableCheckOut(student: Student): boolean {
    if(student.last_check_out == null) {
      return false;
    }

    if(student.last_check_in == null) {
      return true;
    }

    return student.last_check_in.updated_at < student.last_check_out.updated_at;
  }
}
