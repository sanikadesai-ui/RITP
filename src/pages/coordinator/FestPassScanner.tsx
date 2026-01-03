import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// FestPassScanner redirects to Scanner - fest pass scanning is now integrated into the main Scanner
export default function FestPassScanner() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if coordinator is logged in
        const coordinatorData = localStorage.getItem('coordinator');
        if (!coordinatorData) {
            navigate('/coordinator/login', { replace: true });
            return;
        }
        
        // Redirect to Scanner which now supports fest pass scanning for global coordinators
        navigate('/coordinator/scanner', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
    );
}
