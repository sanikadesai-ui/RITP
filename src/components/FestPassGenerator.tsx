import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Share2, CheckCircle, Calendar, MapPin, Ticket } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface FestPassGeneratorProps {
    registration: {
        id: string;
        full_name: string;
        email: string;
        phone?: string;
        college?: string;
        fest_registration_code: string;
    };
}

// Secret key for encryption - matches coordinator scanner
const SECRET_KEY = import.meta.env.VITE_QR_SECRET_KEY || 'kaizen-ritp-2026-secret-key';

export const FestPassGenerator: React.FC<FestPassGeneratorProps> = ({
    registration,
}) => {
    const passRef = useRef<HTMLDivElement>(null);

    // Create encrypted QR data for fest pass
    const createFestQRData = () => {
        const payload = {
            type: 'FEST_PASS',
            code: registration.fest_registration_code,
            name: registration.full_name,
            email: registration.email,
            id: registration.id,
            t: Date.now(),
        };
        
        // Create signature
        const sigData = `${payload.code}|${payload.id}|${payload.t}`;
        const signature = CryptoJS.HmacSHA256(sigData, SECRET_KEY).toString().substring(0, 16);
        
        const dataWithSig = { ...payload, s: signature };
        
        // Encode to base64
        const jsonStr = JSON.stringify(dataWithSig);
        return btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const qrData = createFestQRData();

    // Download pass as image
    const downloadPass = async () => {
        if (!passRef.current) return;

        try {
            const canvas = await html2canvas(passRef.current, {
                backgroundColor: '#1a1a1a',
                scale: 2,
            });

            const link = document.createElement('a');
            link.download = `kaizen-fest-pass-${registration.full_name.replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error downloading pass:', error);
        }
    };

    // Share pass (if supported)
    const sharePass = async () => {
        if (!navigator.share) {
            alert('Sharing is not supported on this device');
            return;
        }

        if (!passRef.current) return;

        try {
            const canvas = await html2canvas(passRef.current, {
                backgroundColor: '#1a1a1a',
                scale: 2,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], `kaizen-fest-pass.png`, { type: 'image/png' });

                await navigator.share({
                    title: `KAIZEN 2026 - Fest Pass`,
                    text: `Fest Pass for ${registration.full_name}`,
                    files: [file],
                });
            });
        } catch (error) {
            console.error('Error sharing pass:', error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Fest Pass Card */}
            <div
                ref={passRef}
                className="bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-2xl shadow-red-500/30 max-w-sm mx-auto"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-4 py-4 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    <div className="relative">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Ticket className="w-6 h-6 text-white" />
                            <h2 className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
                                KAIZEN 2026
                            </h2>
                        </div>
                        <p className="text-red-100 text-sm font-medium tracking-widest uppercase">
                            ✦ FEST PASS ✦
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-5 space-y-4">
                    {/* QR Code */}
                    <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-lg ring-4 ring-red-500/20">
                            <QRCodeSVG
                                value={qrData}
                                size={180}
                                level="M"
                                includeMargin={true}
                            />
                        </div>
                    </div>

                    {/* Fest Registration Code */}
                    <div className="text-center bg-black/50 rounded-lg py-3 px-4 border border-red-500/30">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Fest Registration Code</p>
                        <p className="text-red-400 font-mono text-2xl tracking-widest font-bold">
                            {registration.fest_registration_code}
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-gray-600 relative">
                        <div className="absolute -left-6 -top-3 w-6 h-6 bg-gray-950 rounded-full"></div>
                        <div className="absolute -right-6 -top-3 w-6 h-6 bg-gray-950 rounded-full"></div>
                    </div>

                    {/* Attendee Details */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider">Attendee Name</p>
                            <p className="text-white font-semibold text-xl">{registration.full_name}</p>
                        </div>

                        {registration.college && (
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider">College</p>
                                <p className="text-gray-200 text-sm">{registration.college}</p>
                            </div>
                        )}

                        <div className="flex justify-between text-sm">
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider">Date</p>
                                <p className="text-gray-200 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Jan 2026
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-xs uppercase tracking-wider">Venue</p>
                                <p className="text-gray-200 flex items-center gap-1 justify-end">
                                    <MapPin className="w-3 h-3" />
                                    RIT Rajaramnagar
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-2 bg-green-900/30 border border-green-500/30 rounded-lg py-2 px-4">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">Payment Verified • Access Granted</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-800/50 px-4 py-3 text-center border-t border-gray-700">
                    <p className="text-gray-400 text-xs">
                        🎫 Present this pass at the fest entrance for entry
                    </p>
                    <p className="text-gray-500 text-[10px] mt-1">
                        Scan QR for attendance verification
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
                <Button
                    onClick={downloadPass}
                    className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Pass
                </Button>

                {'share' in navigator && (
                    <Button
                        onClick={sharePass}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-black/30 rounded-lg p-4 border border-white/10 text-sm space-y-2">
                <h4 className="text-white font-medium mb-2">📋 How to use your Fest Pass:</h4>
                <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Download or screenshot this pass</li>
                    <li>Show it at the fest entrance gate</li>
                    <li>Coordinator will scan your QR code</li>
                    <li>Get entry and enjoy KAIZEN 2026!</li>
                </ol>
            </div>
        </div>
    );
};

export default FestPassGenerator;
