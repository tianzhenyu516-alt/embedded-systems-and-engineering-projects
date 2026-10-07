#include "stm32f10x.h"
#include "Delay.h"

// PA11 - TIM1_CH4 用于第二个舵机（打印装置）

/**
  * 函    数：打印舵机PWM初始化
  * 参    数：无
  * 返 回 值：无
  * 说    明：配置TIM1_CH4 (PA11)输出PWM，周期20ms(50Hz)
  */
void Servo2_Init(void)
{
	/*开启时钟*/
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_TIM1, ENABLE);		//开启TIM1的时钟
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);		//开启GPIOA的时钟
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO, ENABLE);		//开启AFIO时钟

	/*GPIO初始化 - PA11*/
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_11;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

	/*配置时钟源*/
	TIM_InternalClockConfig(TIM1);

	/*时基单元初始化*/
	TIM_TimeBaseInitTypeDef TIM_TimeBaseInitStructure;
	TIM_TimeBaseInitStructure.TIM_ClockDivision = TIM_CKD_DIV1;
	TIM_TimeBaseInitStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInitStructure.TIM_Period = 20000 - 1;			// ARR = 20000，周期20ms
	TIM_TimeBaseInitStructure.TIM_Prescaler = 72 - 1;			// PSC = 72，计数频率1MHz
	TIM_TimeBaseInitStructure.TIM_RepetitionCounter = 0;
	TIM_TimeBaseInit(TIM1, &TIM_TimeBaseInitStructure);

	/*输出比较通道4初始化*/
	TIM_OCInitTypeDef TIM_OCInitStructure;
	TIM_OCStructInit(&TIM_OCInitStructure);
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1;
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High;
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;
	TIM_OCInitStructure.TIM_Pulse = 500;						// 初始0.5ms脉宽(0度)
	TIM_OC4Init(TIM1, &TIM_OCInitStructure);

	/*TIM使能*/
	TIM_Cmd(TIM1, ENABLE);
	
	// 高级定时器需要使能主输出
	TIM_CtrlPWMOutputs(TIM1, ENABLE);
}

/**
  * 函    数：打印舵机设置角度
  * 参    数：angle 角度值，范围：0~270
  * 返 回 值：无
  * 说    明：270度舵机，脉宽500~2500us对应0~270度
  */
void Servo2_SetAngle(uint16_t angle)
{
	// 限制最大270度
	if (angle > 270) angle = 270;
	
	// 脉宽计算：500us = 0度, 2500us = 270度
	// 每度 = (2500-500)/270 = 7.407us
	uint16_t pulse = 500 + (uint16_t)(angle * 7.407f);
	
	TIM_SetCompare4(TIM1, pulse);
}

/**
  * 函    数：打印舵机循环任务
  * 参    数：无
  * 返 回 值：无
  * 说    明：转5秒 -> 停5秒 -> 回来5秒 -> 停5秒，循环
  */
void Servo2_Loop(void)
{
	static uint8_t state = 0;
	static uint32_t lastTime = 0;
	uint32_t currentTime = 0;
	
	// 简单的状态机，每5秒切换一次状态
	// 这里用简单的延时实现
	
	// 转到270度
	Servo2_SetAngle(270);
	Delay_ms(5000);		// 转动并停留5秒
	
	// 回到0度
	Servo2_SetAngle(0);
	Delay_ms(5000);		// 转动并停留5秒
}

/**
  * 函    数：打印舵机单次动作
  * 参    数：无
  * 返 回 值：无
  * 说    明：转出去5秒，停5秒，回来5秒，停5秒
  */
void Servo2_DoCycle(void)
{
	// 转出去（假设转到180度）
	Servo2_SetAngle(180);
	Delay_ms(5000);		// 停留5秒
	
	// 回来
	Servo2_SetAngle(0);
	Delay_ms(5000);		// 停留5秒
}
