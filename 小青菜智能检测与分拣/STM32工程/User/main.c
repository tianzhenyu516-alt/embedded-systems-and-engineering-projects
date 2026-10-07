#include "stm32f10x.h"
#include "Delay.h"
#include "OLED.h"
#include "Servo.h"
#include "hx711.h"
#include "Relay.h"
#include "Servo2.h"
#include "Signal.h"

// 重量阈值设定（单位：克）
#define WEIGHT_THRESHOLD		10		// 触发动作的重量阈值改为10克

// 舵机旋转角度定义
#define SERVO_ROTATE_ANGLE		1260	// 旋转3圈半 = 1260度（逆时针）
#define SERVO_ROTATE_SPEED		300		// 旋转速度，范围0~500

// 全局变量
volatile uint8_t g_ActionTriggered = 0;
volatile uint8_t g_ServoActive = 0;
volatile uint8_t g_MotorStopped = 0;

// 获取HX711数据的平均值的函数
int32_t Get_Average_HX711_Data(uint8_t times) {
	int32_t sum = 0;
	for (int i = 0; i < times; i++) {
		sum += HX711_Get_Data();
		Delay_us(100);
	}
	return sum / times;
}

int main(void)
{
	int32_t value;
	float weight;
	float calibration_factor = 450.0f;
	int32_t zero_offset;
	int i;
	int32_t sum;

	// 系统初始化
	SystemInit();
	Delay_Init();
	OLED_Init();
	Servo_Init();
	Servo2_Init();   // 打印舵机初始化（PA11）
	HX711_Init();
	Relay_Init();    // 继电器初始化
	Signal_Init();   // PA5信号输入初始化

	// 初始化显示
	OLED_Clear();
	OLED_ShowString(1, 1, "Weight:");
	OLED_ShowString(2, 1, "000g");
	OLED_ShowString(3, 1, "Thr:");
	OLED_ShowNum(3, 6, WEIGHT_THRESHOLD, 3);
	OLED_ShowString(3, 9, "g");
	OLED_ShowString(3, 11, "PA4:");
	OLED_ShowString(4, 1, "Motor: RUN      ");

	// 零点校准
	OLED_ShowString(4, 1, "Calibrating...");
	sum = 0;
	for (i = 0; i < 50; i++) {
		value = HX711_Get_Data();
		sum += value;
		Delay_ms(5);
	}
	zero_offset = sum / 50;

	OLED_ShowString(4, 1, "Ready...        ");
	Delay_ms(1000);
	
	// 初始化舵机停止
	Servo_Stop();
	
	// 继电器默认高电平，电机转动
	Relay_On();
	OLED_ShowString(4, 1, "Motor: RUN      ");
	
	// 舵机1（推物舵机）单次动作状态机
	uint8_t servo1_step = 0;  // 0:空闲 1:推出去 2:等待 3:回来
	uint32_t servo1_delay = 0;
	
	// 舵机2（打印舵机）循环计数器
	uint32_t servo2_timer = 0;
	uint8_t servo2_state = 0;

	while (1) {
		// 检测PA5信号，高电平停止电机（带消抖）
		if (Signal_Detect() == 1 && !g_MotorStopped) {
			Delay_ms(50);  // 消抖延时
			if (Signal_Detect() == 1) {  // 确认信号稳定
				g_MotorStopped = 1;
				Relay_Off();  // 继电器断开，电机停止
				OLED_ShowString(4, 1, "Motor: STOP 6s  ");
				
				// 停止6秒
				Delay_ms(6000);
				
				// 重新启动电机
				Relay_On();
				OLED_ShowString(4, 1, "Motor: RUN      ");
				
				// 等待PA5信号释放（变为低电平）
				while (Signal_Detect() == 1) {
					Delay_ms(10);
				}
				Delay_ms(100);  // 额外消抖
				g_MotorStopped = 0;
			}
		}

		// 多次采样获取平均重量
		sum = 0;
		for (i = 0; i < 5; i++) {
			value = HX711_Get_Data();
			sum += value;
			Delay_us(100);
		}
		value = sum / 5;

		// 计算重量
		weight = (float)(value - zero_offset) / calibration_factor;

		// 限制重量范围
		if (weight > 10000.0f) {
			weight = 10000.0f;
		}
		if (weight < 0) {
			weight = 0.0f;
		}

		// 显示重量
		if (weight < 0) {
			OLED_ShowChar(2, 1, '-');
			OLED_ShowNum(2, 2, (uint32_t)(-weight), 5);
		} else {
			OLED_ShowChar(2, 1, ' ');
			OLED_ShowNum(2, 2, (uint32_t)weight, 5);
		}
		OLED_ShowChar(2, 7, 'g');
		
		// 显示PA4状态（调试）- 直接读取GPIOA的IDR寄存器
		uint16_t pa4_value = GPIO_ReadInputData(GPIOA) & GPIO_Pin_4;
		if (pa4_value) {
			OLED_ShowString(3, 15, "H");  // 高电平
		} else {
			OLED_ShowString(3, 15, "L");  // 低电平
		}

		// 检测是否达到10克阈值
		if (weight >= WEIGHT_THRESHOLD && !g_ActionTriggered) {
			g_ActionTriggered = 1;
			g_ServoActive = 1;  // 激活舵机
			servo1_step = 1;     // 舵机1开始单次动作
			OLED_ShowString(4, 1, "Servo Active!   ");
		}

		// 如果重量低于阈值，重置触发标志
		if (weight < WEIGHT_THRESHOLD - 5) {
			g_ActionTriggered = 0;
		}
		
		// 舵机1（推物舵机）单次动作状态机
		if (servo1_step > 0) {
			switch (servo1_step) {
				case 1:  // 推出去
					Servo_SetAngle(270);
					servo1_step = 2;
					servo1_delay = 0;
					break;
				case 2:  // 等待2秒
					servo1_delay++;
					if (servo1_delay >= 20) {  // 100ms * 20 = 2秒
						servo1_step = 3;
					}
					break;
				case 3:  // 回来
					Servo_SetAngle(0);
					servo1_step = 0;  // 完成，停止
					break;
			}
		}
		
		// 舵机2（打印舵机）循环控制 - 一直动
		if (g_ServoActive) {
			servo2_timer++;
			if (servo2_timer >= 50) {  // 100ms * 50 = 5秒
				servo2_timer = 0;
				servo2_state = !servo2_state;
				if (servo2_state) {
					Servo2_SetAngle(180);  // 转出去
				} else {
					Servo2_SetAngle(0);    // 回来
				}
			}
		}

		Delay_ms(100);
	}
}
