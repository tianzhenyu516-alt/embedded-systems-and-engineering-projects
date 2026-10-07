/**
 * @file config.h
 * @brief 系统配置文件 - 统一管理所有硬件和软件参数
 * @author Skylar Team
 */

#ifndef __CONFIG_H
#define __CONFIG_H

#include "stm32f10x.h"

// ==========================================
// 系统配置
// ==========================================

// 主循环频率 (ms)
#define SYSTEM_TICK_INTERVAL 10

// 串口波特率
#define UART_BAUD_RATE 115200

// ==========================================
// HX711 称重传感器配置
// ==========================================

#define HX711_SAMPLE_TIMES 5
#define HX711_CALIBRATION_FACTOR 450.0f
#define HX711_WEIGHT_THRESHOLD 10.0f
#define HX711_HYSTERESIS 5.0f

// ==========================================
// OLED 显示配置
// ==========================================

#define OLED_REFRESH_RATE 100  // ms
#define OLED_SCREEN_WIDTH 128
#define OLED_SCREEN_HEIGHT 64

// ==========================================
// 舵机配置
// ==========================================

// 舵机1 (推物舵机)
#define SERVO1_ANGLE_MIN 0
#define SERVO1_ANGLE_MAX 270
#define SERVO1_PUSH_ANGLE 270
#define SERVO1_PULL_ANGLE 0
#define SERVO1_DELAY_MS 2000

// 舵机2 (打印舵机)
#define SERVO2_ANGLE_MIN 0
#define SERVO2_ANGLE_MAX 180
#define SERVO2_LOOP_INTERVAL 5000  // ms

// ==========================================
// 信号检测配置
// ==========================================

#define SIGNAL_DEBOUNCE_MS 50
#define SIGNAL_STOP_DURATION_MS 6000

// ==========================================
// 数据采集缓冲区大小
// ==========================================

#define DATA_BUFFER_SIZE 10

// ==========================================
// 调试开关
// ==========================================

// #define DEBUG_MODE 1
// #define DEBUG_UART 1

#endif
