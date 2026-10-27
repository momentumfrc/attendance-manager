import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { PageEvent } from "@angular/material/paginator";
import { Observable, ReplaySubject } from "rxjs";

export class PaginatedDataSource<DataType> implements DataSource<DataType> {
    private data: Array<DataType> = [];

    public readonly pageSizeOptions = [25, 50, 100];

    private paginatedData = new ReplaySubject<Array<DataType>>(1);

    public pageIndex = 0;
    public pageSize = this.pageSizeOptions[0];

    public setData(data: Array<DataType>): void {
      this.data = data;
      // Stay on the current page, unless the data no longer reaches it
      const lastPageIndex = Math.max(0, Math.ceil(data.length / this.pageSize) - 1);
      this.pageIndex = Math.min(this.pageIndex, lastPageIndex);
      this.updateSlice();
    }

    public paginate(event: PageEvent) {
      this.pageIndex = event.pageIndex;
      this.pageSize = event.pageSize;
      this.updateSlice();
    }

    public getDataSize(): number {
      return this.data.length;
    }

    private updateSlice() {
      const startIdx = this.pageSize * this.pageIndex;
      this.paginatedData.next(this.data.slice(startIdx, startIdx + this.pageSize));
    }

    connect(collectionViewer: CollectionViewer): Observable<readonly DataType[]> {
      return this.paginatedData;
    }

    disconnect(collectionViewer: CollectionViewer): void {}
  }
