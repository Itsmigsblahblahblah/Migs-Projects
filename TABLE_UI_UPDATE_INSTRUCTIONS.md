# Farmer Report Table/Ledger UI Update

## Instructions to Update ReportsList.tsx

### Location: `Frontend/src/components/dashboard/admin/ReportsList.tsx`

### Change 1: Grouped Barangay View (Lines 498-579)

**REPLACE** lines 498-579 with this table format:

```tsx
{sortOption === 'barangay' && selectedBarangay === 'all' ? (
    // Grouped by barangay view with pagination - TABLE FORMAT
    <>
        {/* Table */}
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleReports.map((report, index) => {
                        const rowNumber = startIndex + index + 1;
                        return (
                            <tr
                                key={report.id}
                                className="border-b hover:bg-blue-50/50 transition-colors"
                            >
                                <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                <td className="p-3">
                                    <div className="font-medium text-gray-900">{report.username}</div>
                                </td>
                                <td className="p-3 text-sm text-gray-700">
                                    {farmerAddressMap[report.userId] || 'Unknown Barangay'}
                                </td>
                                <td className="p-3">
                                    <Badge variant="outline" className="capitalize text-xs">
                                        {normalizeProblemCategory(report.problem)}
                                    </Badge>
                                </td>
                                <td className="p-3 text-sm text-gray-700 capitalize">{report.affectedCrop || 'N/A'}</td>
                                <td className="p-3 text-sm text-gray-700">
                                    {report.createdAt?.toDate().toLocaleDateString()}
                                </td>
                                <td className="p-3 text-center">
                                    <Badge
                                        variant={report.status === 'resolved' ? 'default' : 'secondary'}
                                        className={
                                            report.status === 'resolved' ? 'bg-green-600 text-white' :
                                            report.status === 'processed' ? 'bg-yellow-500 text-white' :
                                            'bg-gray-400 text-white'
                                        }
                                    >
                                        {report.status}
                                    </Badge>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {report.status !== 'resolved' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                                title="Mark Resolved"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openReportDetail(report)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                            title="View Details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRequest(report)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
```

### Change 2: Regular List View (Lines 786-870 approximately)

**FIND** the section that starts with:
```tsx
) : (
    // Regular list view or filtered barangay view
    <>
        {visibleReports.map((report) => (
```

**REPLACE** the entire card-based layout with this table format:

```tsx
) : (
    // Regular list view or filtered barangay view - TABLE FORMAT
    <>
        {/* Table */}
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleReports.map((report, index) => {
                        const rowNumber = startIndex + index + 1;
                        return (
                            <tr
                                key={report.id}
                                className="border-b hover:bg-blue-50/50 transition-colors"
                            >
                                <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                <td className="p-3">
                                    <div className="font-medium text-gray-900">{report.username}</div>
                                </td>
                                <td className="p-3 text-sm text-gray-700">
                                    {farmerAddressMap[report.userId] || 'Unknown Barangay'}
                                </td>
                                <td className="p-3">
                                    <Badge variant="outline" className="capitalize text-xs">
                                        {normalizeProblemCategory(report.problem)}
                                    </Badge>
                                </td>
                                <td className="p-3 text-sm text-gray-700 capitalize">{report.affectedCrop || 'N/A'}</td>
                                <td className="p-3 text-sm text-gray-700">
                                    {report.createdAt?.toDate().toLocaleDateString()}
                                </td>
                                <td className="p-3 text-center">
                                    <Badge
                                        variant={report.status === 'resolved' ? 'default' : 'secondary'}
                                        className={
                                            report.status === 'resolved' ? 'bg-green-600 text-white' :
                                            report.status === 'processed' ? 'bg-yellow-500 text-white' :
                                            'bg-gray-400 text-white'
                                        }
                                    >
                                        {report.status}
                                    </Badge>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-2">
                                        {report.status !== 'resolved' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                                title="Mark Resolved"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openReportDetail(report)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                            title="View Details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRequest(report)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
```

## Features of the New Table/Ledger UI:

✅ **Row Numbers**: Each row has a number for easy reference
✅ **Clear Columns**: Farmer Name, Barangay, Problem, Affected Crop, Date, Status, Actions
✅ **Color-coded Status Badges**: 
   - Green for "resolved"
   - Yellow for "processed"
   - Gray for "pending"
✅ **Hover Effects**: Rows highlight on hover for better readability
✅ **Compact Action Buttons**: Icon-only buttons to save space
✅ **Responsive**: Horizontal scroll on smaller screens
✅ **Professional Look**: Gradient header, proper borders, clean spacing
✅ **Same Functionality**: All existing features (mark resolved, view details, delete) preserved

## Visual Layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│  # │ Farmer Name │ Barangay │ Problem │ Crop │ Date │ Status │ ⚙️ │
├─────────────────────────────────────────────────────────────────────┤
│  1 │ Juan Dela   │ Brgy 1   │ [pest]  │ Rice │ ...  │[Green] │👁️🗑️│
│  2 │ Maria Santos│ Brgy 2   │ [flood] │ Corn │ ...  │[Yellow]│👁️🗑️│
│  3 │ Pedro Reyes │ Brgy 1   │ [disease]│Tomato│... │[Gray]  │✅👁️🗑️│
└─────────────────────────────────────────────────────────────────────┘
```

The table format makes it much easier to scan through reports and see all information at a glance!
