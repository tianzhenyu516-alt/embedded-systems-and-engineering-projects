/**
 * @file state_machine.c
 * @brief 状态机模块实现
 * @author Skylar Team
 */

#include "state_machine.h"
#include "error.h"
#include <string.h>

// ==========================================
// 内部变量
// ==========================================

static SystemState g_currentState = STATE_INIT;
static StateEvent g_pendingEvent = EVENT_NONE;
static uint32_t g_stateTimer = 0;

// ==========================================
// 状态名称映射表
// ==========================================

typedef struct {
    SystemState state;
    const char* name;
} StateNameMap;

static const StateNameMap g_stateNameMap[] = {
    { STATE_INIT, "INIT" },
    { STATE_CALIBRATION, "CALIBRATION" },
    { STATE_IDLE, "IDLE" },
    { STATE_SENSING, "SENSING" },
    { STATE_SERVO_TRIGGER, "SERVO_TRIGGER" },
    { STATE_MOTOR_STOP, "MOTOR_STOP" },
    { STATE_ERROR, "ERROR" },
};

static const uint8_t g_stateNameMapSize = sizeof(g_stateNameMap) / sizeof(g_stateNameMap[0]);

// ==========================================
// 内部函数声明
// ==========================================

static void StateMachine_EnterState(SystemState state);
static void StateMachine_LeaveState(SystemState state);
static void StateMachine_RunState(void);
static SystemState StateMachine_GetNextState(StateEvent event);

// ==========================================
// 函数实现
// ==========================================

void StateMachine_Init(void)
{
    g_currentState = STATE_INIT;
    g_pendingEvent = EVENT_NONE;
    g_stateTimer = 0;
    StateMachine_EnterState(STATE_INIT);
}

void StateMachine_Update(void)
{
    // 检查是否有待处理的事件
    if (g_pendingEvent != EVENT_NONE) {
        SystemState nextState = StateMachine_GetNextState(g_pendingEvent);
        
        if (nextState != g_currentState) {
            StateMachine_LeaveState(g_currentState);
            g_currentState = nextState;
            StateMachine_EnterState(g_currentState);
        }
        
        g_pendingEvent = EVENT_NONE;
    }
    
    // 运行当前状态逻辑
    StateMachine_RunState();
    
    g_stateTimer++;
}

SystemState StateMachine_GetCurrent(void)
{
    return g_currentState;
}

void StateMachine_TriggerEvent(StateEvent event)
{
    g_pendingEvent = event;
}

const char* StateMachine_GetStateName(SystemState state)
{
    for (uint8_t i = 0; i < g_stateNameMapSize; i++) {
        if (g_stateNameMap[i].state == state) {
            return g_stateNameMap[i].name;
        }
    }
    return "UNKNOWN";
}

// ==========================================
// 内部函数实现
// ==========================================

static void StateMachine_EnterState(SystemState state)
{
    g_stateTimer = 0;
    
    switch (state) {
        case STATE_INIT:
            // 初始化状态入口
            break;
        
        case STATE_CALIBRATION:
            // 校准状态入口
            break;
        
        case STATE_IDLE:
            // 空闲状态入口
            break;
        
        case STATE_SENSING:
            // 传感器采集状态入口
            break;
        
        case STATE_SERVO_TRIGGER:
            // 舵机触发状态入口
            break;
        
        case STATE_MOTOR_STOP:
            // 电机停止状态入口
            break;
        
        case STATE_ERROR:
            // 错误状态入口
            break;
        
        default:
            break;
    }
}

static void StateMachine_LeaveState(SystemState state)
{
    switch (state) {
        case STATE_INIT:
            // 离开初始化状态
            break;
        
        case STATE_CALIBRATION:
            // 离开校准状态
            break;
        
        case STATE_IDLE:
            // 离开空闲状态
            break;
        
        case STATE_SENSING:
            // 离开传感器采集状态
            break;
        
        case STATE_SERVO_TRIGGER:
            // 离开舵机触发状态
            break;
        
        case STATE_MOTOR_STOP:
            // 离开电机停止状态
            break;
        
        case STATE_ERROR:
            // 离开错误状态
            break;
        
        default:
            break;
    }
}

static void StateMachine_RunState(void)
{
    switch (g_currentState) {
        case STATE_INIT:
            // 初始化状态逻辑
            break;
        
        case STATE_CALIBRATION:
            // 校准状态逻辑
            break;
        
        case STATE_IDLE:
            // 空闲状态逻辑
            break;
        
        case STATE_SENSING:
            // 传感器采集状态逻辑
            break;
        
        case STATE_SERVO_TRIGGER:
            // 舵机触发状态逻辑
            break;
        
        case STATE_MOTOR_STOP:
            // 电机停止状态逻辑
            break;
        
        case STATE_ERROR:
            // 错误处理逻辑
            break;
        
        default:
            Error_Report(ERR_STATE_INVALID, "Invalid state encountered");
            break;
    }
}

static SystemState StateMachine_GetNextState(StateEvent event)
{
    SystemState nextState = g_currentState;
    
    switch (g_currentState) {
        case STATE_INIT:
            if (event == EVENT_CALIBRATION_DONE) {
                nextState = STATE_IDLE;
            }
            break;
        
        case STATE_CALIBRATION:
            if (event == EVENT_CALIBRATION_DONE) {
                nextState = STATE_IDLE;
            }
            break;
        
        case STATE_IDLE:
            if (event == EVENT_WEIGHT_TRIGGER) {
                nextState = STATE_SERVO_TRIGGER;
            } else if (event == EVENT_SIGNAL_TRIGGER) {
                nextState = STATE_MOTOR_STOP;
            } else if (event == EVENT_ERROR_OCCURRED) {
                nextState = STATE_ERROR;
            }
            break;
        
        case STATE_SENSING:
            if (event == EVENT_ERROR_OCCURRED) {
                nextState = STATE_ERROR;
            }
            break;
        
        case STATE_SERVO_TRIGGER:
            nextState = STATE_IDLE;
            break;
        
        case STATE_MOTOR_STOP:
            nextState = STATE_IDLE;
            break;
        
        case STATE_ERROR:
            if (event == EVENT_ERROR_OCCURRED) {
                nextState = STATE_ERROR;  // 保持在错误状态
            }
            break;
        
        default:
            nextState = STATE_ERROR;
            break;
    }
    
    return nextState;
}
