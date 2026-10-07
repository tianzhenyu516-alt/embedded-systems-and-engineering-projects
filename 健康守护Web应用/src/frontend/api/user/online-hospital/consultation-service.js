/**
 * 咨询服务层
 * 处理在线医院咨询相关的API调用
 */

import { unwrapResponseData } from './service-helpers.js';
import { get, post, put } from '../../../utils/user/online-hospital/request.js';

async function fileToDataUrl(file) {
    if (!file) {
        return '';
    }

    if (typeof file === 'string') {
        return file;
    }

    if (file.dataUrl) {
        return file.dataUrl;
    }

    if (typeof FileReader !== 'undefined') {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    return `uploaded://${file.name || 'consultation-file'}`;
}

export const startConsultation = async consultationData => {
    try {
        const response = await post('/consultations', consultationData);
        const payload = unwrapResponseData(response, '开始咨询失败');
        return payload.consultation || payload;
    } catch (error) {
        console.error('开始咨询失败:', error);
        throw error;
    }
};

export const sendMessage = async (consultationId, content, type = 'text') => {
    try {
        const response = await post(`/consultations/${consultationId}/messages`, {
            content,
            type
        });
        const payload = unwrapResponseData(response, '发送消息失败');
        return payload.message || payload;
    } catch (error) {
        console.error('发送消息失败:', error);
        throw error;
    }
};

export const endConsultation = async consultationId => {
    try {
        const response = await put(`/consultations/${consultationId}/status`, {
            status: 'completed'
        });
        const payload = unwrapResponseData(response, '结束咨询失败');
        return payload.consultation || payload;
    } catch (error) {
        console.error('结束咨询失败:', error);
        throw error;
    }
};

export const rateConsultation = async (consultationId, rating, feedback) => {
    try {
        const response = await put(`/consultations/${consultationId}/rating`, {
            rating,
            feedback
        });
        unwrapResponseData(response, '评价咨询失败');
        return { success: true };
    } catch (error) {
        console.error('评价咨询失败:', error);
        throw error;
    }
};

export const getConsultationHistory = async () => {
    try {
        const response = await get('/consultations');
        const payload = unwrapResponseData(response, '获取咨询历史失败');
        return payload.list || payload.consultations || [];
    } catch (error) {
        console.error('获取咨询历史失败:', error);
        throw error;
    }
};

export const getConsultationDetail = async consultationId => {
    try {
        const response = await get(`/consultations/${consultationId}`);
        const payload = unwrapResponseData(response, '获取咨询详情失败');
        return payload.consultation || payload;
    } catch (error) {
        console.error('获取咨询详情失败:', error);
        throw error;
    }
};

export const pollConsultationMessages = async consultationId => {
    try {
        const response = await get('/messages/poll', consultationId ? { consultationId } : undefined);
        const payload = unwrapResponseData(response, '轮询咨询消息失败');
        return {
            hasNewMessages: Boolean(payload.hasNewMessages),
            unreadCount: Number(payload.unreadCount || 0),
        };
    } catch (error) {
        console.error('轮询咨询消息失败:', error);
        throw error;
    }
};

export const uploadFile = async (consultationId, file) => {
    try {
        const response = await post(`/consultations/${consultationId}/files`, {
            file: await fileToDataUrl(file),
            filename: file?.name || 'consultation-file',
            mimeType: file?.type || 'application/octet-stream',
        });
        const payload = unwrapResponseData(response, '上传文件失败');
        return payload.file || payload;
    } catch (error) {
        console.error('上传文件失败:', error);
        throw error;
    }
};
