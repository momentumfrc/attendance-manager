import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, map, ReplaySubject, startWith, Subject, Subscription, takeUntil, tap } from 'rxjs';
import { Student } from 'src/app/models/student.model';
import { StudentsService } from 'src/app/services/students.service';

@Component({
  selector: 'app-list-students',
  templateUrl: './list-students.component.html',
  styleUrls: ['./list-students.component.scss']
})
export class ListStudentsComponent implements OnInit, OnDestroy {
  studentSearch = new Subject<string>();
  allStudents = new BehaviorSubject<Array<Student>>([]);

  filteredStudents = new ReplaySubject<Array<Student>>(1);

  private allStudentSubscription!: Subscription

  constructor(
    private studentsService : StudentsService,
  ) { }

  ngOnInit(): void {
    // Get students from database
    this.allStudentSubscription = this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest([
      this.allStudents,
      (this.studentSearch).pipe(startWith(""))
    ]).pipe(
      map((values : [Array<Student>, string]) => {
      let students = (values[0] as Array<Student>);
      let search = values[1].toLocaleLowerCase();

      let value = students;

      // implement search
      if(search != "") {
        value = value.filter(student => student.name.toLocaleLowerCase().includes(search));
      }

      value = value.sort((a, b) => a.name.localeCompare(b.name));

      return value;
    })).subscribe(this.filteredStudents)
  }

  ngOnDestroy(): void {
    this.allStudentSubscription.unsubscribe();
  }

  refreshStudents(): void {
    this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));
  }
}
