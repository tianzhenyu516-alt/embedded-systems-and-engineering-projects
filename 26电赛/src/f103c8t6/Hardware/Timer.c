#include "stm32f10x.h"                  // Device header

volatile uint8_t timer_1khz_flag = 0;	//1kHz标志位，主循环检查并清零
volatile uint32_t g_tick_ms = 0;		//1kHz毫秒计数（中断内自增，计时基准）

static void TIM4_Init(void)
{
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM4,ENABLE);

	TIM_TimeBaseInitTypeDef TIM_TimerStructure;
	/* 72MHz / 72 = 1MHz, ARR=999 → 1kHz中断（计时基准） */
	TIM_TimerStructure.TIM_ClockDivision = TIM_CKD_DIV1;
	TIM_TimerStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimerStructure.TIM_Period = 1000 - 1;		//ARR=999
	TIM_TimerStructure.TIM_Prescaler = 72 - 1;		//PSC=71
	TIM_TimerStructure.TIM_RepetitionCounter = 0;
	TIM_TimeBaseInit(TIM4,&TIM_TimerStructure);

	TIM_ClearFlag(TIM4,TIM_FLAG_Update);
	TIM_ITConfig(TIM4,TIM_IT_Update,ENABLE);

	NVIC_InitTypeDef NVIC_InitStructure;
	NVIC_InitStructure.NVIC_IRQChannel = TIM4_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 2;
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 0;
	NVIC_Init(&NVIC_InitStructure);

	TIM_Cmd(TIM4,ENABLE);
}

/* TIM4中断服务函数：1kHz计时基准 */
void TIM4_IRQHandler(void)
{
	if(TIM_GetITStatus(TIM4,TIM_IT_Update) != RESET)
	{
		TIM_ClearITPendingBit(TIM4,TIM_IT_Update);
		timer_1khz_flag = 1;
		g_tick_ms++;
	}
}

void Timer_Init(void)
{
	TIM4_Init();
}
