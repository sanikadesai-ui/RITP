
import os

filePath = r"D:\RITP\src\pages\Events.tsx"

clean_event_card = r"""function EventCard({ event, onViewDetails, onRegister }: {
    event: Event;
    onViewDetails: () => void;
    onRegister: (eventId: string, registrationStatus: RegistrationStatusType) => void
}) {
    const registrationStatus = useMemo((): RegistrationStatusType => {
        const now = new Date();

        // Check if registration hasn't started yet
        if (event.registration_start_date && new Date(event.registration_start_date) > now) {
            return {
                status: 'upcoming',
                label: 'Coming Soon',
                message: `Registration opens on ${new Date(event.registration_start_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}`,
                canRegister: false
            };
        }

        // Check if registration has ended
        if (event.registration_end_date && new Date(event.registration_end_date) < now) {
            return { status: 'closed', label: 'Closed', message: 'Registration has ended for this event', canRegister: false };
        }

        // Check if max participants reached
        if (event.max_participants > 0 && event.current_participants >= event.max_participants) {
            return { status: 'closed', label: 'Full', message: 'Maximum participants reached', canRegister: false };
        }

        return { status: 'open', label: 'Register', message: 'Registration is open', canRegister: true };
    }, [event]);

    // Determine if it's a free or paid event
    const isFreeEvent = !event.registration_fee || event.registration_fee === 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails();
        }
    };

    return (
        <div
            role="article"
            tabIndex={0}
            aria-label={`${event.name} - ${event.category} event. ${registrationStatus.canRegister ? 'Registration open' : registrationStatus.label}`}
            className="group relative bg-black border border-red-900/50 hover:border-red-500/70 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-900/30 rounded-xl overflow-hidden flex flex-col cursor-pointer"
            onClick={onViewDetails}
            onKeyDown={handleKeyDown}
        >
            {/* Premium Card Image Section with Dark Overlay */}
            <div className="relative h-52 overflow-hidden bg-black">
                {event.image_url ? (
                    <img
                        src={event.image_url}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : null}

                {/* Fallback gradient when no image */}
                <div className={`absolute inset-0 bg-gradient-to-br from-red-950 via-red-900/50 to-black ${event.image_url ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-red-800/30" />
                    </div>
                </div>

                {/* Dark overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />

                {/* Subtle red glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Top Badges Row */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
                    {/* Left Badge - Registration Status */}
                    {registrationStatus.status !== 'open' ? (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border ${registrationStatus.status === 'upcoming'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}>
                            {registrationStatus.status === 'upcoming' ? (
                                <><Clock className="w-3.5 h-3.5" /> Coming Soon</>
                            ) : (
                                <><Lock className="w-3.5 h-3.5" /> {registrationStatus.label}</>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/40 text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Open
                        </div>
                    )}

                    {event.is_featured && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-yellow-600/90 text-white text-xs font-bold rounded-full shadow-lg z-10">
                            <Star className="w-3 h-3 fill-current" />
                            Featured
                        </div>
                    )}
                </div>
                
                <div className="absolute bottom-0 left-0 w-full p-3 z-10">
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded">
                            {event.category}
                        </span>
                        <span className="px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium rounded">
                            {event.event_type === 'team' ? '👥 team' : '👤 solo'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-black to-red-950/10">
                {/* Event Title */}
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-red-400 transition-colors line-clamp-1" style={{ fontFamily: 'inherit' }}>
                    {event.name}
                </h3>

                {/* Event Details */}
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-red-400/80">
                        <Calendar className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span>{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400/80">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400/80">
                        <Users className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span>{event.current_participants || 0}/{event.max_participants || '∞'} registered</span>
                    </div>
                </div>

                {/* Prize & Fee Cards */}
                <div className={`grid gap-3 mb-4 ${event.prize_pool && event.prize_pool > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {event.prize_pool && event.prize_pool > 0 && (
                        <div className="bg-gradient-to-br from-red-950/50 to-black border border-red-800/50 p-3 text-center rounded-lg">
                            <div className="text-red-500/70 text-[10px] uppercase tracking-widest font-medium">Prize Pool</div>
                            <div className="text-red-400 font-bold text-lg">₹{event.prize_pool?.toLocaleString()}</div>
                        </div>
                    )}
                    <div className={`bg-gradient-to-br from-red-950/50 to-black border p-3 text-center rounded-lg ${isFreeEvent ? 'border-green-700/50' : 'border-red-800/50'}`}>
                        <div className="text-red-500/70 text-[10px] uppercase tracking-widest font-medium">Entry Fee</div>
                        <div className={`font-bold text-lg ${isFreeEvent ? 'text-green-400' : 'text-red-400'}`}>
                            {isFreeEvent ? 'FREE' : `₹${event.registration_fee}`}
                        </div>
                    </div>
                </div>

                {registrationStatus.status === 'upcoming' && registrationStatus.message && (
                     <div className="w-full mb-3 py-2 px-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded text-xs text-center flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {registrationStatus.message}
                     </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button
                        onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                        variant="outline"
                        className="w-full border-red-700/60 text-red-400 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600 transition-all py-2.5 rounded-lg"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        <span>Details</span>
                    </Button>

                    {registrationStatus.status === 'upcoming' ? (
                        <ComingSoonCardButton />
                    ) : (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (registrationStatus.status === 'open') {
                                    onRegister(event.id, registrationStatus);
                                }
                            }}
                            className={`w-full border-none shadow-lg transition-all py-2.5 text-white shadow-red-900/30 rounded-lg ${registrationStatus.status !== 'open' ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'}`}
                            disabled={registrationStatus.status !== 'open'}
                        >
                            <span>{registrationStatus.label}</span>
                            {registrationStatus.status === 'open' && <ChevronRight className="w-4 h-4 ml-1" />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
"""

with open(filePath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if "function EventCard({ event, onViewDetails, onRegister }: {" in line:
        start_index = i
    if "function StatCard({label, value}: {label: string; value: string | number }) {" in line:
        end_index = i
        break

if start_index != -1 and end_index != -1:
    new_lines = lines[:start_index] + [clean_event_card + "\n\n"] + lines[end_index:]
    with open(filePath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully rewritten EventCard component.")
else:
    print(f"Could not find start ({start_index}) or end ({end_index}) markers.")
