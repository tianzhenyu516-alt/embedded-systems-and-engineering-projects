const path = require('path');

module.exports = {
    rootDir: path.resolve(__dirname, '..'),
    
    // 测试环境
    testEnvironment: 'jsdom',
    
    // 测试文件匹配模式
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/**/?(*.)+(spec|test).js',
    ],
    
    // 忽略的文件
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
    ],
    
    // 覆盖率配置
    collectCoverageFrom: [
        '<rootDir>/common/**/*.js',
        '<rootDir>/admin/**/*.js',
        '<rootDir>/user/**/*.js',
        '!**/*.min.js',
        '!**/node_modules/**',
    ],
    
    // 覆盖率阈值
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },
    
    // 模块文件扩展名
    moduleFileExtensions: ['js', 'json', 'cjs'],
    
    // 模块名映射（用于别名）
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@common/(.*)$': '<rootDir>/common/$1',
    },
    
    // 设置文件（在每个测试文件运行前执行）
    setupFilesAfterEnv: ['<rootDir>/config/jest.setup.cjs'],
    
    // 转换配置
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    
    // 转换忽略模式
    transformIgnorePatterns: [
        '/node_modules/(?!(chart\\.js)/)',
    ],
    
    // 全局变量
    globals: {
        'Chart': {},
    },
    
    // 测试超时时间
    testTimeout: 10000,
    
    // 清除 mock
    clearMocks: true,
    
    // 恢复 mock
    restoreMocks: true,
};
