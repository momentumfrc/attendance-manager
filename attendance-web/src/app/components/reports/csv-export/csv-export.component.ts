import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateTime } from 'luxon';
import { Papa } from 'ngx-papaparse';
import { MapObject } from 'ngx-papaparse/lib/interfaces/unparse-data';
import { BehaviorSubject, forkJoin, map, take } from 'rxjs';
import { AttendanceService } from 'src/app/services/attendance.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';
import { SelectedDateRange } from '../../reuse/date-picker/date-picker.component';

@Component({
    selector: 'app-csv-export',
    templateUrl: './csv-export.component.html',
    styleUrls: ['./csv-export.component.scss'],
    standalone: false
})
export class CsvExportComponent implements OnInit {
  dateRangeSelection : SelectedDateRange|null = null;

  constructor(
    private attendanceService: AttendanceService,
    private studentsService: StudentsService,
    private usersService: UsersService,
    private papa: Papa
  ) {}

  ngOnInit(): void {
  }

  downloadCsv() {
    if(this.dateRangeSelection == null) {
      return;
    }

    forkJoin([
      this.attendanceService.getEvents(this.dateRangeSelection),
      this.studentsService.getAllStudents().pipe(take(1)),
      this.usersService.getAllUsers()
    ]).pipe(
      map( ([events, students, users]) =>  {
        const studentNameMap = new Map<number, string>();
        students.forEach(student => studentNameMap.set(student.id, student.name));

        const userNameMap = new Map<number, string>();
        users.forEach(user => userNameMap.set(user.id, user.name));
        const keys = ["event_id", "student_id", "student_name", "event_registered_by_id", "event_registered_by_name", "event_type", "event_created_at"];
        const values = events.map(event =>
          [
            event.id,
            event.student_id,
            studentNameMap.get(event.student_id) ?? "UNDEFINED",
            event.registered_by,
            userNameMap.get(event.registered_by) ?? "UNDEFINED",
            event.type as string,
            event.created_at.toISO() ?? "UNKNOWN"
          ]);
        const unparseData : MapObject = {
          fields: keys,
          data: values
        };

        return this.papa.unparse(unparseData, {
          quotes: true,
          header: true
        });
      })
    ).subscribe(data => {
      let element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
      element.setAttribute('download', 'report.csv');

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    });
  }

}
