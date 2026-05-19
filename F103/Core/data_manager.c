/**
 * @file data_manager.c
 * @brief 数据管理模块实现
 * @author Skylar Team
 */

#include "data_manager.h"
#include "hx711.h"
#include "Delay.h"
#include "config.h"
#include <string.h>

// ==========================================
// 内部变量
// ==========================================

static DataRingBuffer g_dataBuffer;
static SensorState g_sensorState;

// ==========================================
// 内部函数声明
// ==========================================

static void DataManager_RingBufferPush(const SensorData* data);
static int32_t DataManager_ReadHX711Average(uint8_t times);

// ==========================================
// 函数实现
// ==========================================

void DataManager_Init(void)
{
    g_sensorState.weight = 0.0f;
    g_sensorState.calibrationFactor = HX711_CALIBRATION_FACTOR;
    g_sensorState.zeroOffset = 0;
    g_sensorState.isCalibrated = 0;
    
    DataManager_ClearBuffer();
}

uint8_t DataManager_CollectData(void)
{
    SensorData data;
    
    int32_t rawValue = DataManager_ReadHX711Average(HX711_SAMPLE_TIMES);
    
    if (g_sensorState.isCalibrated) {
        data.weight = (float)(rawValue - g_sensorState.zeroOffset) / g_sensorState.calibrationFactor;
        
        if (data.weight < 0.0f) {
            data.weight = 0.0f;
        }
        
        data.isValid = 1;
    } else {
        data.weight = 0.0f;
        data.isValid = 0;
    }
    
    data.timestamp = 0;  // 可以添加系统时间戳
    
    DataManager_RingBufferPush(&data);
    g_sensorState.weight = data.weight;
    
    return 0;
}

uint8_t DataManager_GetLatest(SensorData* data)
{
    if (data == NULL || g_dataBuffer.count == 0) {
        return 1;
    }
    
    uint8_t lastIndex = (g_dataBuffer.writeIndex == 0) ? 
                        (DATA_BUFFER_SIZE - 1) : 
                        (g_dataBuffer.writeIndex - 1);
    
    memcpy(data, &g_dataBuffer.buffer[lastIndex], sizeof(SensorData));
    return 0;
}

float DataManager_GetAverageWeight(uint8_t sampleCount)
{
    if (sampleCount == 0 || g_dataBuffer.count == 0) {
        return g_sensorState.weight;
    }
    
    if (sampleCount > g_dataBuffer.count) {
        sampleCount = g_dataBuffer.count;
    }
    
    float sum = 0.0f;
    uint8_t count = 0;
    uint8_t index = (g_dataBuffer.writeIndex == 0) ? 
                   (DATA_BUFFER_SIZE - 1) : 
                   (g_dataBuffer.writeIndex - 1);
    
    for (uint8_t i = 0; i < sampleCount; i++) {
        if (g_dataBuffer.buffer[index].isValid) {
            sum += g_dataBuffer.buffer[index].weight;
            count++;
        }
        
        index = (index == 0) ? (DATA_BUFFER_SIZE - 1) : (index - 1);
    }
    
    if (count == 0) {
        return g_sensorState.weight;
    }
    
    return sum / count;
}

void DataManager_CalibrateZero(void)
{
    int32_t sum = 0;
    
    for (uint8_t i = 0; i < 50; i++) {
        sum += HX711_Get_Data();
        Delay_ms(5);
    }
    
    g_sensorState.zeroOffset = sum / 50;
    g_sensorState.isCalibrated = 1;
}

const SensorState* DataManager_GetSensorState(void)
{
    return &g_sensorState;
}

void DataManager_ClearBuffer(void)
{
    g_dataBuffer.writeIndex = 0;
    g_dataBuffer.readIndex = 0;
    g_dataBuffer.count = 0;
    
    memset(g_dataBuffer.buffer, 0, sizeof(g_dataBuffer.buffer));
}

// ==========================================
// 内部函数实现
// ==========================================

static void DataManager_RingBufferPush(const SensorData* data)
{
    if (data == NULL) {
        return;
    }
    
    memcpy(&g_dataBuffer.buffer[g_dataBuffer.writeIndex], data, sizeof(SensorData));
    g_dataBuffer.writeIndex = (g_dataBuffer.writeIndex + 1) % DATA_BUFFER_SIZE;
    
    if (g_dataBuffer.count < DATA_BUFFER_SIZE) {
        g_dataBuffer.count++;
    } else {
        // 缓冲区已满，覆盖旧数据
        g_dataBuffer.readIndex = g_dataBuffer.writeIndex;
    }
}

static int32_t DataManager_ReadHX711Average(uint8_t times)
{
    if (times == 0) {
        times = 1;
    }
    
    int32_t sum = 0;
    
    for (uint8_t i = 0; i < times; i++) {
        sum += HX711_Get_Data();
        Delay_us(100);
    }
    
    return sum / times;
}
