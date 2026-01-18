import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Eye, Loader2, RefreshCw, Search, XCircle, Shirt, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TshirtOrder {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  tshirt_size: string;
  quantity: number;
  account_holder_name?: string;
  payment_status: string;
  payment_proof_url: string | null;
  proof_status: string;
  order_code: string | null;
  total_amount: number;
  admin_notes?: string;
  created_at: string;
  profile_id: string;
}

export default function TshirtApprovalsPanel() {
  const [orders, setOrders] = useState<TshirtOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<TshirtOrder | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('tshirt-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tshirt_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('tshirt_orders' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as TshirtOrder[]) || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load T-shirt orders');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderCode = async (): Promise<string> => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TSH-${timestamp}${random}`;
  };

  const handleViewProof = async (order: TshirtOrder) => {
    if (!order.payment_proof_url) {
      toast.error('No proof uploaded');
      return;
    }

    try {
      const { data } = await supabase.storage
        .from('proof-uploads')
        .createSignedUrl(order.payment_proof_url, 3600);

      if (data?.signedUrl) {
        setProofUrl(data.signedUrl);
        setSelectedOrder(order);
        setProofDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load proof');
    }
  };

  const handleApprove = async (order: TshirtOrder) => {
    if (order.order_code) {
      toast.error('Order already has a code');
      return;
    }
    if (!confirm(`Approve T-shirt order for ${order.full_name}? (${order.quantity}x ${order.tshirt_size})`)) return;

    setProcessingId(order.id);
    try {
      const orderCode = await generateOrderCode();

      const { error } = await supabase
        .from('tshirt_orders' as any)
        .update({ 
          payment_status: 'completed',
          proof_status: 'approved',
          order_code: orderCode
        })
        .eq('id', order.id);

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-registration-email', {
          body: {
            to: order.email,
            type: 'tshirt_order_approval',
            data: { 
              name: order.full_name, 
              orderCode,
              size: order.tshirt_size,
              quantity: order.quantity,
              totalAmount: order.total_amount
            }
          }
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      toast.success(`✓ Approved! Order Code: ${orderCode}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (order: TshirtOrder) => {
    if (!confirm(`Reject T-shirt order for ${order.full_name}?`)) return;

    setProcessingId(order.id);
    try {
      const { error } = await supabase
        .from('tshirt_orders' as any)
        .update({ payment_status: 'failed', proof_status: 'rejected' })
        .eq('id', order.id);

      if (error) throw error;
      toast.success('Order rejected');
      fetchOrders();
    } catch (error: any) {
      toast.error('Failed to reject order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCSV = () => {
    const approvedOrders = orders.filter(o => o.proof_status === 'approved');
    if (approvedOrders.length === 0) {
      toast.info('No approved orders to export');
      return;
    }

    const headers = ['Order Code', 'Name', 'Email', 'Phone', 'College', 'Size', 'Quantity', 'Amount', 'Date'];
    const rows = approvedOrders.map(o => [
      o.order_code || '',
      o.full_name,
      o.email,
      o.phone,
      o.college || '',
      o.tshirt_size,
      o.quantity,
      o.total_amount,
      new Date(o.created_at).toLocaleDateString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tshirt-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const filtered = orders.filter(o => {
    const search = searchTerm.toLowerCase();
    const matchSearch = o.full_name?.toLowerCase().includes(search) ||
      o.email?.toLowerCase().includes(search) ||
      o.college?.toLowerCase().includes(search) ||
      o.order_code?.toLowerCase().includes(search);
    const matchStatus = statusFilter === 'all' || o.proof_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.proof_status === 'pending').length,
    approved: orders.filter(o => o.proof_status === 'approved').length,
    rejected: orders.filter(o => o.proof_status === 'rejected').length,
    totalQuantity: orders.filter(o => o.proof_status === 'approved').reduce((sum, o) => sum + o.quantity, 0),
    totalRevenue: orders.filter(o => o.proof_status === 'approved').reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  // Size breakdown
  const sizeBreakdown = orders
    .filter(o => o.proof_status === 'approved')
    .reduce((acc, o) => {
      acc[o.tshirt_size] = (acc[o.tshirt_size] || 0) + o.quantity;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-400 text-sm">Approved ({stats.totalQuantity} shirts)</p>
          <p className="text-2xl font-bold text-green-400">₹{stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
          <p className="text-cyan-400 text-sm">Size Breakdown</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(sizeBreakdown).map(([size, qty]) => (
              <span key={size} className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                {size}: {qty}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="gap-2 bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={fetchOrders} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <p className="text-cyan-400 text-sm">
          <strong>T-shirt Orders:</strong> Approve payment proofs to generate order codes. Students can collect their T-shirts at the fest venue by showing their order code.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, college, or order code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/50 border-white/10 text-white"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 px-2">
          {filtered.length} / {orders.length}
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className={`capitalize ${statusFilter === status && status === 'pending' ? 'bg-yellow-600' : ''} ${statusFilter === status && status === 'approved' ? 'bg-green-600' : ''}`}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Customer</TableHead>
                <TableHead className="text-gray-400">Size</TableHead>
                <TableHead className="text-gray-400">Qty</TableHead>
                <TableHead className="text-gray-400">Amount</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Proof</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-gray-300">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{order.full_name}</span>
                        <span className="text-gray-500 text-xs">{order.email}</span>
                        <span className="text-gray-600 text-xs">{order.college}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-cyan-500/20 text-cyan-400 font-bold">
                        {order.tshirt_size}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {order.quantity}
                    </TableCell>
                    <TableCell className="text-green-400 font-medium">
                      ₹{order.total_amount}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        order.proof_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        order.proof_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {order.proof_status}
                      </Badge>
                      {order.order_code && (
                        <div className="text-xs text-green-400 mt-1 font-mono">{order.order_code}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.payment_proof_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-400"
                          onClick={() => handleViewProof(order)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-xs">No proof</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {order.proof_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:bg-green-400/10"
                              onClick={() => handleApprove(order)}
                              disabled={!!processingId}
                            >
                              {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:bg-red-400/10"
                              onClick={() => handleReject(order)}
                              disabled={!!processingId}
                            >
                              {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shirt className="w-5 h-5 text-cyan-400" />
              Payment Proof - {selectedOrder?.full_name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Order: {selectedOrder?.quantity}x {selectedOrder?.tshirt_size} | Total: ₹{selectedOrder?.total_amount}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {proofUrl && (
              <img src={proofUrl} alt="Payment Proof" className="w-full h-auto max-h-[60vh] object-contain rounded-lg" />
            )}
          </div>
          {selectedOrder?.proof_status === 'pending' && (
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={() => {
                  handleReject(selectedOrder);
                  setProofDialogOpen(false);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-500"
                onClick={() => {
                  handleApprove(selectedOrder);
                  setProofDialogOpen(false);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
