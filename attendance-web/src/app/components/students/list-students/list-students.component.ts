import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { DateTime, Duration } from 'luxon';
import { BehaviorSubject, combineLatest, debounceTime, map, Observable, ReplaySubject, skip, startWith, Subject, Subscription, take, takeUntil, tap } from 'rxjs';
import { Student, StudentList, compareStudents } from 'src/app/models/student.model';
import { AuthService } from 'src/app/services/auth.service';
import { StudentsService } from 'src/app/services/students.service';

@Component({
  selector: 'app-list-students',
  templateUrl: './list-students.component.html',
  styleUrls: ['./list-students.component.scss']
})
export class ListStudentsComponent implements OnInit, OnDestroy {
  private readonly graduationTimeInYear = Duration.fromObject({
    months: 6,
    days: 18
  });

  studentSearch = new Subject<string>();
  allStudents = new ReplaySubject<Array<Student>>(1);

  studentCheckControls = new ReplaySubject<FormArray<FormControl<boolean>>>(1);

  filteredStudents = new ReplaySubject<[number[], StudentList]>(1);
  combinedFilteredStudentAndControls = new ReplaySubject<[StudentList, FormControl<boolean>[]]>(1);

  showEditSubject = new BehaviorSubject<boolean>(false);
  showEditControl = new FormControl(false, {nonNullable: true});

  everyCheckedStudentNotDeleted: Observable<boolean>;
  everyCheckedStudentDeleted: Observable<boolean>;
  noStudentChecked: Observable<boolean>;

  checkedStudents = new BehaviorSubject<Student[]>([]);

  private allStudentSubscription!: Subscription

  showDeleted = new FormControl(false, {nonNullable: true});

  constructor(
    private studentsService : StudentsService,
    public authService: AuthService,
    private router: Router
  ) {
    this.everyCheckedStudentNotDeleted = this.checkedStudents.pipe(
      map(students => students.find(it => it.deleted_at != undefined) == undefined)
    );
    this.everyCheckedStudentDeleted = this.checkedStudents.pipe(
      map(students => students.find(it => it.deleted_at == undefined) == undefined)
    );
    this.noStudentChecked = this.checkedStudents.pipe(
      map(students => students.length == 0)
    );

  }

  ngOnInit(): void {
    // Get students from database
    this.allStudentSubscription = this.studentsService.getAllStudents(true).subscribe((students) => this.allStudents.next(students));

    this.showEditControl.valueChanges.subscribe(this.showEditSubject);

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest({
      students: this.allStudents,
      search: this.studentSearch.pipe(startWith("")),
      showDeleted: this.showDeleted.valueChanges.pipe(startWith(false))
    }).pipe(
      map(({students, search, showDeleted}) => {
      search = search.toLocaleLowerCase();

      let indices = Array.from(students.keys());

      // implement filters
      if(!showDeleted) {
        indices = indices.filter(idx => students[idx].deleted_at == null);
      }

      // implement search
      if(search != "") {
        indices = indices.filter(idx => students[idx].name.toLocaleLowerCase().includes(search));
      }

      // sort
      indices.sort((a, b) => compareStudents(students[a], students[b]));

      const filteredStudents = new StudentList(indices.map(idx => students[idx]));

      return [indices, filteredStudents] as [number[], StudentList];
    })).subscribe(this.filteredStudents);

    this.allStudents.pipe(
      map(students => new FormArray(students.map(_ => new FormControl(false, {nonNullable: true}))))
    ).subscribe(this.studentCheckControls);

    combineLatest({
      filteredStudents: this.filteredStudents,
      controls: this.studentCheckControls
    }).pipe(
      map(({
        filteredStudents: [indices, students],
        controls
      }) => [students, indices.map(idx => controls.at(idx))] as [StudentList, FormControl<boolean>[]])
    ).subscribe(this.combinedFilteredStudentAndControls);

    combineLatest({
      students: this.allStudents,
      controls: this.studentCheckControls
    }).pipe(debounceTime(50), tap<{students: Student[], controls: FormArray<FormControl<boolean>>}>(console.log)).subscribe(({students, controls}) => {
      controls.valueChanges.pipe(
        takeUntil(this.studentCheckControls.pipe(skip(1))),
        map(bools => bools.reduce((arr, shouldKeep, idx) => {
          if(shouldKeep) {
            arr.push(students[idx]);
          }
          return arr;
        }, [] as Student[]))
      ).subscribe(students => this.checkedStudents.next(students));
    });

    this.checkedStudents.subscribe(console.log);
  }

  ngOnDestroy(): void {
    this.allStudentSubscription.unsubscribe();
  }

  refreshStudents(): void {
    this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));
  }

  selectAllGraduatedStudents(): void {
    combineLatest({
      students: this.filteredStudents,
      controls: this.studentCheckControls
    }).pipe(take(1))
    .subscribe(({students: [indices, students], controls}) => {
      const now = DateTime.now();
      for(let i = 0; i < indices.length; ++i) {
        if(students.students[i].graduation_year) {
          const gradDate = DateTime.fromObject({year: students.students[i].graduation_year}).plus(this.graduationTimeInYear);
          controls.at(indices[i]).setValue(gradDate <= now, {emitEvent: i == indices.length-1});
        } else {
          controls.at(indices[i]).setValue(false, {emitEvent: i == indices.length-1});
        }
      }
    })
  }

  deselectAll(): void {
    this.studentCheckControls.pipe(take(1)).subscribe(controls => {
      controls.reset();
    })
  }

  deleteSelectedStudents(): void {
    this.checkedStudents.pipe(take(1)).subscribe(students => {
      for(let student of students) {
        if(student.deleted_at == undefined) {
          this.studentsService.deleteStudent(student.id);
        }
      }
    })
  }

  restoreSelectedStudents(): void {
    this.checkedStudents.pipe(take(1)).subscribe(students => {
      for(let student of students) {
        if(student.deleted_at != undefined) {
          this.studentsService.undoDeleteStudent(student.id);
        }
      }
    })
  }

  navigateOrSelect(student: Student, control: FormControl<boolean>): void {
    if(this.showEditSubject.getValue()) {
      control.setValue(!control.value);
    } else {
      this.router.navigate(['students', 'detail', student.id]);
    }
  }

}
