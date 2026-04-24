import { useState } from 'react';
import { Layout, Menu, Dropdown, Button, Avatar, Drawer } from 'antd';
import { HomeOutlined, PlusCircleOutlined, LogoutOutlined, SettingOutlined, FileTextOutlined, BarChartOutlined, MenuOutlined } from '@ant-design/icons';
import NotificationBell from './NotificationBell';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';

const { Header, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '需求列表' },
    { key: '/create', icon: <PlusCircleOutlined />, label: '创建需求' },
    { key: '/drafts', icon: <FileTextOutlined />, label: '草稿箱' },
    { key: '/dashboard', icon: <BarChartOutlined />, label: '数据看板' },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ key: '/admin', icon: <SettingOutlined />, label: '管理' });
  }

  const currentKey = menuItems.find(m => location.pathname === m.key)?.key || '/';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMobileNav = (key: string) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const userMenuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{profile?.name || '未设置姓名'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{profile?.email}</div>
          {profile?.department && <div style={{ fontSize: 12, color: '#94a3b8' }}>{profile.department}</div>}
          <div style={{ fontSize: 11, color: '#c7d2fe', marginTop: 2 }}>
            {profile?.role === 'admin' ? '管理员' : '普通用户'}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const initials = (profile?.name || '?').slice(0, 1);

  return (
    <Layout className="page-bg" style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 60,
          lineHeight: '60px',
        }}
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(true)}
          style={{ display: 'none', marginRight: 8 }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginRight: 40,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
          }}
          onClick={() => navigate('/')}
        >
          设计需求平台
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[currentKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, border: 'none', background: 'transparent', lineHeight: '58px' }}
        />
        <NotificationBell />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 8px' }}>
            <Avatar size={30} style={{ background: '#4f46e5', fontSize: 14 }}>{initials}</Avatar>
            <span style={{ color: '#0f172a', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.name}</span>
          </Button>
        </Dropdown>
      </Header>

      <Drawer
        title="导航"
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={260}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[currentKey]}
          items={menuItems}
          onClick={({ key }) => handleMobileNav(key)}
          style={{ border: 'none' }}
        />
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
          <Button block danger onClick={handleLogout} icon={<LogoutOutlined />}>
            退出登录
          </Button>
        </div>
      </Drawer>

      <Content style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
