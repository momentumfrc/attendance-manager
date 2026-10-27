import { take } from "rxjs";
import { PaginatedDataSource } from "./PaginatedDataSource";

describe('PaginatedDataSource', () => {
    let dataSource: PaginatedDataSource<number>;

    const range = (length: number) => Array.from({ length }, (_, i) => i);

    const currentPage = () => {
        let page: readonly number[] = [];
        dataSource.connect(null!).pipe(take(1)).subscribe(data => page = data);
        return page;
    };

    beforeEach(() => {
        dataSource = new PaginatedDataSource<number>();
    });

    it('should keep the current page when the data is replaced', () => {
        dataSource.setData(range(100));
        dataSource.paginate({ pageIndex: 1, pageSize: 25, length: 100 });

        dataSource.setData(range(100));

        expect(dataSource.pageIndex).toBe(1);
        expect(currentPage()).toEqual(range(50).slice(25));
    });

    it('should clamp to the last page when the data shrinks', () => {
        dataSource.setData(range(100));
        dataSource.paginate({ pageIndex: 3, pageSize: 25, length: 100 });

        dataSource.setData(range(30));

        expect(dataSource.pageIndex).toBe(1);
        expect(currentPage()).toEqual(range(30).slice(25));
    });

    it('should go to the first page when the data is emptied', () => {
        dataSource.setData(range(100));
        dataSource.paginate({ pageIndex: 3, pageSize: 25, length: 100 });

        dataSource.setData([]);

        expect(dataSource.pageIndex).toBe(0);
        expect(currentPage()).toEqual([]);
    });

    it('should keep the page size when the data is replaced', () => {
        dataSource.setData(range(100));
        dataSource.paginate({ pageIndex: 0, pageSize: 50, length: 100 });

        dataSource.setData(range(100));

        expect(dataSource.pageSize).toBe(50);
        expect(currentPage()).toEqual(range(50));
    });
});
