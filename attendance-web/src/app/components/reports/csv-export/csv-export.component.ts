import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateTime } from 'luxon';
import { Papa } from 'ngx-papaparse';
import { BehaviorSubject, forkJoin, map, switchMap, take } from 'rxjs';
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
      this.attendanceService.getEvents(this.dateRangeSelection).pipe(
        switchMap(events => this.usersService.getSomeUsers([...new Set(events.map(event => event.registered_by))]).pipe(
          map(users => ({events, users}))
        ))
      ),
      this.studentsService.getAllStudents().pipe(take(1))
    ]).pipe(
      map( ([{events, users}, students]) =>  {
        const studentNameMap = new Map<number, string>();
        students.forEach(student => studentNameMap.set(student.id, student.name));

        const keys = ["event_id", "student_id", "student_name", "event_registered_by_id", "event_registered_by_name", "event_type", "event_created_at"];
        const values = events.map(event =>
          [
            event.id,
            event.student_id,
            studentNameMap.get(event.student_id) ?? "UNDEFINED",
            event.registered_by,
            users.get(event.registered_by)?.name ?? "UNDEFINED",
            event.type as string,
            event.created_at.toISO() ?? "UNKNOWN"
          ]);
        const unparseData = {
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
