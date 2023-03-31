import { Component } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { ErrorService } from 'src/app/services/error.service';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent {
  protected errorMessage = new ReplaySubject<string>(1);

  constructor(
    private errorService: ErrorService
  ) {
    let error = errorService.clearError();
    if(error && error.message) {
      this.errorMessage.next(error.message);
    } else {
      this.errorMessage.next(ErrorService.unknownErrorMsg);
    }
  }
}
