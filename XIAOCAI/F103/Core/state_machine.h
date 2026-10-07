/**
 * @file state_machine.h
 * @brief 状态机模块 - 管理系统运行状态
 * @author Skylar Team
 */

#ifndef __STATE_MACHINE_H
#define __STATE_MACHINE_H

#include "stm32f10x.h"

// ==========================================
// 系统状态定义
// ==========================================

typedef enum {
    STATE_INIT = 0,           // 初始化状态
    STATE_CALIBRATION,        // 校准状态
    STATE_IDLE,               // 空闲状态
    STATE_SENSING,            // 传感器采集状态
    STATE_SERVO_TRIGGER,      // 舵机触发状态
    STATE_MOTOR_STOP,         // 电机停止状态
    STATE_ERROR               // 错误处理状态
} SystemState;

// ==========================================
// 状态事件定义
// ==========================================

typedef enum {
    EVENT_NONE = 0,
    EVENT_CALIBRATION_DONE,   // 校准完成
    EVENT_WEIGHT_TRIGGER,     // 重量阈值触发
    EVENT_SIGNAL_TRIGGER,     // PA5信号触发
    EVENT_ERROR_OCCURRED      // 错误发生
} StateEvent;

// ==========================================
// 状态转换表项
// ==========================================

typedef struct {
    SystemState currentState;
    StateEvent event;
    SystemState nextState;
} StateTransition;

// ==========================================
// 函数声明
// ==========================================

/**
 * @brief 状态机初始化
 */
void StateMachine_Init(void);

/**
 * @brief 状态机更新 - 每次主循环调用
 */
void StateMachine_Update(void);

/**
 * @brief 获取当前状态
 * @retval 当前系统状态
 */
SystemState StateMachine_GetCurrent(void);

/**
 * @brief 触发状态转换事件
 * @param event 事件类型
 */
void StateMachine_TriggerEvent(StateEvent event);

/**
 * @brief 获取状态名称字符串
 * @param state 状态枚举值
 * @return 状态名称字符串
 */
const char* StateMachine_GetStateName(SystemState state);

#endif
