#include "sys.h"
/********************
①使能定时器时钟。
RCC_APB1PeriphClockCmd();
② 初始化定时器，配置ARR,PSC。
TIM_TimeBaseInit();
③定时器中断配置，同时配置NVIC。
void TIM_ITConfig();
NVIC_Init();
④使能定时器。
TIM_Cmd();
⑤编写中断服务函数。
TIMx_IRQHandler();
*****************/

void TIM4_Init(u16 arr,u16 psc)
{
	TIM_TimeBaseInitTypeDef TIM_TimeBaseStructure;
	
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM4,ENABLE);
	
	TIM_TimeBaseStructure.TIM_Period = arr;
	TIM_TimeBaseStructure.TIM_Prescaler = psc;
	TIM_TimeBaseStructure.TIM_ClockDivision = 0;
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInit(TIM4,&TIM_TimeBaseStructure);
	
	TIM_ITConfig(TIM4, TIM_IT_Update, ENABLE);
	
	TIM_ClearITPendingBit(TIM4,TIM_IT_Update); 

	TIM_Cmd(TIM4, DISABLE);
}

void TIM4_IRQHandler(void)
{
	if (TIM_GetITStatus(TIM4, TIM_IT_Update) != RESET)  
	{						
		memcpy(&mqtt_RxInPtr[2],USART2_RxBuff,USART2_RxCounter);  
		mqtt_RxInPtr[0] = USART2_RxCounter/256;                   
		mqtt_RxInPtr[1] = USART2_RxCounter%256;                   
		mqtt_RxInPtr+=400;                                  
		if(mqtt_RxInPtr==mqtt_RxEndPtr)                       
			mqtt_RxInPtr = mqtt_RxBuf[0]; 
		
		USART2_RxCounter = 0;                                         
		TIM_Cmd(TIM4, DISABLE);                        				 
		TIM_SetCounter(TIM4, 0);                        			  
		TIM_ClearITPendingBit(TIM4, TIM_IT_Update);  			
	}
	
}
