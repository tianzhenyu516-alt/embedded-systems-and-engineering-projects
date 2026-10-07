/**
 * 省份工具类
 * 提供省份列表和省份提取功能
 */

/**
 * 中国省份列表（完整名称）
 */
const PROVINCES = [
    '北京市',
    '天津市',
    '河北省',
    '山西省',
    '内蒙古自治区',
    '辽宁省',
    '吉林省',
    '黑龙江省',
    '上海市',
    '江苏省',
    '浙江省',
    '安徽省',
    '福建省',
    '江西省',
    '山东省',
    '河南省',
    '湖北省',
    '湖南省',
    '广东省',
    '广西壮族自治区',
    '海南省',
    '重庆市',
    '四川省',
    '贵州省',
    '云南省',
    '西藏自治区',
    '陕西省',
    '甘肃省',
    '青海省',
    '宁夏回族自治区',
    '新疆维吾尔自治区',
    '台湾省',
    '香港特别行政区',
    '澳门特别行政区',
];

/**
 * 省份简称到完整名称的映射
 */
const PROVINCE_SHORT_NAMES = {
    北京: '北京市',
    天津: '天津市',
    河北: '河北省',
    山西: '山西省',
    内蒙古: '内蒙古自治区',
    辽宁: '辽宁省',
    吉林: '吉林省',
    黑龙江: '黑龙江省',
    上海: '上海市',
    江苏: '江苏省',
    浙江: '浙江省',
    安徽: '安徽省',
    福建: '福建省',
    江西: '江西省',
    山东: '山东省',
    河南: '河南省',
    湖北: '湖北省',
    湖南: '湖南省',
    广东: '广东省',
    广西: '广西壮族自治区',
    海南: '海南省',
    重庆: '重庆市',
    四川: '四川省',
    贵州: '贵州省',
    云南: '云南省',
    西藏: '西藏自治区',
    陕西: '陕西省',
    甘肃: '甘肃省',
    青海: '青海省',
    宁夏: '宁夏回族自治区',
    新疆: '新疆维吾尔自治区',
    台湾: '台湾省',
    香港: '香港特别行政区',
    澳门: '澳门特别行政区',
};

/**
 * 从地址中提取省份
 * @param {string} address - 地址字符串
 * @returns {string|null} 省份完整名称，如果未找到则返回 null
 */
function extractProvinceFromAddress(address) {
    if (!address || typeof address !== 'string') {
        return null;
    }

    // 首先尝试匹配完整省份名称
    for (const province of PROVINCES) {
        if (address.includes(province)) {
            return province;
        }
    }

    // 如果没找到完整省份名，尝试查找简称
    for (const [short, full] of Object.entries(PROVINCE_SHORT_NAMES)) {
        if (address.includes(short)) {
            return full;
        }
    }

    return null;
}

/**
 * 验证省份名称是否有效
 * @param {string} province - 省份名称
 * @returns {boolean} 是否为有效省份
 */
function isValidProvince(province) {
    if (!province || typeof province !== 'string') {
        return false;
    }
    return PROVINCES.includes(province);
}

/**
 * 获取省份简称
 * @param {string} province - 省份完整名称
 * @returns {string|null} 省份简称，如果未找到则返回 null
 */
function getProvinceShortName(province) {
    if (!province || typeof province !== 'string') {
        return null;
    }

    for (const [short, full] of Object.entries(PROVINCE_SHORT_NAMES)) {
        if (full === province) {
            return short;
        }
    }

    return null;
}

/**
 * 从授权码中解析省份信息
 * 授权码格式示例: BEIJING-AUTH-123456 或 北京-AUTH-789
 * @param {string} authCode - 授权码
 * @returns {string|null} 省份完整名称，如果未找到则返回 null
 */
function extractProvinceFromAuthCode(authCode) {
    if (!authCode || typeof authCode !== 'string') {
        return null;
    }

    // 首先尝试匹配完整省份名称
    for (const province of PROVINCES) {
        if (authCode.includes(province)) {
            return province;
        }
    }

    // 尝试匹配省份简称
    for (const [short, full] of Object.entries(PROVINCE_SHORT_NAMES)) {
        if (authCode.includes(short)) {
            return full;
        }
    }

    // 尝试拼音格式匹配（如 BEIJING, SHANGHAI 等）
    const pinyinMap = {
        'BEIJING': '北京市',
        'TIANJIN': '天津市',
        'HEBEI': '河北省',
        'SHANXI': '山西省',
        'NEIMENGGU': '内蒙古自治区',
        'LIAONING': '辽宁省',
        'JILIN': '吉林省',
        'HEILONGJIANG': '黑龙江省',
        'SHANGHAI': '上海市',
        'JIANGSU': '江苏省',
        'ZHEJIANG': '浙江省',
        'ANHUI': '安徽省',
        'FUJIAN': '福建省',
        'JIANGXI': '江西省',
        'SHANDONG': '山东省',
        'HENAN': '河南省',
        'HUBEI': '湖北省',
        'HUNAN': '湖南省',
        'GUANGDONG': '广东省',
        'GUANGXI': '广西壮族自治区',
        'HAINAN': '海南省',
        'CHONGQING': '重庆市',
        'SICHUAN': '四川省',
        'GUIZHOU': '贵州省',
        'YUNNAN': '云南省',
        'XIZANG': '西藏自治区',
        'SHAANXI': '陕西省',
        'GANSU': '甘肃省',
        'QINGHAI': '青海省',
        'NINGXIA': '宁夏回族自治区',
        'XINJIANG': '新疆维吾尔自治区',
        'TAIWAN': '台湾省',
        'HONGKONG': '香港特别行政区',
        'MACAO': '澳门特别行政区',
    };

    const upperAuthCode = authCode.toUpperCase();
    for (const [pinyin, province] of Object.entries(pinyinMap)) {
        if (upperAuthCode.includes(pinyin)) {
            return province;
        }
    }

    return null;
}

/**
 * 验证授权码省份与选择的省份是否匹配
 * @param {string} authCode - 授权码
 * @param {string} selectedProvince - 选择的省份
 * @returns {boolean} 是否匹配
 */
function validateProvinceMatch(authCode, selectedProvince) {
    if (!authCode || !selectedProvince) {
        return false;
    }

    const authCodeProvince = extractProvinceFromAuthCode(authCode);
    return authCodeProvince === selectedProvince;
}

// 导出到全局作用域（用于非模块环境）
if (typeof window !== 'undefined') {
    window.PROVINCES = PROVINCES;
    window.PROVINCE_SHORT_NAMES = PROVINCE_SHORT_NAMES;
    window.extractProvinceFromAddress = extractProvinceFromAddress;
    window.isValidProvince = isValidProvince;
    window.getProvinceShortName = getProvinceShortName;
    window.extractProvinceFromAuthCode = extractProvinceFromAuthCode;
    window.validateProvinceMatch = validateProvinceMatch;
}
