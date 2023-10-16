import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, ReplaySubject, startWith, Subject, Subscription, takeUntil, tap } from 'rxjs';
import { Student, StudentList } from 'src/app/models/student.model';
import { StudentsService } from 'src/app/services/students.service';

@Component({
  selector: 'app-list-students',
  templateUrl: './list-students.component.html',
  styleUrls: ['./list-students.component.scss']
})
export class ListStudentsComponent implements OnInit, OnDestroy {
  studentSearch = new Subject<string>();
  allStudents = new ReplaySubject<Array<Student>>(1);

  filteredStudents = new ReplaySubject<StudentList>(1);

  private allStudentSubscription!: Subscription

  filterOptions = new FormGroup({
    showDeleted: new FormControl(false)
  });

  constructor(
    private studentsService : StudentsService,
  ) { }

  ngOnInit(): void {
    // Get students from database
    this.allStudentSubscription = this.studentsService.getAllStudents(true).subscribe((students) => this.allStudents.next(students));

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest({
      students: this.allStudents,
      search: this.studentSearch.pipe(startWith("")),
      filters: this.filterOptions.valueChanges.pipe(startWith(this.filterOptions.value))
    }).pipe(
      map(({students, search, filters}) => {
      search = search.toLocaleLowerCase();

      let value = students;

      // implement filters
      if(!filters.showDeleted) {
        value = students.filter(it => it.deleted_at == null);
      }

      // implement search
      if(search != "") {
        value = value.filter(student => student.name.toLocaleLowerCase().includes(search));
      }

      return new StudentList(value);
    })).subscribe(this.filteredStudents)
  }

  ngOnDestroy(): void {
    this.allStudentSubscription.unsubscribe();
  }

  refreshStudents(): void {
    this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));
  }
}
