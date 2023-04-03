import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { PageEvent } from "@angular/material/paginator";
import { Observable, ReplaySubject } from "rxjs";

export class PaginatedDataSource<DataType> implements DataSource<DataType> {
    private data: Array<DataType> = [];

    public readonly pageSizeOptions = [25, 50, 100];

    private paginatedData = new ReplaySubject<Array<DataType>>(1);

    private lastPageSize = this.pageSizeOptions[0];

    public setData(data: Array<DataType>): void {
      this.data = data;
      this.updateSlice(0, this.lastPageSize);
    }

    public paginate(event: PageEvent) {
      this.lastPageSize = event.pageSize;
      this.updateSlice(event.pageSize * event.pageIndex, event.pageSize * (event.pageIndex + 1));
    }

    public getDataSize(): number {
      return this.data.length;
    }

    private updateSlice(startIdx: number, endIdx: number) {
      this.paginatedData.next(this.data.slice(startIdx, endIdx));
    }

    connect(collectionViewer: CollectionViewer): Observable<readonly DataType[]> {
      return this.paginatedData;
    }

    disconnect(collectionViewer: CollectionViewer): void {}
  }
