import { useState, useEffect } from 'react';
import { Input, Select, Button, Tag, Badge, Popconfirm, message, Skeleton, Pagination, Segmented } from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, FileTextOutlined,
  ClockCircleOutlined, CheckCircleOutlined, SendOutlined, DeleteOutlined,
  UserOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Requirement, RequirementType, RequirementStatus } from '../types';
import { getRequirements, deleteRequirement } from '../lib/storage';
import { useAuth } from '../lib/AuthContext';

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<RequirementStatus, string> = {
  '草稿': 'default',
  '待审核': 'processing',
  '设计中': 'warning',
  '已交付': 'success',
  '已关闭': 'default',
};

const PRIORITY_COLORS: Record<string, string> = {
  '紧急': '#ef4444',
  '高': '#f59e0b',
  '中': '#4f46e5',
  '低': '#10b981',
};

const TYPE_COLORS: Record<RequirementType, string> = {
  '视觉设计': 'blue',
  '美术': 'purple',
  '动画': 'orange',
};

const STAT_ICONS = [
  { icon: <FileTextOutlined />, color: '#4f46e5' },
  { icon: <ClockCircleOutlined />, color: '#3b82f6' },
  { icon: <SendOutlined />, color: '#f59e0b' },
  { icon: <CheckCircleOutlined />, color: '#10b981' },
];

function isOverdue(req: Requirement): boolean {
  if (!req.end_date || req.status === '已交付' || req.status === '已关闭') return false;
  return dayjs(req.end_date).isBefore(dayjs(), 'day');
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [scope, setScope] = useState<string>('全部');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRequirements();
      setRequirements(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteRequirement(id);
      setRequirements(prev => prev.filter(r => r.id !== id));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const filtered = requirements.filter(r => {
    if (search && !r.title.includes(search) && !r.requester.includes(search) && !r.department.includes(search)) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (scope === '我创建的' && r.creator_id !== user?.id) return false;
    if (scope === '我参与的' && r.creator_id !== user?.id && !(r.collaborator_ids || []).includes(user?.id || '') && r.assignee_id !== user?.id) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, scope]);

  const stats = [
    { label: '全部需求', value: requirements.length, status: '' },
    { label: '待审核', value: requirements.filter(r => r.status === '待审核').length, status: '待审核' },
    { label: '设计中', value: requirements.filter(r => r.status === '设计中').length, status: '设计中' },
    { label: '已交付', value: requirements.filter(r => r.status === '已交付').length, status: '已交付' },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="stat-card"
            onClick={() => setFilterStatus(filterStatus === s.status ? '' : s.status)}
            style={{
              cursor: 'pointer',
              outline: filterStatus === s.status ? `2px solid ${STAT_ICONS[i].color}` : 'none',
              outlineOffset: -2,
              transition: 'outline 0.2s, transform 0.15s',
              transform: filterStatus === s.status ? 'scale(1.02)' : undefined,
            }}
          >
            <div style={{ color: STAT_ICONS[i].color, fontSize: 20, marginBottom: 8 }}>{STAT_ICONS[i].icon}</div>
            <div className="stat-number" style={i > 0 ? {
              background: `linear-gradient(135deg, ${STAT_ICONS[i].color}, ${STAT_ICONS[i].color}cc)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : undefined}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 范围切换 */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={scope}
          onChange={v => setScope(v as string)}
          options={[
            { label: '全部', value: '全部', icon: <FileTextOutlined /> },
            { label: '我创建的', value: '我创建的', icon: <UserOutlined /> },
            { label: '我参与的', value: '我参与的', icon: <SendOutlined /> },
          ]}
        />
      </div>

      {/* 搜索筛选 */}
      <div className="section-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="搜索标题、提需人、部门..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, borderRadius: 10 }}
            allowClear
          />
          <Select
            value={filterType || undefined}
            onChange={v => setFilterType(v || '')}
            placeholder="需求类型"
            allowClear
            style={{ width: 120 }}
            options={[
              { label: '视觉设计', value: '视觉设计' },
              { label: '美术', value: '美术' },
              { label: '动画', value: '动画' },
            ]}
          />
          <Select
            value={filterStatus || undefined}
            onChange={v => setFilterStatus(v || '')}
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            options={[
              { label: '待审核', value: '待审核' },
              { label: '设计中', value: '设计中' },
              { label: '已交付', value: '已交付' },
              { label: '已关闭', value: '已关闭' },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/create')}
            style={{ borderRadius: 10, height: 38, fontWeight: 500, background: '#4f46e5' }}
          >
            创建需求
          </Button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="section-card" style={{ padding: '20px 24px' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FileTextOutlined /></div>
          <div className="empty-title">
            {requirements.length === 0 ? '还没有需求' : '没有符合条件的需求'}
          </div>
          <div className="empty-desc">
            {requirements.length === 0 ? '点击上方「创建需求」开始提交第一个设计需求' : '试试调整筛选条件'}
          </div>
          {requirements.length === 0 && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/create')}
              size="large"
              style={{ borderRadius: 12, fontWeight: 500, background: '#4f46e5', height: 44 }}
            >
              创建需求
            </Button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {paged.map(req => (
              <div
                key={req.id}
                className="req-item"
                onClick={() => navigate(`/req/${req.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{req.title}</span>
                      <Tag color={TYPE_COLORS[req.type]} style={{ borderRadius: 6 }}>{req.type}</Tag>
                      <Badge
                        status={STATUS_COLORS[req.status] as 'default' | 'processing' | 'warning' | 'success'}
                        text={<span style={{ fontSize: 13, color: '#64748b' }}>{req.status}</span>}
                      />
                      {isOverdue(req) && (
                        <Tag color="red" icon={<WarningOutlined />} style={{ borderRadius: 6 }}>已逾期</Tag>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 13, flexWrap: 'wrap' }}>
                      <span>{req.requester}</span>
                      {req.department && <span>{req.department}</span>}
                      {req.priority && (
                        <span style={{ color: PRIORITY_COLORS[req.priority], fontWeight: 500 }}>{req.priority}</span>
                      )}
                      <span>{dayjs(req.created_at).format('MM-DD HH:mm')}</span>
                      {req.end_date && (
                        <span style={{ color: isOverdue(req) ? '#ef4444' : '#94a3b8' }}>
                          截止 {req.end_date}
                        </span>
                      )}
                    </div>
                    {req.background && (
                      <div style={{ color: '#64748b', marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        {req.background.length > 100 ? req.background.substring(0, 100) + '...' : req.background}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={(e) => { e.stopPropagation(); navigate(`/req/${req.id}`); }}
                      style={{ color: '#64748b' }}
                    />
                    {(profile?.role === 'admin' || req.creator_id === user?.id) && (
                      <Popconfirm
                        title="确定删除这个需求？"
                        onConfirm={(e) => handleDelete(req.id, e as unknown as React.MouseEvent)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#94a3b8' }}
                        />
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Pagination
                current={page}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                showTotal={(total) => `共 ${total} 条`}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
