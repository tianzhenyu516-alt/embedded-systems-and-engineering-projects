/**
 * 预约记录管理组件
 * 分类展示进行中、已完成、已取消的预约记录，支持取消和改签操作
 */

import { useState, useEffect } from 'react';
import { EmptyState, ErrorState, LoadingState } from './feedback-state.js';
import { splitDateTime } from '../utils/date-utils.js';
import {
    getAppointments,
    cancelAppointment,
    rescheduleAppointment,
} from '../services/appointment-service';

const PENDING_APPOINTMENT_STATUSES = new Set(['pending', 'confirmed']);

const AppointmentRecords = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // pending, completed, cancelled
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [rescheduleData, setRescheduleData] = useState({
        date: '',
        time: '',
    });

    // 获取预约记录
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                const data = await getAppointments();
                setAppointments(data);
            } catch (err) {
                setError('获取预约记录失败');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    // 取消预约
    const handleCancelAppointment = async appointmentId => {
        if (window.confirm('确定要取消这个预约吗？')) {
            try {
                setLoading(true);
                await cancelAppointment(appointmentId);
                // 重新获取预约记录
                const data = await getAppointments();
                setAppointments(data);
            } catch (err) {
                setError(err.message || '取消预约失败');
            } finally {
                setLoading(false);
            }
        }
    };

    // 打开改签模态框
    const handleOpenRescheduleModal = appointment => {
        setSelectedAppointment(appointment);
        const { date, time } = splitDateTime(appointment.appointmentTime);
        setRescheduleData({ date, time });
        setShowRescheduleModal(true);
    };

    // 提交改签
    const handleSubmitReschedule = async () => {
        if (!selectedAppointment || !rescheduleData.date || !rescheduleData.time) return;

        try {
            setLoading(true);
            await rescheduleAppointment(selectedAppointment.id, {
                appointmentTime: `${rescheduleData.date} ${rescheduleData.time}`,
            });
            // 重新获取预约记录
            const data = await getAppointments();
            setAppointments(data);
            setShowRescheduleModal(false);
        } catch (err) {
            setError(err.message || '改签预约失败');
        } finally {
            setLoading(false);
        }
    };

    // 过滤预约记录
    const filteredAppointments = appointments.filter(app => {
        if (activeTab === 'pending') {
            return PENDING_APPOINTMENT_STATUSES.has(app.status);
        }
        return app.status === activeTab;
    });

    // 获取状态文本
    const getStatusText = status => {
        const statusMap = {
            pending: '待确认',
            confirmed: '已确认',
            completed: '已完成',
            cancelled: '已取消',
        };
        return statusMap[status] || status;
    };

    // 获取状态类名
    const getStatusClass = status => {
        return `appointment-records__item-status appointment-records__item-status--${status}`;
    };

    if (loading) {
        return <LoadingState className="appointment-records__loading" />;
    }

    if (error) {
        return <ErrorState className="appointment-records__error" text={error} />;
    }

    return (
        <div className="appointment-records">
            {/* 标签页 */}
            <div className="appointment-records__tabs">
                <button
                    className={`appointment-records__tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    进行中
                </button>
                <button
                    className={`appointment-records__tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    已完成
                </button>
                <button
                    className={`appointment-records__tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                >
                    已取消
                </button>
            </div>

            {/* 预约记录列表 */}
            <div className="appointment-records__list">
                {filteredAppointments.length === 0 ? (
                    <EmptyState className="appointment-records__empty" text="暂无预约记录" />
                ) : (
                    filteredAppointments.map(appointment => (
                        <div key={appointment.id} className="appointment-records__item">
                            <div className="appointment-records__item-header">
                                <h3>{appointment.hospitalName}</h3>
                                <span className={getStatusClass(appointment.status)}>
                                    {getStatusText(appointment.status)}
                                </span>
                            </div>

                            <div className="appointment-records__item-info">
                                <p>
                                    <strong>科室:</strong> {appointment.department}
                                </p>
                                <p>
                                    <strong>医生:</strong> {appointment.doctor}
                                </p>
                                <p>
                                    <strong>预约时间:</strong> {appointment.appointmentTime}
                                </p>
                                <p>
                                    <strong>就诊人:</strong> {appointment.patientName}
                                </p>
                                <p>
                                    <strong>联系方式:</strong> {appointment.patientPhone}
                                </p>
                                {appointment.symptoms && (
                                    <p>
                                        <strong>症状:</strong> {appointment.symptoms}
                                    </p>
                                )}
                            </div>

                            <div className="appointment-records__item-actions">
                                {PENDING_APPOINTMENT_STATUSES.has(appointment.status) && (
                                    <>
                                        <button
                                            className="appointment-records__btn appointment-records__btn--reschedule"
                                            onClick={() => handleOpenRescheduleModal(appointment)}
                                        >
                                            改签
                                        </button>
                                        <button
                                            className="appointment-records__btn appointment-records__btn--cancel"
                                            onClick={() => handleCancelAppointment(appointment.id)}
                                        >
                                            取消
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 改签模态框 */}
            {showRescheduleModal && selectedAppointment && (
                <div className="appointment-records__reschedule-modal">
                    <div className="appointment-records__reschedule-content">
                        <div className="appointment-records__reschedule-header">
                            <h3>改签预约</h3>
                            <button onClick={() => setShowRescheduleModal(false)}>关闭</button>
                        </div>

                        <div className="appointment-records__reschedule-form">
                            <div className="appointment-records__reschedule-field">
                                <label htmlFor="reschedule-date">日期</label>
                                <input
                                    type="date"
                                    id="reschedule-date"
                                    value={rescheduleData.date}
                                    onChange={e =>
                                        setRescheduleData(prev => ({
                                            ...prev,
                                            date: e.target.value,
                                        }))
                                    }
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="appointment-records__reschedule-field">
                                <label htmlFor="reschedule-time">时间</label>
                                <input
                                    type="time"
                                    id="reschedule-time"
                                    value={rescheduleData.time}
                                    onChange={e =>
                                        setRescheduleData(prev => ({
                                            ...prev,
                                            time: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="appointment-records__reschedule-actions">
                                <button onClick={() => setShowRescheduleModal(false)}>取消</button>
                                <button onClick={handleSubmitReschedule} disabled={loading}>
                                    {loading ? '提交中...' : '确认改签'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentRecords;
