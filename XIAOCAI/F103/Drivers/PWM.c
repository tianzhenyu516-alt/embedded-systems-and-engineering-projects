#include "stm32f10x.h"

/**
  * 函    数：PWM初始化
  * 参    数：无
  * 返 回 值：无
  * 说    明：配置TIM2_CH2 (PA1)输出PWM，用于控制MG996R舵机
  *         周期20ms(50Hz)，脉宽范围0.5ms~2.5ms
  */
void PWM_Init(void)
{
	/*开启时钟*/
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);		//开启TIM2的时钟
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);		//开启GPIOA的时钟

	/*GPIO初始化*/
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_1;					// PA1用于MG996R舵机控制
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

	/*配置时钟源*/
	TIM_InternalClockConfig(TIM2);

	/*时基单元初始化*/
	TIM_TimeBaseInitTypeDef TIM_TimeBaseInitStructure;
	TIM_TimeBaseInitStructure.TIM_ClockDivision = TIM_CKD_DIV1;
	TIM_TimeBaseInitStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInitStructure.TIM_Period = 20000 - 1;			// ARR = 20000，周期20ms (50Hz)
	TIM_TimeBaseInitStructure.TIM_Prescaler = 72 - 1;			// PSC = 72，计数频率1MHz (1us/计数)
	TIM_TimeBaseInitStructure.TIM_RepetitionCounter = 0;
	TIM_TimeBaseInit(TIM2, &TIM_TimeBaseInitStructure);

	/*输出比较通道2初始化 - MG996R舵机*/
	TIM_OCInitTypeDef TIM_OCInitStructure;
	TIM_OCStructInit(&TIM_OCInitStructure);
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1;
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High;
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;
	TIM_OCInitStructure.TIM_Pulse = 1500;						// 初始1.5ms脉宽(停止状态)
	TIM_OC2Init(TIM2, &TIM_OCInitStructure);

	/*TIM使能*/
	TIM_Cmd(TIM2, ENABLE);
}

/**
  * 函    数：PWM设置CCR2
  * 参    数：Compare 要写入的CCR的值，范围：500~2500 (对应0.5ms~2.5ms)
  * 返 回 值：无
  */
void PWM_SetCompare2(uint16_t Compare)
{
	TIM_SetCompare2(TIM2, Compare);
}
