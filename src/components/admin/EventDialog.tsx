import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateUUID } from '@/utils/uuid';

interface EventData {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  venue?: string;
  event_date?: string;
  registration_deadline?: string;
  registration_start_date?: string;
  registration_end_date?: string;
  registration_fee?: number;
  max_participants?: number;
  min_team_size?: number;
  max_team_size?: number;
  event_type?: string;
  status?: string;
  upi_qr_url?: string;
  image_url?: string;
  upi_id?: string;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventData;
  onSuccess: () => void;
}

export function EventDialog({ open, onOpenChange, event, onSuccess }: EventDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tech',
    description: '',
    venue: '',
    event_date: '',
    registration_deadline: '',
    registration_start_date: '',
    registration_end_date: '',
    registration_fee: 0,
    max_participants: 0,
    min_team_size: 1,
    max_team_size: 1,
    event_type: 'individual',
    status: 'upcoming',
    upi_qr_url: '',
    image_url: '',
    upi_id: '',
    is_free_event: true
  });

  useEffect(() => {
    if (event) {
      const isFree = !event.registration_fee || event.registration_fee === 0;
      setFormData({
        name: event.name || '',
        category: event.category || 'Tech',
        description: event.description || '',
        venue: event.venue || '',
        event_date: event.event_date?.split('T')[0] || '',
        registration_deadline: event.registration_deadline?.split('T')[0] || '',
        registration_start_date: event.registration_start_date?.split('T')[0] || '',
        registration_end_date: event.registration_end_date?.split('T')[0] || '',
        registration_fee: event.registration_fee || 0,
        max_participants: event.max_participants || 0,
        min_team_size: event.min_team_size || 1,
        max_team_size: event.max_team_size || 1,
        event_type: event.event_type || 'individual',
        status: event.status || 'upcoming',
        upi_qr_url: event.upi_qr_url || '',
        image_url: event.image_url || '',
        upi_id: event.upi_id || '',
        is_free_event: isFree
      });
    } else {
      setFormData({
        name: '',
        category: 'Tech',
        description: '',
        venue: '',
        event_date: '',
        registration_deadline: '',
        registration_start_date: '',
        registration_end_date: '',
        registration_fee: 0,
        max_participants: 0,
        min_team_size: 1,
        max_team_size: 1,
        event_type: 'individual',
        status: 'upcoming',
        upi_qr_url: '',
        image_url: '',
        upi_id: '',
        is_free_event: true
      });
    }
  }, [event, open]);

  const handleUpiQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `upi-qr/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      setFormData({ ...formData, upi_qr_url: publicUrl });
      toast({ title: 'Success', description: 'UPI QR code uploaded successfully' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploadingPoster(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `event-posters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast({ title: 'Success', description: 'Event poster uploaded successfully' });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      const eventData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        venue: formData.venue,
        event_date: new Date(formData.event_date).toISOString(),
        registration_deadline: new Date(formData.registration_deadline).toISOString(),
        registration_start_date: formData.registration_start_date ? new Date(formData.registration_start_date).toISOString() : null,
        registration_end_date: formData.registration_end_date ? new Date(formData.registration_end_date).toISOString() : null,
        registration_fee: formData.is_free_event ? 0 : Number(formData.registration_fee),
        max_participants: Number(formData.max_participants),
        min_team_size: Number(formData.min_team_size),
        max_team_size: Number(formData.max_team_size),
        event_type: formData.event_type,
        status: formData.status,
        upi_qr_url: formData.is_free_event ? null : formData.upi_qr_url || null,
        image_url: formData.image_url || null,
        upi_id: formData.is_free_event ? null : formData.upi_id || null,
      };

      if (event) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Event updated successfully' });
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Event created successfully' });
      }

      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: 'Error', description: err.message || 'Operation failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/90 border-red-600/30 text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-red-500 text-xl sm:text-2xl">
            {event ? 'Edit Event' : 'Create Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label>Event Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-black/40 border-red-600/30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-black/40 border-red-600/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-red-600/30">
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Non-Tech">Non-Tech</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Type</Label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                <SelectTrigger className="bg-black/40 border-red-600/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-red-600/30">
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-black/40 border-red-600/30"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Venue</Label>
              <Input
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="bg-black/40 border-red-600/30"
                required
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-black/40 border-red-600/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-red-600/30">
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Event Date</Label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="bg-black/40 border-red-600/30"
                required
              />
            </div>

            <div>
              <Label>Registration Deadline</Label>
              <Input
                type="date"
                value={formData.registration_deadline}
                onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                className="bg-black/40 border-red-600/30"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-sm">Registration Start</Label>
              <Input
                type="datetime-local"
                value={formData.registration_start_date}
                onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
                className="bg-black/40 border-red-600/30"
              />
            </div>

            <div>
              <Label>Registration End</Label>
              <Input
                type="datetime-local"
                value={formData.registration_end_date}
                onChange={(e) => setFormData({ ...formData, registration_end_date: e.target.value })}
                className="bg-black/40 border-red-600/30"
              />
            </div>
          </div>

          {/* Event Poster Upload */}
          <div>
            <Label>Event Poster</Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handlePosterUpload}
                disabled={uploadingPoster}
                className="bg-black/40 border-red-600/30"
              />
              {formData.image_url && (
                <div className="p-2 bg-black/60 border border-green-600/20 rounded">
                  <p className="text-xs text-green-500 mb-2">✓ Poster uploaded</p>
                  <img src={formData.image_url} alt="Event Poster" className="w-32 h-auto object-contain rounded" />
                </div>
              )}
            </div>
          </div>

          {/* Free/Paid Event Toggle */}
          <div>
            <Label>Event Type (Pricing)</Label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_free_event: true, registration_fee: 0 })}
                className={`flex-1 py-2 px-3 rounded border transition-all text-sm ${
                  formData.is_free_event
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-red-600/30 bg-black/40 text-gray-400'
                }`}
              >
                🎉 Free Event
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_free_event: false })}
                className={`flex-1 py-2 px-3 rounded border transition-all text-sm ${
                  !formData.is_free_event
                    ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                    : 'border-red-600/30 bg-black/40 text-gray-400'
                }`}
              >
                💳 Paid Event
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {!formData.is_free_event && (
              <div>
                <Label className="text-sm">Registration Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.registration_fee}
                  onChange={(e) => setFormData({ ...formData, registration_fee: Number(e.target.value) })}
                  className="bg-black/40 border-red-600/30"
                  min="1"
                />
              </div>
            )}

            <div>
              <Label>Max Participants</Label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                className="bg-black/40 border-red-600/30"
                min="1"
              />
            </div>

            {formData.event_type === 'team' && (
              <div>
                <Label>Team Size (Min-Max)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.min_team_size}
                    onChange={(e) => setFormData({ ...formData, min_team_size: Number(e.target.value) })}
                    className="bg-black/40 border-red-600/30"
                    min="1"
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    value={formData.max_team_size}
                    onChange={(e) => setFormData({ ...formData, max_team_size: Number(e.target.value) })}
                    className="bg-black/40 border-red-600/30"
                    min="1"
                    placeholder="Max"
                  />
                </div>
              </div>
            )}
          </div>

          {/* UPI Payment Settings - Only for Paid Events */}
          {!formData.is_free_event && (
            <div className="space-y-3 p-3 border border-yellow-500/30 rounded-lg bg-yellow-500/5">
              <Label className="text-yellow-400">Payment Settings (For Paid Events)</Label>
              
              <div>
                <Label className="text-sm text-gray-400">UPI ID (Optional)</Label>
                <Input
                  type="text"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  placeholder="yourname@upi"
                  className="bg-black/40 border-red-600/30"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-400">Upload UPI QR Code</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleUpiQrUpload}
                  disabled={uploading}
                  className="bg-black/40 border-red-600/30"
                />
                {formData.upi_qr_url && (
                  <div className="p-2 bg-black/60 border border-red-600/20 rounded mt-2">
                    <p className="text-xs text-green-500 mb-2">✓ QR Code uploaded</p>
                    <img src={formData.upi_qr_url} alt="UPI QR" className="w-24 h-24 object-contain bg-white p-1 rounded" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading || uploadingPoster} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              {loading ? 'Saving...' : uploading || uploadingPoster ? 'Uploading...' : (event ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}