import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Dashboard redirects to Scanner - the main coordinator page
export default function CoordinatorDashboard() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if coordinator is logged in
        const coordinatorData = localStorage.getItem('coordinator');
        if (!coordinatorData) {
            navigate('/coordinator/login', { replace: true });
            return;
        }
        
        // Redirect to Scanner (main coordinator page)
        navigate('/coordinator/scan', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
    );
}
