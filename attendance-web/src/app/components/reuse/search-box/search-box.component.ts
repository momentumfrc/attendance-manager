import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { map, startWith } from 'rxjs';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit {

  @Output() searchUpdatedEvent = new EventEmitter<string>();

  searchControl = new FormControl('');

  constructor() { }

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      startWith(""),
      map(search => search ?? "")
    ).subscribe(this.searchUpdatedEvent);
  }

}
