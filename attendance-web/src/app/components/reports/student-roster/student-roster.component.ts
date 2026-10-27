import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { DateTime } from 'luxon';
import { combineLatest, map, Observable, of, share, startWith, switchMap } from 'rxjs';
import { CsvColumn, ExportableTableComponent } from 'src/app/components/reuse/exportable-table/exportable-table.component';
import { SpinnerComponent } from 'src/app/components/reuse/spinner/spinner.component';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

interface EnrichedStudent {
  student: Student,
  registered_by: User
}

interface StudentRosterReport {
  students: EnrichedStudent[],
  columns: string[],
  csvColumns: CsvColumn<EnrichedStudent>[]
}

@Component({
  selector: 'app-student-roster',
  imports: [AsyncPipe, ReactiveFormsModule, MatSlideToggleModule, MatCardModule, MatTableModule, SpinnerComponent, MatIconModule, ExportableTableComponent],
  templateUrl: './student-roster.component.html',
  styleUrl: './student-roster.component.scss',
})
export class StudentRosterComponent {
  showDeleted = new FormControl(false, {nonNullable: true});

  studentReport: Observable<StudentRosterReport>;

  dateShort = DateTime.DATE_SHORT;

  constructor(private studentsService: StudentsService, private usersService: UsersService) {
    this.studentReport = this.showDeleted.valueChanges.pipe(
      startWith(this.showDeleted.value),
      switchMap(includeDeleted => studentsService.getAllStudents(includeDeleted).pipe(
        switchMap(students => combineLatest({
          students: of(students),
          users: usersService.getSomeUsers([...new Set(students.map(s => s.registered_by))])
        })),
        map(({students, users}) => students
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(student => ({student, registered_by: users.get(student.registered_by)}) as EnrichedStudent)),
        map(enrichedStudents => ({
          students: enrichedStudents,
          columns: this.getReportColumns(includeDeleted),
          csvColumns: this.getCsvColumns(includeDeleted)
        }) as StudentRosterReport)
      )),
      share()
    );
  }

  getReportColumns(includeDeleted: boolean): string[] {
    let columns = ['student-name', 'grad-year', 'registered-by', 'registered-at'];
    if(includeDeleted) {
      columns.push('deleted-at');
    }
    return columns;
  }

  getCsvColumns(includeDeleted: boolean): CsvColumn<EnrichedStudent>[] {
    let columns: CsvColumn<EnrichedStudent>[] = [
      { header: 'student_id', value: enriched => enriched.student.id },
      { header: 'student_name', value: enriched => enriched.student.name },
      { header: 'graduation_year', value: enriched => enriched.student.graduation_year },
      { header: 'registered_by_id', value: enriched => enriched.student.registered_by },
      { header: 'registered_by_name', value: enriched => enriched.registered_by?.name },
      { header: 'registered_at', value: enriched => enriched.student.created_at.toISO() }
    ];
    if(includeDeleted) {
      columns.push({ header: 'deleted_at', value: enriched => enriched.student.deleted_at?.toISO() });
    }
    return columns;
  }
}
