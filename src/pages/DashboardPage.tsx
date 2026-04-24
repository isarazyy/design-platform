import { useState, useEffect, useMemo } from 'react';
import { Spin, Card, Progress, Tag, Table } from 'antd';
import { BarChartOutlined, ClockCircleOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Requirement, RequirementStatus } from '../types';
import { getRequirements } from '../lib/storage';
import { useAuth } from '../lib/AuthContext';
import { getAllProfiles, type Profile } from '../lib/auth';

const PRIMARY = '#4f46e5';
const WARNING = '#f59e0b';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';

const STATUS_ORDER: RequirementStatus[] = ['待制作', '制作中', '待审核', '已交付', '已关闭'];

const STATUS_BAR_COLORS: Record<RequirementStatus, string> = {
  待制作: '#94a3b8',
  制作中: WARNING,
  待审核: PRIMARY,
  已交付: SUCCESS,
  已关闭: '#64748b',
};

function isOverdue(req: Requirement): boolean {
  if (!req.end_date || req.status === '已交付' || req.status === '已关闭') return false;
  return dayjs(req.end_date).isBefore(dayjs(), 'day');
}

function isMine(req: Requirement, userId: string): boolean {
  return req.creator_id === userId || req.assignee_id === userId;
}

function statusCounts(list: Requirement[]): Record<RequirementStatus, number> {
  const init: Record<RequirementStatus, number> = {
    待制作: 0,
    制作中: 0,
    待审核: 0,
    已交付: 0,
    已关闭: 0,
  };
  for (const r of list) {
    init[r.status] += 1;
  }
  return init;
}

function StatusDistributionBars({ list }: { list: Requirement[] }) {
  const counts = statusCounts(list);
  const total = list.length || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {STATUS_ORDER.map((s) => {
        const n = counts[s];
        const pct = Math.round((n / total) * 1000) / 10;
        return (
          <div key={s}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Tag color={STATUS_BAR_COLORS[s]} style={{ margin: 0, border: 'none' }}>
                {s}
              </Tag>
              <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                {n}（{total ? `${pct}%` : '0%'}）
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--ant-color-fill-quaternary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${total ? (n / total) * 100 : 0}%`,
                  height: '100%',
                  background: STATUS_BAR_COLORS[s],
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminStatusProgress({ list }: { list: Requirement[] }) {
  const counts = statusCounts(list);
  const total = list.length || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {STATUS_ORDER.map((s) => {
        const n = counts[s];
        const percent = total ? Math.round((n / total) * 100) : 0;
        return (
          <div key={s}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{s}</span>
              <span style={{ color: 'var(--ant-color-text-secondary)' }}>
                {n} / {list.length}
              </span>
            </div>
            <Progress
              percent={percent}
              showInfo
              strokeColor={STATUS_BAR_COLORS[s]}
              trailColor="var(--ant-color-fill-quaternary)"
            />
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const reqs = await getRequirements();
        if (cancelled) return;
        setRequirements(reqs);
        if (profile?.role === 'admin') {
          const ps = await getAllProfiles();
          if (!cancelled) setProfiles(ps);
        } else {
          setProfiles([]);
        }
      } catch {
        if (!cancelled) {
          setRequirements([]);
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.role]);

  const personal = useMemo(() => {
    if (!userId) {
      return {
        created: [] as Requirement[],
        assigned: [] as Requirement[],
        mine: [] as Requirement[],
        createdCount: 0,
        assignedCount: 0,
        avgDeliveryDays: null as number | null,
        overdueRate: 0,
      };
    }
    const created = requirements.filter((r) => r.creator_id === userId);
    const assigned = requirements.filter((r) => r.assignee_id === userId);
    const mine = requirements.filter((r) => isMine(r, userId));
    const deliveredMine = mine.filter((r) => r.status === '已交付');
    let avgDeliveryDays: number | null = null;
    if (deliveredMine.length > 0) {
      const sum = deliveredMine.reduce((acc, r) => {
        const days = dayjs(r.updated_at).diff(dayjs(r.created_at), 'day', true);
        return acc + Math.max(0, days);
      }, 0);
      avgDeliveryDays = Math.round((sum / deliveredMine.length) * 10) / 10;
    }
    const overdueAmongMine = mine.filter((r) => isOverdue(r)).length;
    const overdueRate = mine.length ? Math.round((overdueAmongMine / mine.length) * 1000) / 10 : 0;
    return {
      created,
      assigned,
      mine,
      createdCount: created.length,
      assignedCount: assigned.length,
      avgDeliveryDays,
      overdueRate,
    };
  }, [requirements, userId]);

  const adminStats = useMemo(() => {
    if (profile?.role !== 'admin') {
      return { tableRows: [] as { key: string; name: string; created: number; assigned: number; delivered: number }[], overdueTotal: 0 };
    }
    const overdueTotal = requirements.filter((r) => isOverdue(r)).length;
    const rows = profiles.map((p) => {
      const created = requirements.filter((r) => r.creator_id === p.id).length;
      const assigned = requirements.filter((r) => r.assignee_id === p.id).length;
      const delivered = requirements.filter((r) => r.assignee_id === p.id && r.status === '已交付').length;
      return { key: p.id, name: p.name || p.email, created, assigned, delivered };
    });
    return { tableRows: rows, overdueTotal };
  }, [profile?.role, profiles, requirements]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 32px' }}>
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-title">
          <BarChartOutlined style={{ marginRight: 8, color: PRIMARY }} />
          个人概览
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <Card size="small" bordered={false} style={{ background: 'var(--ant-color-fill-quaternary)' }}>
            <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 13, marginBottom: 8 }}>
              <UserOutlined style={{ marginRight: 6, color: PRIMARY }} />
              我创建的
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{personal.createdCount}</div>
          </Card>
          <Card size="small" bordered={false} style={{ background: 'var(--ant-color-fill-quaternary)' }}>
            <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 13, marginBottom: 8 }}>
              <ClockCircleOutlined style={{ marginRight: 6, color: WARNING }} />
              指派给我
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: WARNING }}>{personal.assignedCount}</div>
          </Card>
          <Card size="small" bordered={false} style={{ background: 'var(--ant-color-fill-quaternary)' }}>
            <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 13, marginBottom: 8 }}>
              <CheckCircleOutlined style={{ marginRight: 6, color: SUCCESS }} />
              平均交付天数
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: SUCCESS }}>
              {personal.avgDeliveryDays != null ? `${personal.avgDeliveryDays} 天` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginTop: 4 }}>已交付需求，按创建至状态为已交付时的更新时间估算</div>
          </Card>
          <Card size="small" bordered={false} style={{ background: 'var(--ant-color-fill-quaternary)' }}>
            <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 13, marginBottom: 8 }}>逾期率（与我相关）</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: DANGER }}>{personal.mine.length ? `${personal.overdueRate}%` : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginTop: 4 }}>截止日已过且未交付/未关闭</div>
          </Card>
        </div>
        <div className="section-title" style={{ marginTop: 8 }}>
          与我相关的需求 · 状态分布
        </div>
        <StatusDistributionBars list={personal.mine} />
      </div>

      {profile?.role === 'admin' && (
        <div className="section-card">
          <div className="section-title">
            <BarChartOutlined style={{ marginRight: 8, color: PRIMARY }} />
            全局统计（管理员）
          </div>
          <div style={{ marginBottom: 20 }}>
            <Tag color={PRIMARY} style={{ fontSize: 14, padding: '4px 12px' }}>
              需求总数：{requirements.length}
            </Tag>
            <Tag color={DANGER} style={{ fontSize: 14, padding: '4px 12px', marginLeft: 8 }}>
              全局逾期数：{adminStats.overdueTotal}
            </Tag>
          </div>
          <div className="section-title">整体状态分布</div>
          <AdminStatusProgress list={requirements} />
          <div className="section-title" style={{ marginTop: 24 }}>
            按用户统计
          </div>
          <Table
            size="small"
            pagination={false}
            dataSource={adminStats.tableRows}
            columns={[
              { title: '姓名', dataIndex: 'name', key: 'name' },
              { title: '创建数', dataIndex: 'created', key: 'created', align: 'right' as const },
              { title: '指派数', dataIndex: 'assigned', key: 'assigned', align: 'right' as const },
              { title: '已交付（指派）', dataIndex: 'delivered', key: 'delivered', align: 'right' as const },
            ]}
          />
        </div>
      )}
    </div>
  );
}
