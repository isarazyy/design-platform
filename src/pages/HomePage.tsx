import { useState, useEffect } from 'react';
import { Input, Select, Button, Tag, Badge, Popconfirm, message, Skeleton, Pagination, Segmented, Checkbox } from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, FileTextOutlined,
  ClockCircleOutlined, CheckCircleOutlined, SendOutlined, DeleteOutlined,
  UserOutlined, WarningOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Requirement, RequirementType, RequirementStatus } from '../types';
import { getRequirements, deleteRequirement, batchUpdateStatus, batchDeleteRequirements } from '../lib/storage';
import { useAuth } from '../lib/AuthContext';
import { getAllProfiles, type Profile } from '../lib/auth';

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<RequirementStatus, string> = {
  '待制作': 'default',
  '制作中': 'warning',
  '待审核': 'processing',
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

const ALL_STATUSES: RequirementStatus[] = ['待制作', '制作中', '待审核', '已交付', '已关闭'];

function isOverdue(req: Requirement): boolean {
  if (!req.end_date || req.status === '已交付' || req.status === '已关闭') return false;
  return dayjs(req.end_date).isBefore(dayjs(), 'day');
}

function resolveAssignee(req: Requirement, profiles: Profile[]): string {
  if (!req.assignee_id) return '';
  const p = profiles.find(pr => pr.id === req.assignee_id);
  return p ? p.name : '';
}

function exportCSV(reqs: Requirement[], profiles: Profile[]) {
  const header = ['标题', '提需人', '部门', '需求类型', '状态', '优先级', '负责人', '创建日期', '截止日期'];
  const rows = reqs.map(r => [
    r.title,
    r.requester,
    r.department,
    r.type,
    r.status,
    r.priority || '',
    resolveAssignee(r, profiles),
    dayjs(r.created_at).format('YYYY-MM-DD'),
    r.end_date || '',
  ]);
  const bom = '\uFEFF';
  const csv = bom + [header, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `需求列表_${dayjs().format('YYYY-MM-DD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, profiles] = await Promise.all([getRequirements(), getAllProfiles()]);
      setRequirements(data);
      setAllProfiles(profiles);
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
    { label: '待制作', value: requirements.filter(r => r.status === '待制作').length, status: '待制作' },
    { label: '制作中', value: requirements.filter(r => r.status === '制作中').length, status: '制作中' },
    { label: '已交付', value: requirements.filter(r => r.status === '已交付').length, status: '已交付' },
  ];

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchStatus = async (status: RequirementStatus) => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      await batchUpdateStatus(selectedIds, status);
      setRequirements(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, status } : r));
      message.success(`已将 ${selectedIds.length} 条需求改为「${status}」`);
      setSelectedIds([]);
    } catch {
      message.error('批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      await batchDeleteRequirements(selectedIds);
      setRequirements(prev => prev.filter(r => !selectedIds.includes(r.id)));
      message.success(`已删除 ${selectedIds.length} 条需求`);
      setSelectedIds([]);
    } catch {
      message.error('批量删除失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

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
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportCSV(filtered, allProfiles)}
            style={{ borderRadius: 10, height: 38 }}
          >
            导出
          </Button>
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

      {/* 批量操作栏 */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="section-card" style={{
          marginBottom: 16,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#f0f0ff',
          border: '1px solid #c7d2fe',
        }}>
          <span style={{ fontWeight: 500, color: '#4f46e5' }}>已选 {selectedIds.length} 项</span>
          <Select
            placeholder="批量改状态"
            size="small"
            style={{ width: 130 }}
            onChange={v => { if (v) handleBatchStatus(v as RequirementStatus); }}
            loading={batchLoading}
            options={ALL_STATUSES.map(s => ({ label: s, value: s }))}
            value={null as unknown as string}
          />
          <Popconfirm title={`确定删除 ${selectedIds.length} 条需求？`} onConfirm={handleBatchDelete} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button danger size="small" loading={batchLoading}>批量删除</Button>
          </Popconfirm>
          <Button size="small" onClick={() => setSelectedIds([])}>取消选择</Button>
        </div>
      )}

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
            {paged.map(req => {
              const assigneeName = resolveAssignee(req, allProfiles);
              const versionCount = (req.versions || []).length;
              return (
                <div
                  key={req.id}
                  className="req-item"
                  onClick={() => navigate(`/req/${req.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                      {isAdmin && (
                        <div style={{ paddingTop: 2 }} onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(req.id)}
                            onClick={e => toggleSelect(req.id, e as unknown as React.MouseEvent)}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{req.title}</span>
                          <Tag color={TYPE_COLORS[req.type]} style={{ borderRadius: 6 }}>{req.type}</Tag>
                          <Badge
                            status={STATUS_COLORS[req.status] as 'default' | 'processing' | 'warning' | 'success'}
                            text={<span style={{ fontSize: 13, color: '#64748b' }}>{req.status}</span>}
                          />
                          {req.priority && (
                            <Tag color={PRIORITY_COLORS[req.priority]} style={{ borderRadius: 6, border: 'none', color: '#fff' }}>
                              {req.priority}
                            </Tag>
                          )}
                          {isOverdue(req) && (
                            <Tag color="red" icon={<WarningOutlined />} style={{ borderRadius: 6 }}>已逾期</Tag>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span>{req.requester}</span>
                          {req.department && <span>{req.department}</span>}
                          {assigneeName && (
                            <span style={{ color: '#4f46e5' }}>
                              <UserOutlined style={{ marginRight: 3, fontSize: 11 }} />
                              {assigneeName}
                            </span>
                          )}
                          {!assigneeName && req.assignee_id && (
                            <span style={{ color: '#c0c0c0' }}>未指派</span>
                          )}
                          {versionCount > 0 && (
                            <span>
                              {Array.from({ length: versionCount }, (_, i) => (
                                <Tag key={i} color="blue" style={{ borderRadius: 4, margin: 0, marginRight: 3, padding: '0 5px', fontSize: 11 }}>V{i + 1}</Tag>
                              ))}
                            </span>
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
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/req/${req.id}`); }}
                        style={{ color: '#64748b' }}
                      />
                      {(isAdmin || req.creator_id === user?.id) && (
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
              );
            })}
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
