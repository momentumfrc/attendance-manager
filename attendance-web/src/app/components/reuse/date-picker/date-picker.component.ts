import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DateTime, DurationLike } from 'luxon';
import { combineLatest, filter, map, startWith, Subscription, tap } from 'rxjs';

export interface SelectedDateRange {
  since: DateTime,
  until: DateTime
};

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  standalone: false
})
export class DatePickerComponent implements OnInit, OnDestroy {
  @Input() initialDuration!: DurationLike;
  @Output() dateRangeSelection = new EventEmitter<SelectedDateRange>();

  protected dateGroup!: FormGroup

  private changesSub!: Subscription

  ngOnInit(): void {
    const now = DateTime.now().set({hour: 0, minute: 0, second: 0, millisecond: 0});

    this.dateGroup = new FormGroup({
      since: new FormControl(now.minus(this.initialDuration)),
      until: new FormControl(now)
    });

    this.changesSub = this.dateGroup.valueChanges.pipe(
      tap(console.log),
      filter(it => it && it['since'] && it['until']),
      map(it => (it as SelectedDateRange))
    ).subscribe(it => this.emitDateRange(it))

    this.emitDateRange(this.dateGroup.value as SelectedDateRange);
  }

  ngOnDestroy(): void {
    this.changesSub.unsubscribe();
  }

  protected onSubmit() {
    const value = this.dateGroup.value;
    if(value.since && value.until) {
      this.emitDateRange(value as SelectedDateRange);
    }
  }

  private emitDateRange(range: SelectedDateRange) {
    this.dateRangeSelection.emit({
      since: range.since,
      until: range.until.plus({days: 1})
    });
  }
}
