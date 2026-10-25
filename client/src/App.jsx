import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import InstituteHome from './pages/institute/Home.jsx';
import NewApplication from './pages/institute/NewApplication.jsx';
import ApplicationDetail from './pages/institute/ApplicationDetail.jsx';
import OfficerDashboard from './pages/officer/Dashboard.jsx';
import Queue from './pages/officer/Queue.jsx';
import Review from './pages/officer/Review.jsx';
import Audit from './pages/Audit.jsx';
import Rules from './pages/admin/Rules.jsx';
import Users from './pages/admin/Users.jsx';

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />

      <Route element={<Guard roles={['institute']}><Layout /></Guard>}>
        <Route path="/institute" element={<InstituteHome />} />
        <Route path="/institute/new" element={<NewApplication />} />
        <Route path="/institute/applications/:id" element={<ApplicationDetail />} />
      </Route>

      <Route element={<Guard roles={['officer', 'admin']}><Layout /></Guard>}>
        <Route path="/officer" element={<OfficerDashboard />} />
        <Route path="/officer/queue" element={<Queue />} />
        <Route path="/officer/applications/:id" element={<Review />} />
        <Route path="/officer/audit" element={<Audit />} />
        <Route path="/admin" element={<OfficerDashboard admin />} />
        <Route path="/admin/rules" element={<Rules />} />
        <Route path="/admin/audit" element={<Audit />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/applications/:id" element={<Review />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
