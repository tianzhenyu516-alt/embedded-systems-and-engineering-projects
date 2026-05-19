/**
 * @file error.h
 * @brief 错误码定义和错误处理模块
 * @author Skylar Team
 */

#ifndef __ERROR_H
#define __ERROR_H

#include "stm32f10x.h"

// ==========================================
// 错误码定义
// ==========================================

typedef enum {
    ERR_OK = 0x0000,                    // 无错误
    
    // 系统错误 (0x01xx)
    ERR_SYSTEM_INIT = 0x0101,          // 系统初始化失败
    ERR_SYSTEM_TIMEOUT = 0x0102,       // 系统超时
    ERR_SYSTEM_CRITICAL = 0x0103,      // 系统严重错误
    
    // 硬件错误 (0x02xx)
    ERR_OLED_INIT = 0x0201,            // OLED初始化失败
    ERR_OLED_TIMEOUT = 0x0202,         // OLED通信超时
    ERR_HX711_INIT = 0x0211,           // HX711初始化失败
    ERR_HX711_TIMEOUT = 0x0212,        // HX711读取超时
    ERR_SERVO_INIT = 0x0221,           // 舵机初始化失败
    ERR_RELAY_INIT = 0x0231,           // 继电器初始化失败
    ERR_SIGNAL_INIT = 0x0241,          // 信号输入初始化失败
    
    // 通信错误 (0x03xx)
    ERR_UART_SEND = 0x0301,            // UART发送失败
    ERR_UART_RECV = 0x0302,            // UART接收失败
    ERR_I2C_TIMEOUT = 0x0311,          // I2C超时
    ERR_SPI_TIMEOUT = 0x0321,          // SPI超时
    
    // 数据错误 (0x04xx)
    ERR_DATA_INVALID = 0x0401,         // 无效数据
    ERR_DATA_OVERFLOW = 0x0402,        // 数据溢出
    ERR_DATA_UNDERFLOW = 0x0403,       // 数据下溢
    ERR_DATA_CORRUPT = 0x0404,         // 数据损坏
    
    // 状态错误 (0x05xx)
    ERR_STATE_INVALID = 0x0501,        // 无效状态
    ERR_STATE_TRANSITION = 0x0502,     // 状态转换失败
} ErrorCode;

// ==========================================
// 错误信息结构
// ==========================================

typedef struct {
    ErrorCode code;
    uint32_t timestamp;
    const char* message;
} ErrorInfo;

// ==========================================
// 函数声明
// ==========================================

/**
 * @brief 错误处理模块初始化
 */
void Error_Init(void);

/**
 * @brief 报告错误
 * @param code 错误码
 * @param message 错误信息字符串
 */
void Error_Report(ErrorCode code, const char* message);

/**
 * @brief 清除错误
 */
void Error_Clear(void);

/**
 * @brief 获取最近的错误信息
 * @return 错误信息结构体指针
 */
const ErrorInfo* Error_GetLast(void);

/**
 * @brief 检查是否有未处理的错误
 * @retval 0 无错误
 * @retval 1 有错误
 */
uint8_t Error_HasPending(void);

#endif
