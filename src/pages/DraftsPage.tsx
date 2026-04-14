import { useState, useEffect } from 'react';
import { Button, Empty, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getAllDrafts, clearDraft, type DraftItem } from '../lib/storage';

const TYPE_COLORS: Record<string, string> = {
  '视觉设计': '#3b82f6',
  '美术': '#8b5cf6',
  '动画': '#f59e0b',
};

export default function DraftsPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  useEffect(() => {
    setDrafts(getAllDrafts());
  }, []);

  const handleDelete = (id: string) => {
    clearDraft(id);
    setDrafts(getAllDrafts());
    message.success('草稿已删除');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>草稿箱</h2>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            {drafts.length > 0 ? `${drafts.length} 个草稿` : '没有草稿'}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/create')}
          style={{ borderRadius: 10, height: 38, fontWeight: 500, background: '#4f46e5' }}
        >
          新建需求
        </Button>
      </div>

      {drafts.length === 0 ? (
        <div className="empty-state">
          <Empty description="草稿箱是空的" />
          <div style={{ color: '#94a3b8', marginTop: 8 }}>创建需求时点「保存草稿」，下次可以在这里继续编辑</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {drafts.map(draft => (
            <div
              key={draft.id}
              className="req-item"
              onClick={() => navigate(`/create?draft=${draft.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                      {draft.title || '未命名草稿'}
                    </span>
                    {draft.data.type && (
                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: (TYPE_COLORS[draft.data.type] || '#94a3b8') + '18',
                        color: TYPE_COLORS[draft.data.type] || '#94a3b8',
                        fontWeight: 500,
                      }}>
                        {draft.data.type}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 13 }}>
                    {draft.data.requester && <span>{draft.data.requester}</span>}
                    {draft.data.department && <span>{draft.data.department}</span>}
                    <span>保存于 {dayjs(draft.updated_at).format('MM-DD HH:mm')}</span>
                  </div>
                  {draft.data.background && (
                    <div style={{ color: '#64748b', marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                      {draft.data.background.length > 80 ? draft.data.background.substring(0, 80) + '...' : draft.data.background}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/create?draft=${draft.id}`); }}
                    style={{ color: '#4f46e5' }}
                  />
                  <Popconfirm
                    title="确定删除这个草稿？"
                    onConfirm={(e) => { e?.stopPropagation(); handleDelete(draft.id); }}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
