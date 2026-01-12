import { useNavigate, useLocation } from 'react-router-dom';
import { RegistrationPage } from '@/components/RegistrationPage';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedEvent = location.state?.selectedEvent;

  return (
    <RegistrationPage 
      onClose={() => navigate(-1)} 
      initialEventId={selectedEvent}
    />
  );
}
