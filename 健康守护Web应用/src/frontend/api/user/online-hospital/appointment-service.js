/**
 * 预约服务层
 * 处理医院预约相关的API调用
 */

import { unwrapResponseData } from './service-helpers.js';
import { get, post, put } from '../../../utils/user/online-hospital/request.js';

export const createAppointment = async appointmentData => {
    try {
        const response = await post('/appointments', appointmentData);
        const payload = unwrapResponseData(response, '创建预约失败');
        return payload.appointment || payload;
    } catch (error) {
        console.error('创建预约失败:', error);
        throw error;
    }
};

export const getAppointments = async (status = '') => {
    try {
        const params = status ? { status } : {};
        const response = await get('/appointments/my', params);
        const payload = unwrapResponseData(response, '获取预约列表失败');
        return payload.list || payload.appointments || [];
    } catch (error) {
        console.error('获取预约列表失败:', error);
        throw error;
    }
};

export const cancelAppointment = async appointmentId => {
    try {
        const response = await put(`/appointments/${appointmentId}/status`, {
            status: 'cancelled'
        });
        unwrapResponseData(response, '取消预约失败');
        return true;
    } catch (error) {
        console.error('取消预约失败:', error);
        throw error;
    }
};

export const rescheduleAppointment = async (appointmentId, updateData) => {
    try {
        const response = await put(`/appointments/${appointmentId}`, updateData);
        const payload = unwrapResponseData(response, '改签预约失败');
        return payload.appointment || payload;
    } catch (error) {
        console.error('改签预约失败:', error);
        throw error;
    }
};

export const getAvailableTimeSlots = async (hospitalId, department, date) => {
    try {
        const timeSlots = [
            '08:00',
            '08:30',
            '09:00',
            '09:30',
            '10:00',
            '10:30',
            '11:00',
            '11:30',
            '14:00',
            '14:30',
            '15:00',
            '15:30',
            '16:00',
            '16:30',
            '17:00',
            '17:30',
        ];

        const bookedSlots = ['09:00', '10:30', '14:30', '16:00'];

        return timeSlots.filter(slot => !bookedSlots.includes(slot));
    } catch (error) {
        console.error('获取可预约时间段失败:', error);
        throw error;
    }
};
