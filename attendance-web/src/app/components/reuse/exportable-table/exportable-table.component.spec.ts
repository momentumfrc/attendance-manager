import { Component, SimpleChange } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MatTableModule } from "@angular/material/table";
import { Papa } from "ngx-papaparse";
import { take } from "rxjs";
import { ExportableTableComponent } from "./exportable-table.component";

interface Row {
    id: number,
    name: string|null
}

describe('ExportableTableComponent', () => {
    let component: ExportableTableComponent<Row>;
    let downloads: { filename: string, contents: string }[];

    function setData(data: Row[]) {
        component.data = data;
        component.ngOnChanges({ data: new SimpleChange(undefined, data, false) });
    }

    beforeEach(() => {
        component = new ExportableTableComponent<Row>(new Papa());
        component.csvColumns = [
            { header: 'row_id', value: row => row.id },
            { header: 'row_name', value: row => row.name }
        ];

        downloads = [];
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) {
            downloads.push({
                filename: this.download,
                contents: decodeURIComponent(this.href.substring(this.href.indexOf(',') + 1))
            });
        });
    });

    it('should download the rows as a csv', () => {
        component.csvFilename = 'my-report';
        setData([{ id: 1, name: 'One' }, { id: 2, name: 'Two, "quoted"' }]);

        component.exportCsv();

        expect(downloads.length).toBe(1);
        expect(downloads[0].filename).toBe('my-report.csv');
        expect(downloads[0].contents.split(/\r?\n/)).toEqual([
            '"row_id","row_name"',
            '"1","One"',
            '"2","Two, ""quoted"""'
        ]);
    });

    it('should export missing values as empty strings', () => {
        setData([{ id: 1, name: null }]);

        component.exportCsv();

        expect(downloads[0].contents.split(/\r?\n/)[1]).toBe('"1",""');
    });

    it('should export every row, not just the current page', () => {
        component.paginated = true;
        const rows = Array.from({ length: 30 }, (_, i) => ({ id: i, name: 'Row ' + i }));
        setData(rows);

        let pageSize = 0;
        component.pagedData.connect(null!).pipe(take(1)).subscribe(page => pageSize = page.length);
        expect(pageSize).toBe(25);

        component.exportCsv();

        expect(downloads[0].contents.split(/\r?\n/).length).toBe(31);
    });
});

@Component({
    imports: [ExportableTableComponent, MatTableModule],
    template: `
        <app-exportable-table [data]="rows" [columns]="columns" [paginated]="paginated">
            <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Id</th>
                <td mat-cell *matCellDef="let row">{{row.id}}</td>
            </ng-container>
            <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">{{row.name}}</td>
            </ng-container>
        </app-exportable-table>
    `
})
class HostComponent {
    rows: Row[] = [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }];
    columns = ['id', 'name'];
    paginated = false;
}

describe('ExportableTableComponent rendering', () => {
    function render(setup: (host: HostComponent) => void = () => {}) {
        const fixture = TestBed.createComponent(HostComponent);
        setup(fixture.componentInstance);
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        return {
            fixture,
            headers: () => [...element.querySelectorAll('th')].map(th => th.textContent?.trim()),
            cells: () => [...element.querySelectorAll('tr.mat-mdc-row')].map(tr =>
                [...tr.querySelectorAll('td')].map(td => td.textContent?.trim())),
            paginator: () => element.querySelector('mat-paginator')
        };
    }

    it('should render the projected columns', () => {
        const { headers, cells } = render();

        expect(headers()).toEqual(['Id', 'Name']);
        expect(cells()).toEqual([['1', 'One'], ['2', 'Two']]);
    });

    it('should only render the displayed columns', () => {
        const { fixture, headers, cells } = render();

        fixture.componentInstance.columns = ['name'];
        fixture.componentRef.changeDetectorRef.markForCheck();
        fixture.detectChanges();

        expect(headers()).toEqual(['Name']);
        expect(cells()).toEqual([['One'], ['Two']]);
    });

    it('should paginate when requested', () => {
        const { paginator, cells } = render(host => {
            host.paginated = true;
            host.rows = Array.from({ length: 30 }, (_, i) => ({ id: i, name: 'Row ' + i }));
        });

        expect(paginator()).not.toBeNull();
        expect(cells().length).toBe(25);
    });

    it('should not paginate by default', () => {
        const { paginator } = render();

        expect(paginator()).toBeNull();
    });
});
