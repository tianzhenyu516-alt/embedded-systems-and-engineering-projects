/**
 * @file error.c
 * @brief 错误处理模块实现
 * @author Skylar Team
 */

#include "error.h"
#include <string.h>

// ==========================================
// 内部变量
// ==========================================

static ErrorInfo g_lastError;
static uint8_t g_hasError = 0;

// ==========================================
// 错误信息映射表
// ==========================================

typedef struct {
    ErrorCode code;
    const char* defaultMsg;
} ErrorMsgMap;

static const ErrorMsgMap g_errorMsgMap[] = {
    { ERR_OK, "OK - No error" },
    { ERR_SYSTEM_INIT, "System initialization failed" },
    { ERR_SYSTEM_TIMEOUT, "System timeout" },
    { ERR_SYSTEM_CRITICAL, "System critical error" },
    { ERR_OLED_INIT, "OLED initialization failed" },
    { ERR_OLED_TIMEOUT, "OLED communication timeout" },
    { ERR_HX711_INIT, "HX711 initialization failed" },
    { ERR_HX711_TIMEOUT, "HX711 read timeout" },
    { ERR_SERVO_INIT, "Servo initialization failed" },
    { ERR_RELAY_INIT, "Relay initialization failed" },
    { ERR_SIGNAL_INIT, "Signal input initialization failed" },
    { ERR_UART_SEND, "UART send failed" },
    { ERR_UART_RECV, "UART receive failed" },
    { ERR_I2C_TIMEOUT, "I2C timeout" },
    { ERR_SPI_TIMEOUT, "SPI timeout" },
    { ERR_DATA_INVALID, "Invalid data" },
    { ERR_DATA_OVERFLOW, "Data overflow" },
    { ERR_DATA_UNDERFLOW, "Data underflow" },
    { ERR_DATA_CORRUPT, "Data corrupt" },
    { ERR_STATE_INVALID, "Invalid state" },
    { ERR_STATE_TRANSITION, "State transition failed" },
};

static const uint16_t g_errorMsgMapSize = sizeof(g_errorMsgMap) / sizeof(g_errorMsgMap[0]);

// ==========================================
// 函数实现
// ==========================================

void Error_Init(void)
{
    g_lastError.code = ERR_OK;
    g_lastError.timestamp = 0;
    g_lastError.message = "";
    g_hasError = 0;
}

void Error_Report(ErrorCode code, const char* message)
{
    g_lastError.code = code;
    
    if (message != NULL) {
        g_lastError.message = message;
    } else {
        // 查找默认错误信息
        for (uint16_t i = 0; i < g_errorMsgMapSize; i++) {
            if (g_errorMsgMap[i].code == code) {
                g_lastError.message = g_errorMsgMap[i].defaultMsg;
                break;
            }
        }
    }
    
    g_lastError.timestamp = 0;  // 这里可以换成系统时间
    g_hasError = 1;
    
    // TODO: 可以在这里添加错误日志记录、OLED显示等功能
}

void Error_Clear(void)
{
    g_lastError.code = ERR_OK;
    g_lastError.message = "";
    g_hasError = 0;
}

const ErrorInfo* Error_GetLast(void)
{
    return &g_lastError;
}

uint8_t Error_HasPending(void)
{
    return g_hasError;
}
