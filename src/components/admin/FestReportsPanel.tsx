import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    XCircle,
    Clock,
    Download,
    Search,
    RefreshCw,
    Loader2,
    FileText,
    TrendingUp,
    DollarSign,
} from 'lucide-react';

interface FestRegistration {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    college: string;
    branch: string;
    year: string;
    payment_status: string;
    proof_status: string;
    fest_registration_code: string | null;
    created_at: string;
}

interface Stats {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
}

export default function FestReportsPanel() {
    const [registrations, setRegistrations] = useState<FestRegistration[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
    });

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('fest_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('proof_status', statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setRegistrations(data || []);

            // Calculate stats from all data
            const allData = await supabase.from('fest_registrations').select('proof_status');
            if (allData.data) {
                setStats({
                    total: allData.data.length,
                    approved: allData.data.filter(r => r.proof_status === 'approved').length,
                    pending: allData.data.filter(r => r.proof_status === 'pending').length,
                    rejected: allData.data.filter(r => r.proof_status === 'rejected').length,
                });
            }
        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('Failed to fetch registrations');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const filteredRegistrations = registrations.filter(record => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            record.full_name?.toLowerCase().includes(query) ||
            record.email?.toLowerCase().includes(query) ||
            record.phone?.includes(query) ||
            record.college?.toLowerCase().includes(query) ||
            record.fest_registration_code?.toLowerCase().includes(query)
        );
    });

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'College', 'Branch', 'Year', 'Fest Code', 'Status', 'Registered On'];
        const rows = filteredRegistrations.map(record => [
            record.full_name,
            record.email,
            record.phone,
            record.college || '',
            record.branch || '',
            record.year || '',
            record.fest_registration_code || '',
            record.proof_status,
            new Date(record.created_at).toLocaleDateString(),
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fest_registrations_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported!');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-sm text-gray-400">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.approved}</p>
                                <p className="text-sm text-gray-400">Approved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                                <p className="text-sm text-gray-400">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <XCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
                                <p className="text-sm text-gray-400">Rejected</p>
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
                                placeholder="Search by name, email, phone, college, or fest code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-black/40 border-white/10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 bg-black/40 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                onClick={fetchRegistrations}
                                className="border-white/10"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={exportToCSV}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Registration Table */}
            <Card className="bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <FileText className="w-5 h-5 text-red-400" />
                        Fest Registrations Report
                        <Badge variant="secondary" className="ml-2">
                            {filteredRegistrations.length} records
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                        </div>
                    ) : filteredRegistrations.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No registrations found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-gray-400">Name</TableHead>
                                        <TableHead className="text-gray-400">Email</TableHead>
                                        <TableHead className="text-gray-400">Phone</TableHead>
                                        <TableHead className="text-gray-400">College</TableHead>
                                        <TableHead className="text-gray-400">Fest Code</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRegistrations.map((record) => (
                                        <TableRow key={record.id} className="border-white/10">
                                            <TableCell className="text-white font-medium">
                                                {record.full_name}
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                {record.email}
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                {record.phone}
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                {record.college || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {record.fest_registration_code ? (
                                                    <Badge variant="outline" className="text-red-400 border-red-400/30 font-mono">
                                                        {record.fest_registration_code}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(record.proof_status)}
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                {new Date(record.created_at).toLocaleDateString()}
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
