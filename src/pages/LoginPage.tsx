import { useState } from 'react';
import { Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp, isAllowedEmail } from '../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { message.error('请填写邮箱和密码'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      message.success('登录成功');
      navigate('/');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) { message.error('请填写必填项'); return; }
    if (!isAllowedEmail(email)) { message.error('仅支持 @kanyun.com 公司邮箱注册'); return; }
    if (password.length < 6) { message.error('密码至少6位'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name, department);
      message.success('注册成功，请登录');
      setTab('login');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '注册失败');
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
          <div style={{ color: '#64748b', fontSize: 15 }}>设计需求协作平台</div>
        </div>

        <div className="section-card" style={{ padding: 32 }}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            centered
            items={[
              { key: 'login', label: '登录' },
              { key: 'register', label: '注册' },
            ]}
          />

          {tab === 'login' ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
              <Input
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="公司邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                size="large"
                onPressEnter={handleLogin}
              />
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                size="large"
                onPressEnter={handleLogin}
              />
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleLogin}
                style={{ height: 46, borderRadius: 12, fontWeight: 600, background: '#4f46e5', marginTop: 8 }}
              >
                登录
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
              <Input
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="公司邮箱（@kanyun.com）"
                value={email}
                onChange={e => setEmail(e.target.value)}
                size="large"
              />
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="密码（至少6位）"
                value={password}
                onChange={e => setPassword(e.target.value)}
                size="large"
              />
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="姓名（必填）"
                value={name}
                onChange={e => setName(e.target.value)}
                size="large"
              />
              <Input
                prefix={<TeamOutlined style={{ color: '#94a3b8' }} />}
                placeholder="部门（选填）"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                size="large"
              />
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handleRegister}
                style={{ height: 46, borderRadius: 12, fontWeight: 600, background: '#4f46e5', marginTop: 8 }}
              >
                注册
              </Button>
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                仅限 @kanyun.com 公司邮箱注册
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
