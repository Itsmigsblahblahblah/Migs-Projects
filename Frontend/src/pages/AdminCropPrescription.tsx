import Layout from "@/components/Layout";
import AdminCropPrescriptionManagement from "@/components/dashboard/admin/AdminCropPrescriptionManagement";

const AdminCropPrescription = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Soil pH & Crop Prescription Management</h1>
              <p className="text-white/90">
                Manage admin-verified crop recommendations for farmers.
              </p>
            </div>
          </div>
        </div>

        {/* Management Component */}
        <AdminCropPrescriptionManagement />
      </div>
    </Layout>
  );
};

export default AdminCropPrescription;
