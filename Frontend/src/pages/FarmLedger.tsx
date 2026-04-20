/**
 * Farm Ledger Main Page for Farmers
 * Uses shared LedgerContent component for consistency with Admin
 */

import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import LedgerContent from '@/components/dashboard/shared/LedgerContent';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FarmLedger = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Green Container Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Farm Ledger</h1>
              </div>
              <p className="text-primary-foreground/90">
                Automatically generated from your crop records
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Content (Shared Component) */}
        <LedgerContent userId={userId || ''} isAdmin={false} />
      </div>
    </Layout>
  );
};

export default FarmLedger;
