/**
 * 在线医院服务层公共响应处理工具
 */

export function unwrapResponseData(response, errorMessage) {
    if (!response) {
        throw new Error(errorMessage);
    }

    if (response.success === false) {
        throw new Error(response.error?.message || response.message || errorMessage);
    }

    return response.data || response;
}

export function unwrapListResponseData(response, errorMessage, keys = ['list']) {
    const payload = unwrapResponseData(response, errorMessage);

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) {
            return payload[key];
        }
    }

    throw new Error(errorMessage);
}
