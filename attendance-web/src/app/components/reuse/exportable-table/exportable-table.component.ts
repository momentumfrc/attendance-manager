import { AfterContentInit, Component, ContentChildren, Input, OnChanges, QueryList, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatColumnDef, MatTable, MatTableModule } from '@angular/material/table';
import { Papa } from 'ngx-papaparse';
import { PaginatedDataSource } from 'src/app/utils/PaginatedDataSource';

export interface CsvColumn<T> {
  header: string,
  value: (row: T) => string|number|null|undefined
}

/**
 * A mat-table wrapped in a card with an "Export CSV" button.
 *
 * The column definitions (matColumnDef) are projected in by the parent, so each report keeps
 * full control over how its cells render. The csv contents are defined separately by csvColumns,
 * and always include every row of data, not just the current page.
 */
@Component({
  selector: 'app-exportable-table',
  imports: [MatTableModule, MatPaginatorModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './exportable-table.component.html',
  styleUrl: './exportable-table.component.scss'
})
export class ExportableTableComponent<T> implements AfterContentInit, OnChanges {
  @Input() data: T[] = [];
  @Input() columns: string[] = [];
  @Input() csvColumns: CsvColumn<T>[] = [];
  @Input() csvFilename = 'report';
  @Input() paginated = false;

  @ContentChildren(MatColumnDef) columnDefs!: QueryList<MatColumnDef>;
  @ViewChild(MatTable, {static: true}) table!: MatTable<T>;

  pagedData = new PaginatedDataSource<T>();

  constructor(private papa: Papa) {}

  ngAfterContentInit(): void {
    this.columnDefs.forEach(columnDef => this.table.addColumnDef(columnDef));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['data']) {
      this.pagedData.setData(this.data);
    }
  }

  exportCsv() {
    const csv = this.papa.unparse({
      fields: this.csvColumns.map(column => column.header),
      data: this.data.map(row => this.csvColumns.map(column => column.value(row) ?? ''))
    }, {
      quotes: true,
      header: true
    });

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', this.csvFilename + '.csv');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}
