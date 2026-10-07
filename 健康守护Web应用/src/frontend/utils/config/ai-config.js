// AI 大模型配置文件
// 当前项目仅启用 DeepSeek、豆包、智普

const AI_CONFIG = {
    // 当前启用的AI服务提供商（按你的实际可用情况限制）
    ENABLED_PROVIDERS: ['deepseek', 'doubao', 'zhipu'],

    // AI服务提供商
    PROVIDER: 'deepseek', // 'deepseek', 'doubao', 'zhipu'

    // API配置
    API_BASE_URL: '', // 留空时按提供商默认地址调用
    API_KEY: '', // 请通过运行环境或用户配置提供真实密钥
    API_KEYS: {
        deepseek: '',
        doubao: '',
        zhipu: '',
    },

    // 可选：使用本地代理
    USE_PROXY: true,
    PROXY_URL: '/api/proxy/ai',

    // 性能优化配置
    PERFORMANCE: {
        enableProviderRace: true, // 让多个可用AI服务并行抢答，优先返回最快结果
        maxParallelProviders: 2, // 并行数量不宜过大，避免额外成本和限流
        providerRaceByType: {
            chat: true,
            analysis: true,
            mental: false,
        },
    },

    // 协作分析配置
    COOPERATION: {
        enableTaskSplitAnalysis: true, // 分析类任务拆成“提取要点 + 生成结论”两步
        types: {
            analysis: true,
            chat: false,
            mental: false,
        },
        plannerPrompt:
            '你是健康分析预处理助手。你的任务不是直接给最终答案，而是先从输入里提取关键信息，输出简洁、结构化、可复用的分析要点。只输出以下四部分：\n[关键指标]\n- ...\n[异常与风险]\n- ...\n[可执行建议草案]\n- ...\n[需要重点展开的问题]\n- ...',
    },

    // 模型配置
    MODELS: {
        deepseek: {
            chat: 'deepseek-chat', // 使用DeepSeek API实际支持的模型名称
            analysis: 'deepseek-chat', // 分析场景优先使用聊天模型，响应更快
            streaming: true,
        },
        doubao: {
            chat: 'doubao-seed-2-0-pro-260215', // 使用豆包API实际支持的模型名称
            analysis: 'doubao-seed-2-0-pro-260215', // 使用豆包API实际支持的模型名称
            streaming: true,
        },
        zhipu: {
            chat: 'glm-4', // 使用智谱清言API实际支持的模型名称
            analysis: 'glm-4', // 使用智谱清言API实际支持的模型名称
            streaming: true,
        },
    },

    // 提示词模板
    PROMPTS: {
        healthAnalysis: `作为一个专业的健康管理AI助手，请分析用户的健康数据并给出建议。
数据：{healthData}
要求：1. 简洁明了 2. 针对性强 3. 实用可操作`,

        dietAdvice: `作为营养专家，根据用户的个人情况和健康目标，给出膳食建议。
用户信息：{userProfile}
营养数据：{nutritionData}
要求：提供具体的饮食建议`,

        exercisePlan: `作为运动教练，为用户制定个性化运动计划。
用户信息：{userProfile}
运动数据：{exerciseData}
要求：制定可执行的运动计划`,

        mentalSupport: `作为心理健康助手，我需要倾听用户的感受并给予温暖的支持和建议。

用户的消息：{userMessage}

请根据用户的消息内容，给予真诚、温暖、专业的回复。要求：
1. 首先表现出共情和理解
2. 提供积极的支持和鼓励
3. 根据情况给出实用的建议
4. 语气要温和、友好
5. 如果用户表达了负面情绪，要给予安慰和支持

请直接用中文回复，不需要重复用户的问题或额外的说明。`,

        symptomAnalysis: `作为医疗AI助手，分析用户的症状（仅供参考，不替代医生）。

症状信息：{symptoms}

请按以下格式提供完整但简短的分析：

1. **主要症状分析**（80-120字）：
   需要包含：
   - 可能的原因分析
   - 症状的严重程度评估
   - 是否需要就医的建议
   要求：分析要完整、专业、有参考价值，但语言要简洁明了

2. **非处方药推荐**（仅推荐常见非处方药）：
   格式要求：
   - 使用药物的正式通用名称
   - 可附加常见商品名（如：布洛芬缓释胶囊/芬必得）
   - 说明适应症和用法
   - 每个药物一行，格式：通用名（商品名）- 适应症说明
   
示例格式：
- 布洛芬缓释胶囊（芬必得）- 用于缓解轻度至中度疼痛及发热
- 对乙酰氨基酚片（泰诺）- 用于退热镇痛

注意事项：
- 只推荐常见的非处方药（OTC药品）
- 严禁推荐处方药
- 使用正式的药物名称
- 回答要完整但简洁，总字数控制在200字以内`,
    },

    // 请求配置
    REQUEST_CONFIG: {
        timeout: 30000, // 30秒超时，减少长时间等待
        maxRetries: 1, // 最大重试次数，避免失败时多次串行重试拖慢响应
        temperature: 0.7, // 温度参数（0-1，越高越随机）
        maxTokens: 1200, // 最大输出长度，减少生成耗时
        stream: false, // 是否流式输出
    },

    // 降级配置
    FALLBACK: {
        enableProxyRetry: true, // 失败后是否尝试代理重试
        enableLocalResponse: false, // 不再伪造本地AI回复，失败时直接报错
        providerPriority: ['deepseek', 'doubao', 'zhipu'],
        providerPriorityByType: {
            mental: ['deepseek', 'doubao'],
            analysis: ['deepseek', 'doubao', 'zhipu'],
            chat: ['deepseek', 'doubao'],
        },
        defaults: {
            diseaseConsultation: {
                analysis: '根据您当前描述的症状，现阶段更适合先观察症状变化并结合线下检查进一步判断，若持续不适请尽快就医。',
                possibleCauses: [
                    '常见上呼吸道感染或季节性不适',
                    '疲劳、作息不规律或压力因素影响',
                    '存在其他需要结合检查确认的健康问题',
                ],
                suggestions: [
                    '先注意休息、补充水分并清淡饮食',
                    '持续记录症状变化，如发热、疼痛或不适是否加重',
                    '如症状持续不缓解或明显加重，请及时前往正规医院就诊',
                ],
            },
            medicationGuidance: {
                dosagePrefix: '请严格按照药品说明书或医生建议使用',
                instructions: [
                    '服药前请仔细阅读药品说明书并核对适应症',
                    '请按推荐时间和剂量服用，不要自行增减药量',
                    '如同时使用其他药物，请先咨询医生或药师',
                    '服药期间若症状无改善，请及时复诊',
                ],
                precautions: [
                    '如有过敏史、孕期、哺乳期或慢性病史，请先咨询医生',
                    '出现皮疹、呼吸不适等异常反应时应立即停药并就医',
                    '避免与酒精或可能相互作用的药物同时使用',
                    '请将药品放在儿童接触不到的地方',
                ],
                storage: '请将药物存放于阴凉、干燥、避光处，并按说明书要求保存。',
            },
        },
        localTemplates: {
            chat: '当前AI服务暂时不可用，请先保持规律作息、均衡饮食并适度运动。如遇紧急情况请及时联系专业医生。',
            analysis:
                '当前网络不稳定，AI暂时无法生成个性化分析。建议继续保持每日步数6000-10000步、保证7小时睡眠，并定期记录血压和心率。',
            mental: 'AI心理助手暂时离线，请先做4-7-8深呼吸、写下让您紧张的事情，并与信任的人交流。如情绪持续低落，请寻求专业支持。',
        },
        localKnowledgeBase: {
            breathingTips: [
                '尝试 4-7-8 深呼吸：吸气4秒、屏息7秒、呼气8秒',
                '记录触发紧张情绪的事件，并写下可以采取的行动',
            ],
            mentalSupportLines: ['全国心理援助热线：12320 转 5', '生命危机干预专线：400-161-9995'],
            defaultSuggestions: [
                '保持规律睡眠和饮水',
                '适度运动（每日步行30分钟）',
                '与信任的人交流感受',
            ],
        },
    },

    // 缓存配置
    CACHE: {
        enabled: true,
        duration: 5 * 60 * 1000, // 5分钟缓存
        storageKey: 'ai_cache',
    },

    // 本地存储键名
    STORAGE_KEYS: {
        API_KEY: '',
        PROVIDER: 'ai_provider',
        CHAT_HISTORY: 'ai_chat_history',
        PREFERENCES: 'ai_preferences',
    },
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
} else {
    window.AI_CONFIG = AI_CONFIG;
}
