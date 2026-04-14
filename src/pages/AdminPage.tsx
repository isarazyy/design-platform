import { useState, useEffect } from 'react';
import { Select, message, Spin, Tag, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Profile } from '../lib/auth';
import { getAllProfiles, updateUserRole } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

const ROLE_OPTIONS = [
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'purple',
  user: 'default',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  user: '普通用户',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, role: Profile['role']) => {
    try {
      await updateUserRole(userId, role);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role } : p));
      message.success('角色已更新');
    } catch {
      message.error('更新失败');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回</Button>
      </div>

      <div className="section-card">
        <div className="section-title">用户管理</div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          共 {profiles.length} 个用户。可以在这里修改用户角色。
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {profiles.map(p => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name || '未设置姓名'}</span>
                  <Tag color={ROLE_COLORS[p.role]}>{ROLE_LABELS[p.role]}</Tag>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                  {p.email} {p.department && `· ${p.department}`} · {dayjs(p.created_at).format('MM-DD')}注册
                </div>
              </div>
              <Select
                value={p.role}
                onChange={v => handleRoleChange(p.id, v)}
                options={ROLE_OPTIONS}
                style={{ width: 110 }}
                disabled={p.id === user?.id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
