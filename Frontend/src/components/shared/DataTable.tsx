import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column {
    key: string;
    title: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
    columns: Column[];
    data: any[];
    onRowClick?: (row: any) => void;
    emptyMessage?: string;
}

const DataTable = ({ columns, data, onRowClick, emptyMessage = "No data available" }: DataTableProps) => {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key}>{column.title}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <TableRow
                                key={rowIndex}
                                className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((column) => (
                                    <TableCell key={column.key}>
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default DataTable;