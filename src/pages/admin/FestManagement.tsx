import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, Users, FileText } from 'lucide-react';
import FestAttendancePanel from '@/components/admin/FestAttendancePanel';
import FestReportsPanel from '@/components/admin/FestReportsPanel';
import FestApprovalsPanel from '@/components/admin/FestApprovalsPanel';

export default function FestManagement() {
  const [activeTab, setActiveTab] = useState('payments');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Festival Management</h1>
            <p className="text-gray-400">Manage fest registrations, payments, attendance & reports</p>
          </div>
        </div>

        <Tabs defaultValue="payments" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10">
            <TabsTrigger value="payments" className="gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-6">
            <FestApprovalsPanel />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <FestAttendancePanel />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <FestReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
