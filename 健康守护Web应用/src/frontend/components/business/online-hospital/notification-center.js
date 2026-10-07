/**
 * 通知中心组件
 * 展示应用内通知，支持标记已读和删除操作
 */

import { useNotification } from '../hooks/useNotification.js';
import { EmptyState } from './feedback-state.js';

const formatNotificationTimestamp = timestamp => {
    const parsedDate = new Date(timestamp);
    return Number.isNaN(parsedDate.getTime()) ? String(timestamp || '') : parsedDate.toLocaleString();
};

const NotificationCenter = ({ visible, onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
        useNotification();

    if (!visible) return null;

    return (
        <div className="notification-center">
            <div className="notification-center__content">
                <div className="notification-center__header">
                    <h3>消息中心</h3>
                    {unreadCount > 0 && (
                        <span className="notification-center__unread-count">{unreadCount}</span>
                    )}
                    <button className="notification-center__close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {notifications.length === 0 ? (
                    <EmptyState className="notification-center__empty" text="暂无通知" />
                ) : (
                    <>
                        {unreadCount > 0 && (
                            <div className="notification-center__actions">
                                <button onClick={markAllAsRead}>标记所有为已读</button>
                            </div>
                        )}

                        <div className="notification-center__list">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-center__item ${notification.read ? 'read' : 'unread'}`}
                                >
                                    <div className="notification-center__item-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.message}</p>
                                        <span className="notification-center__item-time">
                                            {formatNotificationTimestamp(notification.timestamp)}
                                        </span>
                                    </div>
                                    <div className="notification-center__item-actions">
                                        {!notification.read && (
                                            <button
                                                className="notification-center__item-action notification-center__item-action--read"
                                                onClick={() => markAsRead(notification.id)}
                                            >
                                                标记已读
                                            </button>
                                        )}
                                        <button
                                            className="notification-center__item-action notification-center__item-action--delete"
                                            onClick={() => deleteNotification(notification.id)}
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
