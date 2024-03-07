import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Subscription, map, startWith } from 'rxjs';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit, OnDestroy {

  @Output() searchUpdatedEvent = new EventEmitter<string>();

  shouldShowCancel = new BehaviorSubject<boolean>(false);

  private searchUpdatedSub!: Subscription
  private shouldShowCancelSub!: Subscription

  searchControl = new FormControl('');

  constructor() { }

  ngOnInit(): void {
    this.searchUpdatedSub = this.searchControl.valueChanges.pipe(
      startWith(""),
      map(search => search ?? "")
    ).subscribe(this.searchUpdatedEvent);

    this.shouldShowCancelSub = this.searchControl.valueChanges.pipe(
      map(it => !!it)
    ).subscribe(this.shouldShowCancel);
  }

  ngOnDestroy(): void {
    this.searchUpdatedSub.unsubscribe();
    this.shouldShowCancelSub.unsubscribe();
  }

  clearSearch() {
    this.searchControl.setValue("");
  }

}
