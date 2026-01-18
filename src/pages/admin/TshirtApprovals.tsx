import { AdminLayout } from '@/components/admin/AdminLayout';
import { Shirt } from 'lucide-react';
import TshirtApprovalsPanel from '@/components/admin/TshirtApprovalsPanel';

export default function TshirtApprovals() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shirt className="w-8 h-8 text-cyan-500" />
              T-Shirt Orders
            </h1>
            <p className="text-gray-400 mt-1">Manage T-shirt order payments and approvals</p>
          </div>
        </div>

        <TshirtApprovalsPanel />
      </div>
    </AdminLayout>
  );
}
