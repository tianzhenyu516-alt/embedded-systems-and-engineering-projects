/**
 * Jest 测试设置文件
 * 在每个测试文件运行前执行
 */

// 模拟 window 对象（如果需要）
global.window = global;

// 模拟 localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模拟 sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// 模拟 fetch API
global.fetch = jest.fn();

// 模拟 Chart.js
global.Chart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
}));

// 模拟 DOM API
global.document = {
    createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        style: {},
        innerHTML: '',
        textContent: '',
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
};

// 模拟 window.location
delete window.location;
window.location = {
    href: 'http://localhost',
    hostname: 'localhost',
    protocol: 'http:',
    search: '',
};

// 在每个测试前重置 mock
beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();

    global.fetch.mockClear();
});
