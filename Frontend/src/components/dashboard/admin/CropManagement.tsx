import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HARDCODED_CROPS, formatCropName } from "@/utils/cropUtils";

const CropManagement = () => {
    const [crops, setCrops] = useState(HARDCODED_CROPS);
    const [filteredCrops, setFilteredCrops] = useState(HARDCODED_CROPS);
    const [newCropName, setNewCropName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingCrop, setEditingCrop] = useState({ index: -1, name: "" });
    const [cropToDelete, setCropToDelete] = useState({ index: -1, name: "" });

    // Filter crops based on search term
    const filterCrops = (search: string, cropList: string[]) => {
        if (search) {
            return cropList.filter(crop =>
                crop.toLowerCase().includes(search.toLowerCase())
            );
        }
        return cropList;
    };

    // Update filtered crops when search term or crops change
    useEffect(() => {
        setFilteredCrops(filterCrops(searchTerm, crops));
    }, [searchTerm, crops]);

    const handleAddCrop = () => {
        if (newCropName.trim()) {
            const formattedName = formatCropName(newCropName.trim());
            if (!crops.includes(formattedName)) {
                const updatedCrops = [...crops, formattedName];
                setCrops(updatedCrops);
                setNewCropName("");
            }
        }
    };

    const handleEditCrop = (index: number, name: string) => {
        setEditingCrop({ index, name });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (editingCrop.name.trim()) {
            const formattedName = formatCropName(editingCrop.name.trim());
            const updatedCrops = [...crops];
            updatedCrops[editingCrop.index] = formattedName;
            setCrops(updatedCrops);
            setIsEditDialogOpen(false);
            setEditingCrop({ index: -1, name: "" });
        }
    };

    const handleDeleteCrop = (index: number, name: string) => {
        setCropToDelete({ index, name });
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteCrop = () => {
        const updatedCrops = crops.filter((_, i) => i !== cropToDelete.index);
        setCrops(updatedCrops);
        setIsDeleteDialogOpen(false);
        setCropToDelete({ index: -1, name: "" });
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle>Crop Management</CardTitle>
                <CardDescription>
                    Manage the list of crops available in the system. Add, edit, or delete crops that farmers can select when planting.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add New Crop Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Add New Crop</h3>
                    <div className="flex gap-2">
                        <Input
                            value={newCropName}
                            onChange={(e) => setNewCropName(e.target.value)}
                            placeholder="Enter new crop name"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCrop()}
                        />
                        <Button onClick={handleAddCrop} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Crop
                        </Button>
                    </div>
                </div>

                {/* Search Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Available Crops</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search crops..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Crops List */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Crop Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCrops.length > 0 ? (
                                filteredCrops.map((crop, index) => {
                                    // Find the actual index in the original crops array
                                    const actualIndex = crops.indexOf(crop);
                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{crop}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditCrop(actualIndex, crop)}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteCrop(actualIndex, crop)}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                                        {searchTerm ? "No crops found matching your search" : "No crops available"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="text-sm text-muted-foreground">
                    Total crops: {crops.length}
                </div>
            </CardContent>

            {/* Edit Crop Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Crop</DialogTitle>
                        <DialogDescription>
                            Update the name of the crop.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editCropName">Crop Name</Label>
                            <Input
                                id="editCropName"
                                value={editingCrop.name}
                                onChange={(e) => setEditingCrop({ ...editingCrop, name: e.target.value })}
                                placeholder="Enter crop name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Crop Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Crop</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the crop "{cropToDelete.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteCrop}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default CropManagement;