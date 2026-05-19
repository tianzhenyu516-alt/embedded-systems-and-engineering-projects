#include "stm32f10x.h"
#include "PWM.h"
#include "Delay.h"

// 全局变量记录当前角度位置
static uint16_t g_CurrentAngle = 0;

/**
  * 函    数：舵机设置角度位置
  * 参    数：angle 角度值，范围：0~270
  * 返 回 值：无
  * 说    明：标准270度舵机，脉宽500~2500us对应0~270度
  */
void Servo_SetAngle(uint16_t angle)
{
	// 限制最大270度
	if (angle > 270) angle = 270;
	
	// 记录当前角度
	g_CurrentAngle = angle;
	
	// 脉宽计算：500us = 0度, 2500us = 270度
	// 每度 = (2500-500)/270 = 7.407us
	uint16_t pulse = 500 + (uint16_t)(angle * 7.407f);
	
	PWM_SetCompare2(pulse);
}

/**
  * 函    数：舵机停止
  * 参    数：无
  * 返 回 值：无
  * 说    明：舵机停止在当前位置
  */
void Servo_Stop(void)
{
	// 保持当前脉宽
}

/**
  * 函    数：舵机初始化
  * 参    数：无
  * 返 回 值：无
  * 说    明：使用TIM2_CH2 (PA1)控制舵机
  */
void Servo_Init(void)
{
	PWM_Init();
	Delay_ms(100);  // 等待PWM稳定
	g_CurrentAngle = 0;
	Servo_SetAngle(0);  // 初始位置0度
	Delay_ms(500);  // 等待舵机到位
}

/**
  * 函    数：舵机正转（不使用）
  * 参    数：speed 速度值
  * 返 回 值：无
  */
void Servo_RotateForward(uint16_t speed)
{
	Servo_SetAngle(270);
}

/**
  * 函    数：舵机反转（不使用）
  * 参    数：speed 速度值
  * 返 回 值：无
  */
void Servo_RotateBackward(uint16_t speed)
{
	Servo_SetAngle(0);
}

/**
  * 函    数：舵机旋转指定角度
  * 参    数：degrees 旋转角度，正数正转，负数反转
  *         speed 速度值（未使用，保持兼容）
  * 返 回 值：无
  * 说    明：舵机旋转到目标角度
  */
void Servo_RotateDegrees(int16_t degrees, uint16_t speed)
{
	int32_t target_angle;
	
	if (degrees >= 0) {
		// 正转：增加角度
		target_angle = (int32_t)g_CurrentAngle + degrees;
		if (target_angle > 270) target_angle = 270;
		Servo_SetAngle((uint16_t)target_angle);
	} else {
		// 反转：减小角度
		target_angle = (int32_t)g_CurrentAngle + degrees;
		if (target_angle < 0) target_angle = 0;
		Servo_SetAngle((uint16_t)target_angle);
	}
	
	// 等待时间：每度约4ms
	uint32_t delay_ms = ((uint32_t)(degrees >= 0 ? degrees : -degrees)) * 4 + 200;
	Delay_ms(delay_ms);
}

/**
  * 函    数：舵机来回摆动
  * 参    数：angle 摆动角度
  *         times 摆动次数
  * 返 回 值：无
  * 说    明：从当前位置转angle度，再返回，中间不停顿
  */
void Servo_Swing(uint16_t angle, uint8_t times)
{
	uint8_t i;
	uint32_t delay_ms;
	
	for (i = 0; i < times; i++) {
		// 正转angle度
		Servo_SetAngle(angle);
		delay_ms = (uint32_t)angle * 4 + 200;
		Delay_ms(delay_ms);
		
		// 反转回0度（不停顿，直接转）
		Servo_SetAngle(0);
		Delay_ms(delay_ms);
	}
}
