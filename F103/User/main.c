/**
 * @file main.c
 * @brief 智能检测系统主程序 - 升级版
 * @author Skylar Team
 * @version 2.0
 */

#include "stm32f10x.h"
#include "Delay.h"
#include "OLED.h"
#include "Servo.h"
#include "hx711.h"
#include "Relay.h"
#include "Servo2.h"
#include "Signal.h"

// 核心模块
#include "config.h"
#include "error.h"
#include "state_machine.h"
#include "data_manager.h"

// ==========================================
// 全局变量 - 系统控制状态
// ==========================================

typedef struct {
    uint8_t servo1Step;
    uint32_t servo1Timer;
    uint8_t servo2State;
    uint32_t servo2Timer;
    uint8_t servoActive;
    uint8_t motorStopped;
    uint32_t motorStopTimer;
    uint8_t weightTriggered;
    uint32_t systemTick;
} SystemControl;

static SystemControl g_sys;

// ==========================================
// 函数声明
// ==========================================

static void System_InitHardware(void);
static void System_UpdateDisplay(void);
static void System_ProcessState(void);
static void System_HandleServo1(void);
static void System_HandleServo2(void);
static void System_HandleSignal(void);
static void System_HandleWeight(void);

// ==========================================
// 主函数
// ==========================================

int main(void)
{
    // 系统初始化
    System_InitHardware();
    Error_Init();
    DataManager_Init();
    StateMachine_Init();
    
    // 初始化系统控制状态
    g_sys.servo1Step = 0;
    g_sys.servo1Timer = 0;
    g_sys.servo2State = 0;
    g_sys.servo2Timer = 0;
    g_sys.servoActive = 0;
    g_sys.motorStopped = 0;
    g_sys.motorStopTimer = 0;
    g_sys.weightTriggered = 0;
    g_sys.systemTick = 0;
    
    // OLED 初始显示
    OLED_Clear();
    OLED_ShowString(1, 1, "Skylar 516 v2.0");
    OLED_ShowString(2, 1, "Initializing...");
    Delay_ms(1000);
    
    // 执行零点校准
    OLED_Clear();
    OLED_ShowString(1, 1, "Calibrating...");
    OLED_ShowString(2, 1, "Wait 50 samples");
    DataManager_CalibrateZero();
    Delay_ms(1000);
    
    // 初始化完成，启动主循环
    OLED_Clear();
    OLED_ShowString(1, 1, "Weight:");
    OLED_ShowString(2, 1, "000g");
    OLED_ShowString(3, 1, "Thr:");
    OLED_ShowNum(3, 6, HX711_WEIGHT_THRESHOLD, 3);
    OLED_ShowString(3, 9, "g");
    OLED_ShowString(4, 1, "Motor: RUN");
    
    // 继电器默认打开（电机运行）
    Relay_On();
    
    // 主循环
    while (1) {
        // 更新系统时钟
        g_sys.systemTick++;
        
        // 1. 采集传感器数据
        DataManager_CollectData();
        
        // 2. 更新状态机
        StateMachine_Update();
        
        // 3. 处理业务逻辑
        System_ProcessState();
        
        // 4. 更新显示
        System_UpdateDisplay();
        
        // 5. 系统主循环延时
        Delay_ms(SYSTEM_TICK_INTERVAL);
    }
}

// ==========================================
// 内部函数实现
// ==========================================

static void System_InitHardware(void)
{
    SystemInit();
    Delay_Init();
    OLED_Init();
    Servo_Init();
    Servo2_Init();
    HX711_Init();
    Relay_Init();
    Signal_Init();
    
    // 舵机归位
    Servo_Stop();
    Servo_SetAngle(0);
    Servo2_SetAngle(0);
}

static void System_UpdateDisplay(void)
{
    const SensorState* sensor = DataManager_GetSensorState();
    float weight = sensor->weight;
    
    // 显示重量
    if (weight < 0) {
        OLED_ShowChar(2, 1, '-');
        OLED_ShowNum(2, 2, (uint32_t)(-weight), 5);
    } else {
        OLED_ShowChar(2, 1, ' ');
        OLED_ShowNum(2, 2, (uint32_t)weight, 5);
    }
    OLED_ShowChar(2, 7, 'g');
    
    // 显示状态
    const char* stateName = StateMachine_GetStateName(StateMachine_GetCurrent());
    OLED_ShowString(1, 11, (char*)stateName);
    
    // 显示PA4状态
    uint16_t pa4 = GPIO_ReadInputData(GPIOA) & GPIO_Pin_4;
    if (pa4) {
        OLED_ShowString(3, 15, "H");
    } else {
        OLED_ShowString(3, 15, "L");
    }
}

static void System_ProcessState(void)
{
    System_HandleWeight();
    System_HandleSignal();
    System_HandleServo1();
    System_HandleServo2();
}

static void System_HandleServo1(void)
{
    if (g_sys.servo1Step == 0) {
        return;
    }
    
    switch (g_sys.servo1Step) {
        case 1:
            Servo_SetAngle(SERVO1_PUSH_ANGLE);
            g_sys.servo1Step = 2;
            g_sys.servo1Timer = 0;
            break;
        
        case 2:
            g_sys.servo1Timer++;
            if (g_sys.servo1Timer >= (SERVO1_DELAY_MS / SYSTEM_TICK_INTERVAL)) {
                g_sys.servo1Step = 3;
            }
            break;
        
        case 3:
            Servo_SetAngle(SERVO1_PULL_ANGLE);
            g_sys.servo1Step = 0;
            break;
    }
}

static void System_HandleServo2(void)
{
    if (!g_sys.servoActive) {
        return;
    }
    
    g_sys.servo2Timer++;
    if (g_sys.servo2Timer >= (SERVO2_LOOP_INTERVAL / SYSTEM_TICK_INTERVAL)) {
        g_sys.servo2Timer = 0;
        g_sys.servo2State = !g_sys.servo2State;
        
        if (g_sys.servo2State) {
            Servo2_SetAngle(SERVO2_ANGLE_MAX);
        } else {
            Servo2_SetAngle(SERVO2_ANGLE_MIN);
        }
    }
}

static void System_HandleSignal(void)
{
    if (Signal_Detect() == 1 && !g_sys.motorStopped) {
        Delay_ms(SIGNAL_DEBOUNCE_MS);
        
        if (Signal_Detect() == 1) {
            g_sys.motorStopped = 1;
            g_sys.motorStopTimer = 0;
            Relay_Off();
            OLED_ShowString(4, 1, "Motor: STOP");
            
            StateMachine_TriggerEvent(EVENT_SIGNAL_TRIGGER);
        }
    }
    
    if (g_sys.motorStopped) {
        g_sys.motorStopTimer++;
        
        if (g_sys.motorStopTimer >= (SIGNAL_STOP_DURATION_MS / SYSTEM_TICK_INTERVAL)) {
            Relay_On();
            OLED_ShowString(4, 1, "Motor: RUN");
            
            while (Signal_Detect() == 1) {
                Delay_ms(10);
            }
            Delay_ms(100);
            
            g_sys.motorStopped = 0;
        }
    }
}

static void System_HandleWeight(void)
{
    const SensorState* sensor = DataManager_GetSensorState();
    
    // 检测重量阈值
    if (sensor->weight >= HX711_WEIGHT_THRESHOLD && !g_sys.weightTriggered) {
        g_sys.weightTriggered = 1;
        g_sys.servoActive = 1;
        g_sys.servo1Step = 1;
        OLED_ShowString(4, 1, "Servo Active!");
        StateMachine_TriggerEvent(EVENT_WEIGHT_TRIGGER);
    }
    
    // 回差重置
    if (sensor->weight < HX711_WEIGHT_THRESHOLD - HX711_HYSTERESIS) {
        g_sys.weightTriggered = 0;
    }
}
