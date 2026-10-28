import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, combineLatest, finalize, map, Observable, ReplaySubject, shareReplay, startWith, Subject, takeUntil } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/reuse/confirm-dialog/confirm-dialog.component';
import { compareStudents, RegistrationStep, Student, StudentList } from 'src/app/models/student.model';
import { PermissionsService } from 'src/app/services/permissions.service';
import { PollService } from 'src/app/services/poll.service';
import { RegistrationService } from 'src/app/services/registration.service';
import { StudentsService } from 'src/app/services/students.service';

interface StepColumn {
  step: RegistrationStep,
  label: string,
  // Student leads may check off the contract, but only mentors may change the other steps
  permission: string
}

export interface RegistrationRow {
  student: Student,
  name: string
}

interface RegistrationView {
  rows: RegistrationRow[],
  pending: string[],
  modifiableSteps: RegistrationStep[]
}

@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.scss'],
    standalone: false
})
export class RegistrationComponent implements OnInit, OnDestroy {
  readonly steps: StepColumn[] = [
    {step: RegistrationStep.STUDENT_CONTRACT, label: 'Student Contract', permission: 'modify student contract'},
    {step: RegistrationStep.SHARED_SCIENCE, label: 'Shared Science', permission: 'modify student registration'},
    {step: RegistrationStep.FIRST_CR, label: 'FIRST C&R', permission: 'modify student registration'}
  ];
  readonly columns = ['name', ...this.steps.map(column => column.step)];

  studentSearch = new Subject<string>();
  rows = new ReplaySubject<RegistrationRow[]>(1);

  /** Checkboxes with a request in flight, as pendingKey()s. */
  pending = new BehaviorSubject<string[]>([]);
  /** Whether the user may start a new season and update the canvas. */
  mayModify: Observable<boolean>;
  view: Observable<RegistrationView>;

  updatingCanvas = false;

  private unsubscribe = new Subject<void>();

  constructor(
    private studentsService: StudentsService,
    private registrationService: RegistrationService,
    private pollService: PollService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    permissionsService: PermissionsService
  ) {
    this.mayModify = permissionsService.checkPermissions(['modify student registration']).pipe(shareReplay(1));
    const modifiableSteps = combineLatest(
      this.steps.map(column => permissionsService.checkPermissions([column.permission]).pipe(
        map(allowed => allowed ? [column.step] : [])
      ))
    ).pipe(map(steps => steps.flat()));
    this.view = combineLatest({
      rows: this.rows,
      pending: this.pending,
      modifiableSteps
    });
  }

  ngOnInit(): void {
    // Keep in sync with other users updating registration at the same time
    this.pollService.getPollingObservable().pipe(takeUntil(this.unsubscribe)).subscribe(pollData => {
      if(pollData.updated_students.length > 0) {
        this.studentsService.updateStudentsInCache(pollData.updated_students);
      }
    });

    combineLatest({
      students: this.studentsService.getAllStudents(false),
      search: this.studentSearch.pipe(startWith(""))
    }).pipe(
      map(({students, search}) => {
        // Qualify names against the whole roster, so they don't change while searching
        const list = new StudentList(students);
        search = search.toLocaleLowerCase();
        return students
          .filter(student => student.name.toLocaleLowerCase().includes(search))
          .sort(compareStudents)
          .map(student => ({student, name: list.getQualifiedName(student)}));
      }),
      takeUntil(this.unsubscribe)
    ).subscribe(this.rows);
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  trackByStudent(_: number, row: RegistrationRow): number {
    return row.student.id;
  }

  pendingKey(student: Student, step: RegistrationStep): string {
    return `${student.id}:${step}`;
  }

  isCompleted(student: Student, step: RegistrationStep): boolean {
    return student.registration?.[step] != null;
  }

  toggleStep(student: Student, step: RegistrationStep, change: MatCheckboxChange): void {
    let request: Observable<unknown>;
    if(change.checked) {
      request = this.registrationService.completeStep(student.id, step);
    } else {
      const eventId = student.registration?.[step];
      if(eventId == null) {
        return;
      }
      request = this.registrationService.removeEvent({id: eventId, student_id: student.id});
    }

    const key = this.pendingKey(student, step);
    this.pending.next(this.pending.getValue().concat([key]));

    request.pipe(
      finalize(() => this.pending.next(this.pending.getValue().filter(it => it != key)))
    ).subscribe({
      // The checkbox has already toggled itself, so put it back
      error: () => change.source.checked = !change.checked
    });
  }

  startNewSeason(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        action: 'New Season',
        message: "This will clear every student's registration. Every student will need to register again.",
        closeColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if(!confirmed) {
        return;
      }

      this.registrationService.startNewSeason().subscribe(event => {
        this.snackbar.open("Started a new season", "Undo", { duration: 8000 })
          .onAction().subscribe(() => this.registrationService.removeEvent(event).subscribe());
      });
    });
  }

  updateCanvas(): void {
    this.updatingCanvas = true;
    this.registrationService.pushCanvas().pipe(
      finalize(() => this.updatingCanvas = false)
    ).subscribe({
      next: status => this.snackbar.open(
        status == 'pushed' ? "Updated the Slack canvas" : "The Slack canvas is already up to date",
        undefined,
        { duration: 4000 }
      ),
      error: (error: HttpErrorResponse) => this.snackbar.open(
        "Couldn't update the Slack canvas: " + (error.error?.message ?? error.message),
        "Dismiss"
      )
    });
  }
}
