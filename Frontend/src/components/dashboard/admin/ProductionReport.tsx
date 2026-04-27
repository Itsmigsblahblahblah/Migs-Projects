import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface ProductionRecord {
    id: string;
    farmerName: string;
    barangay: string;
    harvestedCrop: string;
    quantity: number;
    unit: string;
    harvestDate: string;
    landArea: number;
    yield: number;
}

interface ProductionReportProps {
    onExport: () => void;
}

const ProductionReport = ({ onExport }: ProductionReportProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    // Mock production data - you can replace this with actual data from Firestore
    const mockProductionData: ProductionRecord[] = [
        {
            id: "1",
            farmerName: "Juan Dela Cruz",
            barangay: "Barangay 1",
            harvestedCrop: "Rice",
            quantity: 150,
            unit: "kg",
            harvestDate: "2024-03-15",
            landArea: 2.5,
            yield: 60
        },
        {
            id: "2",
            farmerName: "Maria Santos",
            barangay: "Barangay 3",
            harvestedCrop: "Corn",
            quantity: 200,
            unit: "kg",
            harvestDate: "2024-03-20",
            landArea: 3.0,
            yield: 66.67
        },
        {
            id: "3",
            farmerName: "Pedro Reyes",
            barangay: "Barangay 2",
            harvestedCrop: "Tomatoes",
            quantity: 80,
            unit: "kg",
            harvestDate: "2024-03-25",
            landArea: 1.5,
            yield: 53.33
        },
    ];

    const [productionData] = useState<ProductionRecord[]>(mockProductionData);

    // Pagination calculations
    const totalPages = Math.ceil(productionData.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const visibleRecords = productionData.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    return (
        <Card className="shadow-card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Production Report</CardTitle>
                        <CardDescription>Harvest records from farmers ({productionData.length} total)</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onExport}
                            disabled={productionData.length === 0}
                            className="hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {productionData.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Harvested Crop</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Quantity (kg)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Land Area (ha)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Yield (kg/ha)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Harvest Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRecords.map((record, index) => {
                                            const rowNumber = startIndex + index + 1;
                                            return (
                                                <tr
                                                    key={record.id}
                                                    className="border-b hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                                    <td className="p-3">
                                                        <div className="font-medium text-gray-900">{record.farmerName}</div>
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-700">{record.barangay}</td>
                                                    <td className="p-3 text-sm text-gray-700 capitalize">{record.harvestedCrop}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.quantity} {record.unit}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.landArea}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.yield}</td>
                                                    <td className="p-3 text-sm text-gray-700">
                                                        {new Date(record.harvestDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="border-t pt-4 mt-auto">
                            {/* Desktop layout */}
                            <div className="hidden md:flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Showing {startIndex + 1} to {Math.min(endIndex, productionData.length)} of {productionData.length} records
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Previous
                                    </Button>

                                    {/* Page Number Buttons */}
                                    {(() => {
                                        const pageButtons = [];
                                        let startPage = Math.max(1, currentPage - 3);
                                        let endPage = Math.min(totalPages, startPage + 6);

                                        if (endPage - startPage < 6) {
                                            startPage = Math.max(1, endPage - 6);
                                        }

                                        if (startPage > 1) {
                                            pageButtons.push(
                                                <Button
                                                    key={1}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(1)}
                                                    className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                >
                                                    1
                                                </Button>
                                            );
                                            if (startPage > 2) {
                                                pageButtons.push(
                                                    <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pageButtons.push(
                                                <Button
                                                    key={i}
                                                    variant={currentPage === i ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(i)}
                                                    className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
                                                >
                                                    {i}
                                                </Button>
                                            );
                                        }

                                        if (endPage < totalPages) {
                                            if (endPage < totalPages - 1) {
                                                pageButtons.push(
                                                    <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                            pageButtons.push(
                                                <Button
                                                    key={totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(totalPages)}
                                                    className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                >
                                                    {totalPages}
                                                </Button>
                                            );
                                        }

                                        return pageButtons;
                                    })()}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>

                            {/* Mobile layout */}
                            <div className="md:hidden space-y-4">
                                <div className="text-sm text-muted-foreground text-center">
                                    Showing {startIndex + 1} to {Math.min(endIndex, productionData.length)} of {productionData.length} records
                                </div>
                                <div className="flex justify-center space-x-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">No production records available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProductionReport;
