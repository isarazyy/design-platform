import { useState } from 'react';
import { Input, Button, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../lib/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password || !confirm) { message.error('请填写新密码'); return; }
    if (password.length < 6) { message.error('密码至少6位'); return; }
    if (password !== confirm) { message.error('两次密码不一致'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      message.success('密码已重置，请重新登录');
      navigate('/login');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            设计需求平台
          </div>
        </div>

        <div className="section-card" style={{ padding: 32 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>设置新密码</div>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="新密码（至少6位）"
              value={password}
              onChange={e => setPassword(e.target.value)}
              size="large"
            />
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="确认新密码"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              size="large"
              onPressEnter={handleSubmit}
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleSubmit}
              style={{ height: 46, borderRadius: 12, fontWeight: 600, background: '#4f46e5' }}
            >
              确认重置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
