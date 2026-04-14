import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Tag, Spin, message, Select, Descriptions, Divider, Image, Empty, Timeline, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, ShareAltOutlined, PrinterOutlined, CopyOutlined, LinkOutlined,
  HomeOutlined, EditOutlined, HistoryOutlined, UserOutlined,
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Requirement, RequirementStatus } from '../types';
import { getRequirementById, updateRequirementStatus, updateCollaborators, updateAssignee } from '../lib/storage';
import { useAuth } from '../lib/AuthContext';
import { getEditLogs, addEditLog, type EditLog } from '../lib/editLog';
import { getProfile, getAllProfiles, type Profile } from '../lib/auth';


const STATUS_STEPS: RequirementStatus[] = ['待审核', '设计中', '已交付', '已关闭'];

const STATUS_ACTIONS: Record<RequirementStatus, { label: string; target: RequirementStatus; icon: typeof PlayCircleOutlined; color: string; danger?: boolean }[]> = {
  '草稿': [{ label: '提交审核', target: '待审核', icon: PlayCircleOutlined, color: '#3b82f6' }],
  '待审核': [
    { label: '开始设计', target: '设计中', icon: PlayCircleOutlined, color: '#f59e0b' },
    { label: '关闭需求', target: '已关闭', icon: CloseCircleOutlined, color: '#94a3b8', danger: true },
  ],
  '设计中': [
    { label: '标记已交付', target: '已交付', icon: CheckCircleOutlined, color: '#10b981' },
    { label: '关闭需求', target: '已关闭', icon: CloseCircleOutlined, color: '#94a3b8', danger: true },
  ],
  '已交付': [
    { label: '关闭需求', target: '已关闭', icon: CloseCircleOutlined, color: '#94a3b8', danger: true },
  ],
  '已关闭': [],
};

const PRIORITY_COLORS: Record<string, string> = {
  '紧急': '#ff4d4f',
  '高': '#fa8c16',
  '中': '#1677ff',
  '低': '#52c41a',
};

const TYPE_COLORS: Record<string, string> = {
  '视觉设计': 'blue',
  '美术': 'purple',
  '动画': 'orange',
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [req, setReq] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EditLog[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (reqId: string) => {
    setLoading(true);
    try {
      const [data, editLogs, profiles] = await Promise.all([
        getRequirementById(reqId),
        getEditLogs(reqId),
        getAllProfiles(),
      ]);
      setReq(data);
      setLogs(editLogs);
      setAllProfiles(profiles);
      if (data?.creator_id) {
        const cp = await getProfile(data.creator_id);
        setCreatorProfile(cp);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    if (!user || !req) return false;
    if (profile?.role === 'admin') return true;
    if (req.creator_id === user.id) return true;
    if (req.collaborator_ids?.includes(user.id)) return true;
    return false;
  };

  const canChangeStatus = () => {
    if (!user || !req) return false;
    if (profile?.role === 'admin' || profile?.role === 'designer') return true;
    if (req.creator_id === user.id) return true;
    return false;
  };

  const isCreatorOrAdmin = () => {
    if (!user || !req) return false;
    if (profile?.role === 'admin') return true;
    if (req.creator_id === user.id) return true;
    return false;
  };

  const handleCollaboratorsChange = async (ids: string[]) => {
    if (!req || !id) return;
    try {
      await updateCollaborators(id, ids);
      setReq({ ...req, collaborator_ids: ids });
      if (user) {
        await addEditLog(id, user.id, profile?.name || '', '更新协作者');
        setLogs(await getEditLogs(id));
      }
      message.success('协作者已更新');
    } catch {
      message.error('更新失败');
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    if (!req || !id) return;
    try {
      await updateAssignee(id, assigneeId || null);
      setReq({ ...req, assignee_id: assigneeId || null });
      if (user) {
        const assigneeName = allProfiles.find(p => p.id === assigneeId)?.name || '';
        await addEditLog(id, user.id, profile?.name || '', '指派设计师', assigneeName ? `指派给 ${assigneeName}` : '取消指派');
        setLogs(await getEditLogs(id));
      }
      message.success('指派已更新');
    } catch {
      message.error('更新失败');
    }
  };

  const handleStatusChange = async (status: RequirementStatus) => {
    if (!req || !user) return;
    try {
      await updateRequirementStatus(req.id, status);
      await addEditLog(req.id, user.id, profile?.name || '', '状态变更', `${req.status} → ${status}`);
      setReq({ ...req, status });
      setLogs(await getEditLogs(req.id));
      message.success(`状态已更新为「${status}」`);
    } catch {
      message.error('更新失败');
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制，可以发送给同事');
    }).catch(() => {
      message.info('请手动复制地址栏链接');
    });
  };

  const handlePrint = () => window.print();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!req) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="需求不存在或已被删除" />
        <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回列表</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit() && (
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/edit/${req?.id}`)}>编辑</Button>
          )}
          <Button icon={<CopyOutlined />} onClick={handleCopyLink}>复制链接</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
        </div>
      </div>

      <div className="section-card">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1d2129' }}>{req.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Tag color={TYPE_COLORS[req.type]}>{req.type}</Tag>
            {req.priority && (
              <Tag color={PRIORITY_COLORS[req.priority]}>{req.priority}</Tag>
            )}
          </div>
        </div>

        {/* 状态进度条 */}
        <div className="no-print" style={{ margin: '20px 0 4px', display: 'flex', alignItems: 'center', gap: 0 }}>
          {STATUS_STEPS.map((step, i) => {
            const currentIdx = STATUS_STEPS.indexOf(req.status as typeof STATUS_STEPS[number]);
            const isActive = i <= currentIdx;
            const isCurrent = step === req.status;
            const stepColor = isActive
              ? (step === '已关闭' ? '#94a3b8' : ['#3b82f6', '#f59e0b', '#10b981', '#94a3b8'][i])
              : '#e2e8f0';
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : undefined }}>
                <div style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: isCurrent ? 700 : 500,
                  background: isCurrent ? stepColor : 'transparent',
                  color: isCurrent ? '#fff' : (isActive ? stepColor : '#c0c0c0'),
                  border: isCurrent ? 'none' : `1.5px solid ${isActive ? stepColor : '#e2e8f0'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {step}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    background: i < currentIdx ? stepColor : '#e2e8f0',
                    margin: '0 6px',
                    minWidth: 20,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* 操作按钮 */}
        {canChangeStatus() && (STATUS_ACTIONS[req.status] || []).length > 0 && (
          <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {(STATUS_ACTIONS[req.status] || []).map((action, i) => (
              <Button
                key={action.target}
                type={i === 0 ? 'primary' : 'default'}
                icon={<action.icon />}
                danger={action.danger}
                onClick={() => handleStatusChange(action.target)}
                style={i === 0 && !action.danger ? { background: action.color, borderColor: action.color } : undefined}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <Divider style={{ margin: '16px 0' }} />

        <Descriptions column={2} size="small">
          <Descriptions.Item label="提需人">{req.requester}</Descriptions.Item>
          <Descriptions.Item label="部门">{req.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(req.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{dayjs(req.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {req.start_date && <Descriptions.Item label="开始日期">{req.start_date}</Descriptions.Item>}
          {req.end_date && <Descriptions.Item label="截止日期">{req.end_date}</Descriptions.Item>}
          {creatorProfile && (
            <Descriptions.Item label="创建账号">
              <Tooltip title={creatorProfile.email}>
                <span><UserOutlined style={{ marginRight: 4 }} />{creatorProfile.name}</span>
              </Tooltip>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* 协作者 & 指派设计师 */}
      <div className="section-card no-print">
        <div className="section-title">制作人与协作</div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6, color: '#595959' }}>制作人</div>
            {isCreatorOrAdmin() ? (
              <Select
                value={req.assignee_id || undefined}
                onChange={v => handleAssigneeChange(v || null)}
                placeholder="选择制作人"
                allowClear
                style={{ width: '100%' }}
                options={allProfiles
                  .filter(p => p.id !== req.creator_id)
                  .map(p => ({ label: `${p.name}（${p.email}）`, value: p.id }))}
              />
            ) : (
              <span style={{ color: '#64748b' }}>
                {req.assignee_id
                  ? allProfiles.find(p => p.id === req.assignee_id)?.name || '已指定'
                  : '未指定'}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 6, color: '#595959' }}>协作人</div>
            {isCreatorOrAdmin() ? (
              <Select
                mode="multiple"
                value={req.collaborator_ids || []}
                onChange={handleCollaboratorsChange}
                placeholder="选择可以编辑此需求的同事"
                style={{ width: '100%' }}
                options={allProfiles
                  .filter(p => p.id !== req.creator_id)
                  .map(p => ({ label: `${p.name}（${p.email}）`, value: p.id }))}
              />
            ) : (
              <span style={{ color: '#64748b' }}>
                {req.collaborator_ids && req.collaborator_ids.length > 0
                  ? req.collaborator_ids.map(cid => allProfiles.find(p => p.id === cid)?.name || cid).join('、')
                  : '无'}
              </span>
            )}
          </div>
        </div>
      </div>

      {(req.background || req.objective) && (
        <div className="section-card">
          <div className="section-title">需求背景 & 目标</div>
          {req.background && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 6, color: '#595959' }}>背景</div>
              <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#1d2129' }}>{req.background}</div>
            </div>
          )}
          {req.objective && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 6, color: '#595959' }}>目标</div>
              <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#1d2129' }}>{req.objective}</div>
            </div>
          )}
        </div>
      )}

      {req.materials && req.materials.length > 0 && (
        <div className="section-card">
          <div className="section-title">需求物料 & 文案（共 {req.materials.length} 项）</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {req.materials.map((mat, idx) => {
              const types = Array.isArray(mat.type) ? mat.type : (mat.type ? [mat.type] : []);
              const sizes = Array.isArray(mat.size) ? mat.size : (mat.size ? String(mat.size).split(',').map(s => s.trim()) : []);
              const hasCopy = mat.main_title || mat.sub_title || mat.body_text || mat.free_text;
              return (
                <div key={mat.id || idx} style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{idx + 1}</span>
                      {types.map(t => (
                        <Tag key={t} color="blue" style={{ borderRadius: 6, margin: 0 }}>{t}</Tag>
                      ))}
                    </div>
                    <div style={{
                      background: '#4f46e5',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '2px 14px',
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      x{mat.quantity}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, color: '#64748b', fontSize: 13 }}>
                    {sizes.length > 0 && (
                      <div>
                        <span style={{ color: '#94a3b8' }}>尺寸 </span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{sizes.join(' / ')}</span>
                      </div>
                    )}
                    {mat.notes && (
                      <div>
                        <span style={{ color: '#94a3b8' }}>备注 </span>
                        <span style={{ color: '#0f172a' }}>{mat.notes}</span>
                      </div>
                    )}
                  </div>
                  {hasCopy && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>文案内容</div>
                      {(mat.copy_mode || 'template') === 'template' ? (
                        <div>
                          {mat.main_title && <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{mat.main_title}</div>}
                          {mat.sub_title && <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>{mat.sub_title}</div>}
                          {mat.body_text && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{mat.body_text}</div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{mat.free_text}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(req.main_title || req.sub_title || req.body_text || req.free_text) && (
        <div className="section-card">
          <div className="section-title">需求文案</div>
          {req.copywriting_mode === 'template' ? (
            <div>
              {req.main_title && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 500, color: '#595959', marginBottom: 4 }}>主标题</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{req.main_title}</div>
                </div>
              )}
              {req.sub_title && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 500, color: '#595959', marginBottom: 4 }}>副标题</div>
                  <div style={{ fontSize: 15 }}>{req.sub_title}</div>
                </div>
              )}
              {req.body_text && (
                <div>
                  <div style={{ fontWeight: 500, color: '#595959', marginBottom: 4 }}>正文</div>
                  <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{req.body_text}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{req.free_text}</div>
          )}
        </div>
      )}

      {(req.design_notes || (req.reference_images && req.reference_images.length > 0) || (req.reference_links && req.reference_links.length > 0)) && (
        <div className="section-card">
          <div className="section-title">设计要求 & 参考素材</div>

          {req.design_notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, color: '#595959', marginBottom: 4 }}>设计要求</div>
              <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{req.design_notes}</div>
            </div>
          )}

          {req.reference_images && req.reference_images.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, color: '#595959', marginBottom: 8 }}>参考图片</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Image.PreviewGroup>
                  {req.reference_images.map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      width={120}
                      height={120}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                  ))}
                </Image.PreviewGroup>
              </div>
            </div>
          )}

          {req.reference_links && req.reference_links.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, color: '#595959', marginBottom: 8 }}>参考链接</div>
              {req.reference_links.map((link, idx) => (
                <div key={link.id || idx} style={{ marginBottom: 4 }}>
                  <LinkOutlined style={{ marginRight: 6 }} />
                  <a href={link.url} target="_blank" rel="noopener noreferrer">{link.description || link.url}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {req.extra_notes && (
        <div className="section-card">
          <div className="section-title">补充说明</div>
          <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{req.extra_notes}</div>
        </div>
      )}

      {/* 修改记录 */}
      {logs.length > 0 && (
        <div className="section-card no-print">
          <div className="section-title"><HistoryOutlined style={{ marginRight: 8 }} />修改记录</div>
          <Timeline
            items={logs.map(log => ({
              children: (
                <div>
                  <span style={{ fontWeight: 500 }}>{log.user_name || '未知用户'}</span>
                  <span style={{ color: '#64748b', margin: '0 6px' }}>{log.action}</span>
                  {log.changes && <span style={{ color: '#94a3b8' }}>{log.changes}</span>}
                  <div style={{ fontSize: 12, color: '#c0c0c0', marginTop: 2 }}>
                    {dayjs(log.created_at).format('MM-DD HH:mm')}
                  </div>
                </div>
              ),
            }))}
          />
        </div>
      )}

      <div className="share-card no-print">
        <ShareAltOutlined style={{ fontSize: 28, color: '#4f46e5', marginBottom: 10 }} />
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#0f172a' }}>分享给设计团队</div>
        <div style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
          复制下方链接发送到企业微信即可
        </div>
        <div
          style={{
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#595959', fontSize: 13 }}>
            {window.location.href}
          </span>
          <Button type="primary" size="small" icon={<CopyOutlined />} onClick={handleCopyLink}>
            复制
          </Button>
        </div>
      </div>
    </div>
  );
}
