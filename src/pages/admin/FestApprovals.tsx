import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, Ticket, Download, FileText } from 'lucide-react';
import FestApprovalsPanel from '@/components/admin/FestApprovalsPanel';
import FestAttendancePanel from '@/components/admin/FestAttendancePanel';

export default function FestApprovals() {
  const [activeTab, setActiveTab] = useState('approvals');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Ticket className="w-8 h-8 text-red-500" />
              Fest Management
            </h1>
            <p className="text-gray-400 mt-1">Manage approvals and track attendance from GetPass scans</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/40 border border-white/10 p-1 w-full sm:w-auto">
            <TabsTrigger value="approvals" className="gap-2 data-[state=active]:bg-red-600">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Payment Approvals</span>
              <span className="sm:hidden">Approvals</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2 data-[state=active]:bg-green-600">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Attendance Report</span>
              <span className="sm:hidden">Attendance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-6">
            <FestApprovalsPanel />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                <strong>GetPass Attendance:</strong> This shows attendance data when Fest Passes are scanned by coordinators at the main gate. 
                Use the Export button to download the attendance report as CSV.
              </p>
            </div>
            <FestAttendancePanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
