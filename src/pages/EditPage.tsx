import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Input, Select, Button, DatePicker, message, Radio, Divider, Upload, InputNumber, Spin, Empty,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined,
  InboxOutlined, LinkOutlined, HomeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Material, ReferenceLink, RequirementFormData, RequirementType, Priority, VersionNode } from '../types';
import { getRequirementById, updateRequirement, uploadImage } from '../lib/storage';
import { useAuth } from '../lib/AuthContext';
import { addEditLog } from '../lib/editLog';

const { TextArea } = Input;

const REQ_TYPES: RequirementType[] = ['视觉设计', '美术', '动画'];
const PRIORITIES: { value: Priority; color: string }[] = [
  { value: '紧急', color: '#ff4d4f' },
  { value: '高', color: '#fa8c16' },
  { value: '中', color: '#1677ff' },
  { value: '低', color: '#52c41a' },
];

const MATERIAL_TYPES = ['长图', 'H5', '海报', 'Banner', '插画', 'icon', '视频', '动画', '包装', '礼品', '绘本', '其他'];
const SIZE_OPTIONS = ['1080x1920', '750x1334', '1920x1080', '800x800', '640x960', 'A4', 'A3'];

function generateMaterialId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

function generateLinkId() {
  return 'l_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [form, setForm] = useState<RequirementFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (id && !loadedRef.current) {
      loadedRef.current = true;
      loadData(id);
    }
  }, [id]);

  const [noPermission, setNoPermission] = useState(false);

  const loadData = async (reqId: string) => {
    setLoading(true);
    try {
      const req = await getRequirementById(reqId);
      if (req) {
        const canEdit =
          profile?.role === 'admin' ||
          req.creator_id === user?.id ||
          (req.collaborator_ids && req.collaborator_ids.includes(user?.id || ''));
        if (!canEdit) {
          setNoPermission(true);
          setLoading(false);
          return;
        }
        setForm({
          title: req.title,
          requester: req.requester,
          department: req.department,
          type: req.type,
          background: req.background,
          objective: req.objective,
          start_date: req.start_date,
          end_date: req.end_date,
          priority: req.priority,
          versions: (req.versions || []).map((v: any) =>
            typeof v === 'string' ? { id: 'v_' + Math.random().toString(36).slice(2, 8), name: v, date: null, note: '' } : v
          ),
          materials: req.materials || [],
          copywriting_mode: req.copywriting_mode,
          main_title: req.main_title,
          sub_title: req.sub_title,
          body_text: req.body_text,
          free_text: req.free_text,
          style_tags: req.style_tags || [],
          design_notes: req.design_notes,
          reference_links: req.reference_links || [],
          reference_images: req.reference_images || [],
          extra_notes: req.extra_notes,
        });
      }
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const update = useCallback(<K extends keyof RequirementFormData>(key: K, value: RequirementFormData[K]) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const addMaterial = () => {
    if (!form) return;
    update('materials', [
      ...form.materials,
      { id: generateMaterialId(), type: '', quantity: 1, size: '', notes: '', copy_mode: 'template' as const, main_title: '', sub_title: '', body_text: '', free_text: '' },
    ]);
  };

  const updateMaterial = (mid: string, field: keyof Material, value: string | number) => {
    if (!form) return;
    update('materials', form.materials.map(m => m.id === mid ? { ...m, [field]: value } : m));
  };

  const removeMaterial = (mid: string) => {
    if (!form) return;
    update('materials', form.materials.filter(m => m.id !== mid));
  };

  const addReferenceLink = () => {
    if (!form) return;
    update('reference_links', [
      ...form.reference_links,
      { id: generateLinkId(), url: '', description: '' },
    ]);
  };

  const updateReferenceLink = (lid: string, field: keyof ReferenceLink, value: string) => {
    if (!form) return;
    update('reference_links', form.reference_links.map(l => l.id === lid ? { ...l, [field]: value } : l));
  };

  const removeReferenceLink = (lid: string) => {
    if (!form) return;
    update('reference_links', form.reference_links.filter(l => l.id !== lid));
  };

  const handleImageUpload = async (file: File) => {
    if (!form) return false;
    try {
      const url = await uploadImage(file);
      update('reference_images', [...form.reference_images, url]);
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  const removeImage = (index: number) => {
    if (!form) return;
    update('reference_images', form.reference_images.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = '请填写需求标题';
    if (!form.requester.trim()) errs.requester = '请填写提需人';
    if (!form.type) errs.type = '请选择需求类型';
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`field-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      message.error('请填写必填项');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!form || !id || !validate()) return;
    setSubmitting(true);
    try {
      await updateRequirement(id, form);
      if (user) {
        await addEditLog(id, user.id, profile?.name || '', '编辑需求', '修改了需求内容');
      }
      message.success('修改已保存');
      navigate(`/req/${id}`);
    } catch (err) {
      message.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (noPermission) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="你没有编辑此需求的权限" />
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/req/${id}`)} style={{ marginTop: 16 }}>
          返回详情
        </Button>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="需求不存在" />
        <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/req/${id}`)}>返回详情</Button>
      </div>

      {/* 基本信息 */}
      <div className="section-card">
        <div className="section-title">基本信息</div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div id="field-title">
            <label style={{ fontWeight: 500 }}><span style={{ color: '#ff4d4f' }}>* </span>需求标题</label>
            <Input
              placeholder="例如：618大促活动视觉设计"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              status={errors.title ? 'error' : undefined}
              size="large"
              style={{ marginTop: 6 }}
              maxLength={100}
              showCount
            />
            {errors.title && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{errors.title}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div id="field-requester">
              <label style={{ fontWeight: 500 }}><span style={{ color: '#ff4d4f' }}>* </span>提需人</label>
              <Input
                placeholder="你的名字"
                value={form.requester}
                onChange={e => update('requester', e.target.value)}
                status={errors.requester ? 'error' : undefined}
                style={{ marginTop: 6 }}
              />
              {errors.requester && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{errors.requester}</div>}
            </div>
            <div>
              <label style={{ fontWeight: 500 }}>所属部门/项目</label>
              <Input
                placeholder="粘贴企业微信中的部门路径"
                value={form.department}
                onChange={e => update('department', e.target.value)}
                style={{ marginTop: 6 }}
              />
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                企业微信 → 点击头像 → 复制「部门」字段
              </div>
            </div>
          </div>
          <div id="field-type">
            <label style={{ fontWeight: 500 }}><span style={{ color: '#ff4d4f' }}>* </span>需求类型</label>
            <div style={{ marginTop: 6 }}>
              <Select
                value={form.type}
                onChange={v => update('type', v)}
                options={REQ_TYPES.map(t => ({ label: t, value: t }))}
                style={{ width: '100%' }}
                status={errors.type ? 'error' : undefined}
              />
            </div>
            {errors.type && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{errors.type}</div>}
          </div>
        </div>
      </div>

      {/* 期望交付日期 & 优先级 */}
      <div className="section-card">
        <div className="section-title">期望交付日期 & 优先级</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontWeight: 500 }}>开始日期</label>
            <DatePicker
              value={form.start_date ? dayjs(form.start_date) : null}
              onChange={(d) => {
                const v = d ? d.format('YYYY-MM-DD') : null;
                update('start_date', v);
                if (v && form.end_date && dayjs(form.end_date).isBefore(dayjs(v))) {
                  update('end_date', null);
                }
              }}
              disabledDate={(d) => form.end_date ? d.isAfter(dayjs(form.end_date), 'day') : false}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="选择开始日期"
            />
          </div>
          <div>
            <label style={{ fontWeight: 500 }}>截止日期</label>
            <DatePicker
              value={form.end_date ? dayjs(form.end_date) : null}
              onChange={(d) => update('end_date', d ? d.format('YYYY-MM-DD') : null)}
              disabledDate={(d) => form.start_date ? d.isBefore(dayjs(form.start_date), 'day') : false}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="选择截止日期"
            />
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 500 }}>优先级</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {PRIORITIES.map(p => (
              <Button
                key={p.value}
                type={form.priority === p.value ? 'primary' : 'default'}
                className="priority-btn"
                style={form.priority === p.value ? { background: p.color, borderColor: p.color } : { color: p.color, borderColor: p.color }}
                onClick={() => update('priority', form.priority === p.value ? null : p.value)}
              >
                {p.value}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 500 }}>版本提交节点</label>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 10 }}>每个版本设定一个提交日期，方便跟踪进度</div>
          {(form.versions || []).map((ver, idx) => (
            <div key={ver.id} style={{
              display: 'grid',
              gridTemplateColumns: '50px 160px 1fr auto',
              gap: 10,
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{ fontWeight: 600, color: '#4f46e5', fontSize: 14 }}>V{idx + 1}</span>
              <DatePicker
                value={ver.date ? dayjs(ver.date) : null}
                onChange={d => {
                  const vs = [...form.versions];
                  vs[idx] = { ...vs[idx], date: d ? d.format('YYYY-MM-DD') : null };
                  update('versions', vs);
                }}
                disabledDate={d => {
                  if (form.start_date && d.isBefore(dayjs(form.start_date), 'day')) return true;
                  if (form.end_date && d.isAfter(dayjs(form.end_date), 'day')) return true;
                  return false;
                }}
                placeholder="提交日期"
                size="small"
                style={{ width: '100%' }}
              />
              <Input
                value={ver.note}
                onChange={e => {
                  const vs = [...form.versions];
                  vs[idx] = { ...vs[idx], note: e.target.value };
                  update('versions', vs);
                }}
                placeholder="备注说明（选填）"
                size="small"
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => update('versions', form.versions.filter((_, i) => i !== idx))}
              />
            </div>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              const newVer: VersionNode = { id: 'v_' + Date.now().toString(36), name: '', date: null, note: '' };
              update('versions', [...(form.versions || []), newVer]);
            }}
            style={{ marginTop: 4 }}
          >
            添加版本
          </Button>
        </div>
      </div>

      {/* 需求背景 & 目标 */}
      <div className="section-card">
        <div className="section-title">需求背景 & 目标</div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontWeight: 500 }}>需求背景</label>
            <TextArea
              placeholder="描述一下这个需求的背景，为什么要做这个..."
              value={form.background}
              onChange={e => update('background', e.target.value)}
              autoSize={{ minRows: 3, maxRows: 8 }}
              maxLength={2000}
              showCount
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 500 }}>需求目标</label>
            <TextArea
              placeholder="希望通过这次设计达成什么目标..."
              value={form.objective}
              onChange={e => update('objective', e.target.value)}
              autoSize={{ minRows: 3, maxRows: 8 }}
              maxLength={2000}
              showCount
              style={{ marginTop: 6 }}
            />
          </div>
        </div>
      </div>

      {/* 需求物料 & 文案 */}
      <div className="section-card">
        <div className="section-title">需求物料 & 文案</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>每个物料独立填写文案，方便制作人一一对应</div>

        {form.materials.map((mat, idx) => (
          <div key={mat.id} style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 12,
            background: '#fafbfc',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>物料 {idx + 1}</span>
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMaterial(mat.id)} size="small" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>物料类型</div>
                <Select
                  value={Array.isArray(mat.type) ? (mat.type[0] || undefined) : (mat.type || undefined)}
                  onChange={v => updateMaterial(mat.id, 'type', v)}
                  options={MATERIAL_TYPES.map(t => ({ label: t, value: t }))}
                  placeholder="选择类型"
                  style={{ width: '100%' }}
                  allowClear
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>尺寸/规格</div>
                <Select
                  value={mat.size || undefined}
                  onChange={v => updateMaterial(mat.id, 'size', v || '')}
                  options={SIZE_OPTIONS.map(s => ({ label: s, value: s }))}
                  placeholder="选择或输入尺寸"
                  style={{ width: '100%' }}
                  allowClear
                  mode="tags"
                  maxCount={1}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>数量</div>
                <InputNumber
                  value={mat.quantity}
                  onChange={v => updateMaterial(mat.id, 'quantity', v || 1)}
                  min={1}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} dashed />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 500 }}>文案内容</span>
                <Radio.Group
                  value={mat.copy_mode || 'template'}
                  onChange={e => updateMaterial(mat.id, 'copy_mode', e.target.value)}
                  size="small"
                >
                  <Radio.Button value="template">模版</Radio.Button>
                  <Radio.Button value="free">自由文本</Radio.Button>
                </Radio.Group>
              </div>

              {(mat.copy_mode || 'template') === 'template' ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <Input
                    value={mat.main_title || ''}
                    onChange={e => updateMaterial(mat.id, 'main_title', e.target.value)}
                    placeholder="主标题"
                    size="small"
                  />
                  <Input
                    value={mat.sub_title || ''}
                    onChange={e => updateMaterial(mat.id, 'sub_title', e.target.value)}
                    placeholder="副标题（选填）"
                    size="small"
                  />
                  <TextArea
                    value={mat.body_text || ''}
                    onChange={e => updateMaterial(mat.id, 'body_text', e.target.value)}
                    placeholder="正文内容（选填）"
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    size="small"
                  />
                </div>
              ) : (
                <TextArea
                  value={mat.free_text || ''}
                  onChange={e => updateMaterial(mat.id, 'free_text', e.target.value)}
                  placeholder="自由输入文案内容..."
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  size="small"
                />
              )}
            </div>
          </div>
        ))}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addMaterial} block style={{ height: 44 }}>
          添加物料
        </Button>
      </div>

      {/* 设计要求 & 参考素材 */}
      <div className="section-card">
        <div className="section-title">设计要求 & 参考素材</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 500 }}>设计要求说明</label>
          <TextArea value={form.design_notes} onChange={e => update('design_notes', e.target.value)} placeholder="对设计有什么具体要求，如配色、字体、排版风格等..." autoSize={{ minRows: 3, maxRows: 6 }} maxLength={2000} showCount style={{ marginTop: 6 }} />
        </div>
        <Divider style={{ margin: '16px 0' }}>参考素材</Divider>
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger multiple showUploadList={false} beforeUpload={(file) => { handleImageUpload(file); return false; }} accept="image/*">
            <p><InboxOutlined style={{ fontSize: 32, color: '#1677ff' }} /></p>
            <p style={{ color: '#595959' }}>点击或拖拽上传参考图片</p>
          </Upload.Dragger>
          {form.reference_images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {form.reference_images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                  <Button type="primary" danger size="small" icon={<DeleteOutlined />} onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, padding: 0, fontSize: 10 }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontWeight: 500 }}>参考链接</label>
          {form.reference_links.map((link) => (
            <div key={link.id} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <Input prefix={<LinkOutlined />} value={link.url} onChange={e => updateReferenceLink(link.id, 'url', e.target.value)} placeholder="https://..." style={{ flex: 2 }} />
              <Input value={link.description} onChange={e => updateReferenceLink(link.id, 'description', e.target.value)} placeholder="链接说明" style={{ flex: 1 }} />
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeReferenceLink(link.id)} />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={addReferenceLink} size="small" style={{ marginTop: 8 }}>添加参考链接</Button>
        </div>
      </div>

      {/* 补充说明 */}
      <div className="section-card">
        <div className="section-title">补充说明</div>
        <TextArea value={form.extra_notes} onChange={e => update('extra_notes', e.target.value)} placeholder="还有什么需要补充的..." autoSize={{ minRows: 3, maxRows: 8 }} maxLength={2000} showCount />
      </div>

      {/* 底部操作栏 */}
      <div className="bottom-bar no-print">
        <Button onClick={() => navigate(`/req/${id}`)}>取消</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={submitting} size="large">
          保存修改
        </Button>
      </div>
    </div>
  );
}
