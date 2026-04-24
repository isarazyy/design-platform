import { useState, useEffect, useCallback } from 'react';
import { Badge, Popover, Button, List, Empty, Tag } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../lib/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount, type Notification } from '../lib/notifications';

const TYPE_TAG: Record<Notification['type'], { color: string; label: string }> = {
  assigned: { color: 'blue', label: '指派' },
  status_change: { color: 'orange', label: '状态' },
  deadline_soon: { color: 'red', label: '截止' },
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setUnread(0);
      return;
    }
    const n = await getUnreadCount(userId);
    setUnread(n);
  }, [userId]);

  const loadList = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getNotifications(userId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setInterval(() => {
      void refreshUnread();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [userId, refreshUnread]);

  useEffect(() => {
    if (open && userId) {
      void loadList();
    }
  }, [open, userId, loadList]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const handleClickItem = async (n: Notification) => {
    await markAsRead(n.id);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await refreshUnread();
    setOpen(false);
    navigate(`/req/${n.requirement_id}`);
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await refreshUnread();
  };

  const content = (
    <div style={{ width: 320, maxHeight: 400 }}>
      <List
        loading={loading}
        dataSource={items}
        locale={{ emptyText: <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={(n) => (
          <List.Item
            style={{ cursor: 'pointer', opacity: n.read ? 0.65 : 1, paddingLeft: 0, paddingRight: 0 }}
            onClick={() => void handleClickItem(n)}
          >
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: 4 }}>
                <Tag color={TYPE_TAG[n.type].color}>{TYPE_TAG[n.type].label}</Tag>
                <span style={{ fontWeight: 600 }}>{n.title}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 4 }}>{n.message}</div>
              <div style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>{dayjs(n.created_at).format('YYYY-MM-DD HH:mm')}</div>
            </div>
          </List.Item>
        )}
      />
      {items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--ant-color-border-secondary)', paddingTop: 8, textAlign: 'right' }}>
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => void handleMarkAllRead()}>
            全部已读
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="通知"
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
    >
      <Badge count={unread} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} aria-label="通知" />
      </Badge>
    </Popover>
  );
}
