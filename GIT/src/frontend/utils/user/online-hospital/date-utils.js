/**
 * 日期工具函数
 */

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式化字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 拆分日期时间文本
 * @param {string} value - 日期时间字符串
 * @returns {{date: string, time: string}} 拆分后的日期与时间
 */
export function splitDateTime(value = '') {
    const normalized = String(value).trim();
    if (!normalized) {
        return { date: '', time: '' };
    }

    const [date = '', time = ''] = normalized.split(/\s+|T/);
    return { date, time: time.slice(0, 5) };
}

/**
 * 格式化分钟时长
 * @param {number|string} minutes - 分钟数
 * @returns {string} 展示文本
 */
export function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined || minutes === '') {
        return '';
    }

    return `${minutes}分钟`;
}

/**
 * 格式化路程耗时
 * @param {number|null} minutes - 分钟数
 * @returns {string} 展示文本
 */
export function formatTravelDuration(minutes) {
    if (!Number.isFinite(minutes)) {
        return '未知';
    }

    if (minutes < 60) {
        return `${minutes}分钟`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

/**
 * 获取相对时间
 * @param {Date} date - 日期对象
 * @returns {string} 相对时间字符串
 */
export function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
        return '刚刚';
    }
    if (minutes < 60) {
        return `${minutes}分钟前`;
    }
    if (hours < 24) {
        return `${hours}小时前`;
    }
    if (days < 7) {
        return `${days}天前`;
    }
    return formatDate(date);
}

/**
 * 检查日期是否是今天
 * @param {Date} date - 日期对象
 * @returns {boolean} 是否是今天
 */
export function isToday(date) {
    const today = new Date();
    return (
        date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear()
    );
}

/**
 * 获取日期范围
 * @param {number} days - 天数
 * @returns {Object} 包含开始和结束日期的对象
 */
export function getDateRange(days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    return {
        start: startDate,
        end: endDate,
    };
}
