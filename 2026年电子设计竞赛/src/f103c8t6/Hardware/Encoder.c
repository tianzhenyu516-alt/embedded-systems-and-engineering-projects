#include "stm32f10x.h"                  // Device header
#include "Encoder.h"

void Encoder_Init(Encoder* encoder)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	TIM_TimeBaseInitTypeDef TIM_TimerStructure;
	TIM_ICInitTypeDef  TIM_InitStructure;
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM3,ENABLE);
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2,ENABLE);
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA,ENABLE);
	
	
	GPIO_InitStructure.GPIO_Mode =GPIO_Mode_IPU;        //上拉输入
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_6 | GPIO_Pin_7| GPIO_Pin_0| GPIO_Pin_1;
	GPIO_InitStructure.GPIO_Speed =GPIO_Speed_50MHz ;
	GPIO_Init(GPIOA,&GPIO_InitStructure);

	TIM_TimerStructure.TIM_ClockDivision = TIM_CKD_DIV1;        //指定时钟分频，TIM_CKD_DIV1为1分频
	TIM_TimerStructure.TIM_CounterMode = TIM_CounterMode_Up;    //配置计数器模式
	TIM_TimerStructure.TIM_Period = 65536 - 1;					//ARR自动重装器的事件周期
	TIM_TimerStructure.TIM_Prescaler = 1 - 1;                //PSC预分频器的值     CNT计数器和预分频器PSC有一个值的偏差
	TIM_TimerStructure.TIM_RepetitionCounter = 0;               //配置高级计时器时用
	TIM_TimeBaseInit(TIM3,&TIM_TimerStructure);                 //初始化时基单元
	TIM_TimeBaseInit(TIM2,&TIM_TimerStructure);                 //初始化时基单元


	TIM_ICStructInit(&TIM_InitStructure);	
	TIM_InitStructure.TIM_Channel = TIM_Channel_1;           		//选择输入捕获通道一
	TIM_InitStructure.TIM_ICFilter = 0xF;                    		//滤波
	TIM_ICInit(TIM3,&TIM_InitStructure);
	
	TIM_ICStructInit(&TIM_InitStructure);
	TIM_InitStructure.TIM_Channel = TIM_Channel_2;           		//选择输入捕获通道二
	TIM_InitStructure.TIM_ICFilter = 0xF;                    		//滤波
	TIM_ICInit(TIM3,&TIM_InitStructure);	

	TIM_EncoderInterfaceConfig(TIM3,TIM_EncoderMode_TI12,TIM_ICPolarity_Rising,TIM_ICPolarity_Rising);
	
	TIM_ICStructInit(&TIM_InitStructure);
	TIM_InitStructure.TIM_Channel = TIM_Channel_1;           		//选择输入捕获通道一
	TIM_InitStructure.TIM_ICFilter = 0xF;                    		//滤波
	TIM_ICInit(TIM2,&TIM_InitStructure);	
	
	TIM_ICStructInit(&TIM_InitStructure);
	TIM_InitStructure.TIM_Channel = TIM_Channel_2;           		//选择输入捕获通道二
	TIM_InitStructure.TIM_ICFilter = 0xF;                    		//滤波
	TIM_ICInit(TIM2,&TIM_InitStructure);
	
	TIM_EncoderInterfaceConfig(TIM2,TIM_EncoderMode_TI12,TIM_ICPolarity_Rising,TIM_ICPolarity_Rising);
	
	TIM_Cmd(TIM3,ENABLE);
	TIM_Cmd(TIM2,ENABLE);
	
	encoder->param.ppr = 0;
	encoder->param.r = 0;
	encoder->param.reduction_ratio = 0;
}

void Get_Encoder(Encoder *encoder)
{
	int16_t count = 0;
	count = TIM_GetCounter(TIM3);
	encoder->Counter_Left = +count;
	count = TIM_GetCounter(TIM2);
	encoder->Counter_Right = -count;
	TIM_SetCounter(TIM2,0);
	TIM_SetCounter(TIM3,0);
}
