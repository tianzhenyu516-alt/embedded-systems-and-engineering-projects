/**
 * 预约表单组件
 * 实现医院预约功能，包含日期选择、时间段选择和就诊人信息填写
 */

import { useState, useEffect } from 'react';
import { ErrorState, LoadingState } from './feedback-state.js';
import { createAppointment, getAvailableTimeSlots } from '../services/appointment-service.js';

const ID_CARD_PATTERN = /^(\d{15}|\d{17}[\dXx])$/;
const PHONE_PATTERN = /^1\d{10}$/;

const trimAppointmentFormData = formData => ({
    ...formData,
    department: formData.department.trim(),
    doctor: formData.doctor.trim(),
    date: formData.date.trim(),
    time: formData.time.trim(),
    patientName: formData.patientName.trim(),
    patientId: formData.patientId.trim(),
    patientPhone: formData.patientPhone.trim(),
    symptoms: formData.symptoms.trim(),
});

const validateAppointmentForm = formData => {
    if (
        !formData.department ||
        !formData.doctor ||
        !formData.date ||
        !formData.time ||
        !formData.patientName ||
        !formData.patientId ||
        !formData.patientPhone
    ) {
        return '请填写所有必填字段';
    }

    if (!ID_CARD_PATTERN.test(formData.patientId)) {
        return '请输入正确的身份证号';
    }

    if (!PHONE_PATTERN.test(formData.patientPhone)) {
        return '请输入正确的手机号';
    }

    return '';
};

const buildAppointmentPayload = formData => ({
    ...formData,
    appointmentTime: `${formData.date} ${formData.time}`,
});

const maskPatientId = patientId => {
    const normalized = String(patientId || '').trim();
    if (normalized.length < 8) {
        return normalized;
    }

    return `${normalized.slice(0, 4)}********${normalized.slice(-4)}`;
};

const maskPatientPhone = patientPhone => {
    const normalized = String(patientPhone || '').trim();
    if (normalized.length < 7) {
        return normalized;
    }

    return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
};

const getHospitalDepartments = hospital => {
    if (Array.isArray(hospital?.departments) && hospital.departments.length > 0) {
        return hospital.departments;
    }

    if (Array.isArray(hospital?.features) && hospital.features.length > 0) {
        return hospital.features;
    }

    return [];
};

const AppointmentForm = ({ hospital, onClose, onSuccess }) => {
    const hospitalDepartments = getHospitalDepartments(hospital);
    const [formData, setFormData] = useState({
        hospitalId: hospital?.id || '',
        hospitalName: hospital?.name || '',
        department: '',
        doctor: '',
        date: '',
        time: '',
        patientName: '',
        patientId: '',
        patientPhone: '',
        symptoms: '',
    });
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // 处理日期和科室变化，更新可预约时间段
    useEffect(() => {
        const fetchTimeSlots = async () => {
            if (formData.date && formData.department) {
                try {
                    setLoading(true);
                    const slots = await getAvailableTimeSlots(
                        formData.hospitalId,
                        formData.department,
                        formData.date
                    );
                    setAvailableTimeSlots(slots);
                    setFormData(prev => ({ ...prev, time: '' }));
                } catch (err) {
                    setError('获取可预约时间段失败');
                } finally {
                    setLoading(false);
                }
            } else {
                setAvailableTimeSlots([]);
                setFormData(prev => ({ ...prev, time: '' }));
            }
        };

        fetchTimeSlots();
    }, [formData.date, formData.department, formData.hospitalId]);

    // 处理表单输入变化
    const handleChange = e => {
        const { name, value } = e.target;
        setError(null);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 处理表单提交
    const handleSubmit = e => {
        e.preventDefault();

        const normalizedFormData = trimAppointmentFormData(formData);
        const validationError = validateAppointmentForm(normalizedFormData);
        if (validationError) {
            setError(validationError);
            return;
        }

        setFormData(normalizedFormData);
        setError(null);
        setShowConfirmation(true);
    };

    // 确认提交
    const handleConfirmSubmit = async () => {
        try {
            setSubmitting(true);
            setError(null);

            const appointmentData = buildAppointmentPayload(trimAppointmentFormData(formData));

            const result = await createAppointment(appointmentData);
            onSuccess(result);
            onClose();
        } catch (err) {
            setError('预约失败，请重试');
        } finally {
            setSubmitting(false);
            setShowConfirmation(false);
        }
    };

    return (
        <div className="appointment-form">
            <h2>预约就诊</h2>

            {error && <ErrorState className="appointment-form__error" text={error} />}

            <form onSubmit={handleSubmit}>
                {/* 医院信息 */}
                <div className="appointment-form__section">
                    <h3>医院信息</h3>
                    <div className="appointment-form__field">
                        <label>医院名称</label>
                        <input
                            type="text"
                            name="hospitalName"
                            value={formData.hospitalName}
                            disabled
                        />
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="department">科室 *</label>
                        <select
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            required
                        >
                            <option value="">请选择科室</option>
                            {hospitalDepartments.map((department, index) => (
                                <option key={index} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="doctor">医生 *</label>
                        <select
                            id="doctor"
                            name="doctor"
                            value={formData.doctor}
                            onChange={handleChange}
                            required
                        >
                            <option value="">请选择医生</option>
                            <option value="张医生">张医生</option>
                            <option value="李医生">李医生</option>
                            <option value="王医生">王医生</option>
                            <option value="刘医生">刘医生</option>
                        </select>
                    </div>
                </div>

                {/* 预约时间 */}
                <div className="appointment-form__section">
                    <h3>预约时间</h3>
                    <div className="appointment-form__field">
                        <label htmlFor="date">日期 *</label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="time">时间段 *</label>
                        {loading ? (
                            <LoadingState className="appointment-form__loading" />
                        ) : availableTimeSlots.length > 0 ? (
                            <select
                                id="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                required
                            >
                                <option value="">请选择时间段</option>
                                {availableTimeSlots.map((slot, index) => (
                                    <option key={index} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select disabled>
                                <option value="">请先选择日期和科室</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* 就诊人信息 */}
                <div className="appointment-form__section">
                    <h3>就诊人信息</h3>
                    <div className="appointment-form__field">
                        <label htmlFor="patientName">姓名 *</label>
                        <input
                            type="text"
                            id="patientName"
                            name="patientName"
                            value={formData.patientName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="patientId">身份证号 *</label>
                        <input
                            type="text"
                            id="patientId"
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="patientPhone">手机号 *</label>
                        <input
                            type="tel"
                            id="patientPhone"
                            name="patientPhone"
                            value={formData.patientPhone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="appointment-form__field">
                        <label htmlFor="symptoms">症状描述</label>
                        <textarea
                            id="symptoms"
                            name="symptoms"
                            value={formData.symptoms}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>
                </div>

                {/* 提交按钮 */}
                <div className="appointment-form__actions">
                    <button
                        type="button"
                        className="appointment-form__btn appointment-form__btn--cancel"
                        onClick={onClose}
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        className="appointment-form__btn appointment-form__btn--submit"
                        disabled={submitting}
                    >
                        {submitting ? '提交中...' : '提交预约'}
                    </button>
                </div>
            </form>

            {/* 确认对话框 */}
            {showConfirmation && (
                <div className="appointment-form__confirmation">
                    <div className="appointment-form__confirmation-content">
                        <h3>确认预约信息</h3>
                        <div className="appointment-form__confirmation-info">
                            <p>
                                <strong>医院:</strong> {formData.hospitalName}
                            </p>
                            <p>
                                <strong>科室:</strong> {formData.department}
                            </p>
                            <p>
                                <strong>医生:</strong> {formData.doctor}
                            </p>
                            <p>
                                <strong>时间:</strong> {formData.date} {formData.time}
                            </p>
                            <p>
                                <strong>姓名:</strong> {formData.patientName}
                            </p>
                            <p>
                                <strong>身份证号:</strong> {maskPatientId(formData.patientId)}
                            </p>
                            <p>
                                <strong>手机号:</strong> {maskPatientPhone(formData.patientPhone)}
                            </p>
                            {formData.symptoms && (
                                <p>
                                    <strong>症状:</strong> {formData.symptoms}
                                </p>
                            )}
                        </div>
                        <div className="appointment-form__confirmation-actions">
                            <button onClick={() => setShowConfirmation(false)}>取消</button>
                            <button onClick={handleConfirmSubmit} disabled={submitting}>
                                {submitting ? '确认中...' : '确认提交'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentForm;
