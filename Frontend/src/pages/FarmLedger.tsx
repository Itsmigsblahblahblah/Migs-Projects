/**
 * Farm Ledger Main Page for Farmers
 * Uses shared LedgerContent component for consistency with Admin
 */

import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import LedgerContent from '@/components/dashboard/shared/LedgerContent';

const FarmLedger = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Farm Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Automatically generated from your crop records
          </p>
        </div>

        {/* Ledger Content (Shared Component) */}
        <LedgerContent userId={userId || ''} isAdmin={false} />
      </div>
    </Layout>
  );
};

export default FarmLedger;
