/**
 * 通知钩子
 * 处理浏览器通知权限和发送通知
 */

import { useState, useEffect } from 'react';

export const formatAppointmentReminderTime = appointmentTime => {
    if (!appointmentTime) {
        return '';
    }

    const normalized = String(appointmentTime).trim();
    const timeSegment = normalized.match(/(?:T|\s)(\d{2}:\d{2})/);
    if (timeSegment?.[1]) {
        return timeSegment[1];
    }

    const parsedDate = new Date(normalized);
    if (!Number.isNaN(parsedDate.getTime())) {
        return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
    }

    return normalized;
};

/**
 * 通知钩子
 * @returns {Object} 通知相关方法和状态
 */
export const useNotification = () => {
    const [permission, setPermission] = useState('default');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // 初始化检查通知权限
    useEffect(() => {
        checkPermission();
    }, []);

    // 检查通知权限
    const checkPermission = () => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    };

    // 请求通知权限
    const requestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPermission(permission);
            return permission;
        }
        return 'unsupported';
    };

    // 发送通知
    const sendNotification = (title, options = {}) => {
        if ('Notification' in window && permission === 'granted') {
            new Notification(title, options);
            return true;
        } else if (permission === 'default') {
            requestPermission().then(perm => {
                if (perm === 'granted') {
                    new Notification(title, options);
                }
            });
        }
        return false;
    };

    // 添加应用内通知
    const addNotification = notification => {
        const newNotification = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification,
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // 发送浏览器通知
        sendNotification(notification.title, {
            body: notification.message,
            icon: notification.icon,
        });
    };

    // 标记通知为已读
    const markAsRead = notificationId => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === notificationId ? { ...notification, read: true } : notification,
            ),
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // 标记所有通知为已读
    const markAllAsRead = () => {
        setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
        setUnreadCount(0);
    };

    // 删除通知
    const deleteNotification = notificationId => {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
    };

    // 模拟预约提醒
    const scheduleAppointmentReminder = appointment => {
        const appointmentTime = new Date(appointment.appointmentTime);
        const now = new Date();
        const timeDiff = appointmentTime - now;
        const appointmentDisplayTime = formatAppointmentReminderTime(appointment.appointmentTime);

        // 提前24小时提醒
        if (timeDiff > 24 * 60 * 60 * 1000) {
            setTimeout(
                () => {
                    addNotification({
                        title: '预约提醒',
                        message: `您明天 ${appointmentDisplayTime} 在 ${appointment.hospitalName} ${appointment.department} 有预约`,
                        type: 'appointment',
                        appointmentId: appointment.id,
                    });
                },
                timeDiff - 24 * 60 * 60 * 1000,
            );
        }

        // 提前2小时提醒
        if (timeDiff > 2 * 60 * 60 * 1000) {
            setTimeout(
                () => {
                    addNotification({
                        title: '预约提醒',
                        message: `您今天 ${appointmentDisplayTime} 在 ${appointment.hospitalName} ${appointment.department} 有预约`,
                        type: 'appointment',
                        appointmentId: appointment.id,
                    });
                },
                timeDiff - 2 * 60 * 60 * 1000,
            );
        }
    };

    return {
        permission,
        notifications,
        unreadCount,
        requestPermission,
        sendNotification,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        scheduleAppointmentReminder,
    };
};
