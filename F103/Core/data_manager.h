/**
 * @file data_manager.h
 * @brief 数据管理模块 - 传感器数据采集与存储
 * @author Skylar Team
 */

#ifndef __DATA_MANAGER_H
#define __DATA_MANAGER_H

#include "stm32f10x.h"
#include "config.h"

// ==========================================
// 传感器数据结构
// ==========================================

typedef struct {
    float weight;               // 重量 (g)
    uint32_t timestamp;         // 时间戳 (ms)
    uint8_t isValid;            // 数据有效性标志
} SensorData;

typedef struct {
    SensorData buffer[DATA_BUFFER_SIZE];
    uint8_t writeIndex;
    uint8_t readIndex;
    uint8_t count;
} DataRingBuffer;

// ==========================================
// 传感器状态结构
// ==========================================

typedef struct {
    float weight;
    float calibrationFactor;
    int32_t zeroOffset;
    uint8_t isCalibrated;
} SensorState;

// ==========================================
// 函数声明
// ==========================================

/**
 * @brief 数据管理模块初始化
 */
void DataManager_Init(void);

/**
 * @brief 采集并存储传感器数据
 * @retval 0 成功
 * @retval 其他 失败
 */
uint8_t DataManager_CollectData(void);

/**
 * @brief 获取最新的传感器数据
 * @param data 输出参数 - 数据指针
 * @retval 0 成功
 * @retval 1 失败 (无数据)
 */
uint8_t DataManager_GetLatest(SensorData* data);

/**
 * @brief 获取平均重量 (从缓冲区)
 * @param sampleCount 采样数量
 * @return 平均重量
 */
float DataManager_GetAverageWeight(uint8_t sampleCount);

/**
 * @brief 执行零点校准
 */
void DataManager_CalibrateZero(void);

/**
 * @brief 获取传感器状态
 * @return 传感器状态结构指针
 */
const SensorState* DataManager_GetSensorState(void);

/**
 * @brief 清空数据缓冲区
 */
void DataManager_ClearBuffer(void);

#endif
