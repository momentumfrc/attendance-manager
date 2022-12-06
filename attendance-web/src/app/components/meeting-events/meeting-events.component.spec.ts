import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingEventsComponent } from './meeting-events.component';

describe('MeetingEventsComponent', () => {
  let component: MeetingEventsComponent;
  let fixture: ComponentFixture<MeetingEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeetingEventsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeetingEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
