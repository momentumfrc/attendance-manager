import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DateTime, Duration } from 'luxon';
import { BehaviorSubject, combineLatest, debounceTime, map, Observable, ReplaySubject, skip, startWith, Subject, Subscription, take, takeUntil, tap } from 'rxjs';
import { Student, StudentList, compareStudents } from 'src/app/models/student.model';
import { AuthService } from 'src/app/services/auth.service';
import { StudentsService } from 'src/app/services/students.service';
import { ConfirmDialogComponent } from 'src/app/components/reuse/confirm-dialog/confirm-dialog.component';
import { PermissionsService } from 'src/app/services/permissions.service';

@Component({
    selector: 'app-list-students',
    templateUrl: './list-students.component.html',
    styleUrls: ['./list-students.component.scss'],
    standalone: false
})
export class ListStudentsComponent implements OnInit, OnDestroy {
  private readonly bulkConfirmThreshold = 3;

  studentSearch = new Subject<string>();
  allStudents = new ReplaySubject<Array<Student>>(1);

  studentCheckControls = new ReplaySubject<[Student[], FormArray<FormControl<boolean>>]>(1);

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
    private router: Router,
    private dialog: MatDialog,
    private permissionsService: PermissionsService
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
      map(students => [
        students,
        new FormArray(students.map(_ => new FormControl(false, {nonNullable: true})))
      ] as [Student[], FormArray<FormControl<boolean>>])
    ).subscribe(this.studentCheckControls);

    combineLatest({
      filteredStudents: this.filteredStudents,
      controls: this.studentCheckControls
    }).pipe(
      map(({
        filteredStudents: [indices, students],
        controls: [_, controls]
      }) => [students, indices.map(idx => controls.at(idx))] as [StudentList, FormControl<boolean>[]])
    ).subscribe(this.combinedFilteredStudentAndControls);

    this.studentCheckControls.subscribe(([students, controls]) => {
      controls.valueChanges.pipe(
        takeUntil(this.studentCheckControls.pipe(skip(1))),
        map(bools => bools.reduce((arr, shouldKeep, idx) => {
          if(shouldKeep) {
            arr.push(students[idx]);
          }
          return arr;
        }, [] as Student[])),
        startWith([]),
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

  selectAllGraduatingStudents(): void {
    combineLatest({
      students: this.filteredStudents,
      controls: this.studentCheckControls
    }).pipe(take(1))
    .subscribe(({
      students: [indices, filteredStudents],
      controls: [allStudents, controls]}) => {
      const nowYear = DateTime.now().year;
      for(let i = 0; i < indices.length; ++i) {
        const student = filteredStudents.students[i];
        if(student.graduation_year) {
          controls.at(indices[i]).setValue(nowYear >= student.graduation_year, {emitEvent: i == indices.length-1});
        } else {
          controls.at(indices[i]).setValue(false, {emitEvent: i == indices.length-1});
        }
      }
    })
  }

  deselectAll(): void {
    this.studentCheckControls.pipe(take(1)).subscribe(controls => {
      controls[1].reset();
    })
  }

  deleteSelectedStudents(): void {
    this.checkedStudents.pipe(take(1)).subscribe(students => {
      const toDelete = students.filter(it => it.deleted_at == undefined);
      let doDeletion = () => {
        for(let student of toDelete) {
          this.studentsService.deleteStudent(student.id);
        }
      };

      if(toDelete.length >= this.bulkConfirmThreshold) {
        let dialogref = this.dialog.open(ConfirmDialogComponent, {
          width: '320px',
          data: {
            action: 'Delete',
            message: `This will delete ${toDelete.length} students.`,
            closeColor: 'warn'
          }
        });
        dialogref.afterClosed().subscribe(confirmed => {
          if(confirmed) {
            doDeletion();
          }
        })
      } else {
        // no need for confirmation
        doDeletion();
      }
    });
  }

  restoreSelectedStudents(): void {
    this.checkedStudents.pipe(take(1)).subscribe(students => {
      const toRestore = students.filter(it => it.deleted_at != undefined);
      let doRestoration = () => {
        for(let student of toRestore) {
          this.studentsService.undoDeleteStudent(student.id);
        }
      };

      if(toRestore.length > this.bulkConfirmThreshold) {
        let dialogref = this.dialog.open(ConfirmDialogComponent, {
          width: '320px',
          data: {
            action: 'Restoration',
            message: `This will restore ${toRestore.length} students!`,
            closeColor: 'warn'
          }
        });
        dialogref.afterClosed().subscribe(confirmed => {
          if(confirmed) {
            doRestoration();
          }
        })
      } else {
        // no need for confirmation
        doRestoration();
      }
    });
  }

  navigateOrSelect(student: Student, control: FormControl<boolean>): void {
    if(this.showEditSubject.getValue()) {
      control.setValue(!control.value);
    } else {
      this.router.navigate(['students', 'detail', student.id]);
    }
  }

  shouldShowEditMenu(): Observable<boolean> {
    return this.permissionsService.checkPermissions(['modify students', 'modify student images', 'remove students']);
  }

}
