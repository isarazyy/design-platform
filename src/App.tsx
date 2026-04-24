import './dayjs-locale';
import { ConfigProvider, Spin } from 'antd';
import zhCNRaw from 'antd/locale/zh_CN';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

const zhCN = (zhCNRaw as unknown as { default?: typeof zhCNRaw }).default ?? zhCNRaw;
import { AuthProvider, useAuth } from './lib/AuthContext';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import EditPage from './pages/EditPage';
import DetailPage from './pages/DetailPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import DraftsPage from './pages/DraftsPage';
import DashboardPage from './pages/DashboardPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/drafts" element={<DraftsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Route>
      <Route path="/req/:id" element={<RequireAuth><DetailPage /></RequireAuth>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 10,
          fontSize: 14,
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
        },
        components: {
          Button: { borderRadius: 10, controlHeight: 38 },
          Input: { borderRadius: 10 },
          Select: { borderRadius: 10 },
          DatePicker: { borderRadius: 10 },
        },
      }}
    >
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </ConfigProvider>
  );
}
