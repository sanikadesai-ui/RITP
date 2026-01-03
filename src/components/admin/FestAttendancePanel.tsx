import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Users,
    CheckCircle,
    Download,
    Search,
    RefreshCw,
    Calendar,
    Clock,
    Loader2,
    Ticket,
    UserCheck,
} from 'lucide-react';

interface FestAttendanceRecord {
    id: string;
    fest_registration_id: string;
    fest_code: string | null;
    attendee_name: string | null;
    attendee_email: string | null;
    entry_date: string;
    entry_type: string | null;
    marked_at: string;
    marked_by: string | null;
    coordinator_name: string | null;
}

interface Stats {
    totalEntries: number;
    todayEntries: number;
    uniqueAttendees: number;
}

export default function FestAttendancePanel() {
    const [attendance, setAttendance] = useState<FestAttendanceRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<Stats>({
        totalEntries: 0,
        todayEntries: 0,
        uniqueAttendees: 0,
    });

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            // Use raw SQL query via rpc or direct fetch since table may not be in types
            const { data, error } = await supabase
                .from('fest_attendance' as any)
                .select('*')
                .eq('entry_date', selectedDate)
                .order('marked_at', { ascending: false });

            if (error) throw error;
            
            const records = (data as unknown as FestAttendanceRecord[]) || [];
            setAttendance(records);

            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = records.filter(r => r.entry_date === today);
            const uniqueIds = new Set(records.map(r => r.fest_registration_id));

            setStats({
                totalEntries: records.length,
                todayEntries: todayRecords.length,
                uniqueAttendees: uniqueIds.size,
            });
        } catch (error) {
            console.error('Error fetching fest attendance:', error);
            toast.error('Failed to fetch attendance records');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const filteredAttendance = attendance.filter(record => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            record.attendee_name?.toLowerCase().includes(query) ||
            record.attendee_email?.toLowerCase().includes(query) ||
            record.fest_code?.toLowerCase().includes(query)
        );
    });

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Fest Code', 'Entry Date', 'Entry Time', 'Entry Type'];
        const rows = filteredAttendance.map(record => [
            record.attendee_name || '',
            record.attendee_email || '',
            record.fest_code || '',
            record.entry_date,
            new Date(record.marked_at).toLocaleTimeString(),
            record.entry_type || 'main_gate',
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fest_attendance_${selectedDate || 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Attendance exported!');
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
                                <p className="text-sm text-gray-400">Total Entries (Selected Date)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Calendar className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.todayEntries}</p>
                                <p className="text-sm text-gray-400">Today's Entries</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Users className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.uniqueAttendees}</p>
                                <p className="text-sm text-gray-400">Unique Attendees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-black/40 border-white/10">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, email, or fest code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-black/40 border-white/10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-black/40 border-white/10 w-40"
                            />
                            <Button
                                variant="outline"
                                onClick={fetchAttendance}
                                className="border-white/10"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={exportToCSV}
                                className="border-white/10"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card className="bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Ticket className="w-5 h-5 text-red-400" />
                        Fest Entry Records
                        <Badge variant="secondary" className="ml-2">
                            {filteredAttendance.length} records
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                        </div>
                    ) : filteredAttendance.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No fest attendance records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-gray-400">Name</TableHead>
                                        <TableHead className="text-gray-400">Email</TableHead>
                                        <TableHead className="text-gray-400">Fest Code</TableHead>
                                        <TableHead className="text-gray-400">Entry Time</TableHead>
                                        <TableHead className="text-gray-400">Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAttendance.map((record) => (
                                        <TableRow key={record.id} className="border-white/10">
                                            <TableCell className="text-white font-medium">
                                                {record.attendee_name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                {record.attendee_email || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-red-400 border-red-400/30">
                                                    {record.fest_code || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(record.marked_at).toLocaleTimeString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-500/20 text-green-400">
                                                    {record.entry_type || 'main_gate'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
