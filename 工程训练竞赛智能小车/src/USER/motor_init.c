#include "stm32f4xx.h"                  // Device header
#include "Motor_Init.h"  
#include "Motor.h"

//这个文件是存放电机初始化代码

//轮子电机GPIO口初始化
void MOTOR_GPIO_Init(void) 
{
	GPIO_InitTypeDef GPIO_InitStructure;
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOC, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOB, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOF, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOD, ENABLE);
	
	/* 步进电机驱动器：脉冲输出PA6 */
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_AF;	//复用输出
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_6 | GPIO_Pin_7 | GPIO_Pin_8 | GPIO_Pin_9; 
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOC, &GPIO_InitStructure);
	
	GPIO_PinAFConfig(GPIOC,GPIO_PinSource6,GPIO_AF_TIM3); 
  GPIO_PinAFConfig(GPIOC,GPIO_PinSource7,GPIO_AF_TIM3); 
	GPIO_PinAFConfig(GPIOC,GPIO_PinSource8,GPIO_AF_TIM3); 
  GPIO_PinAFConfig(GPIOC,GPIO_PinSource9,GPIO_AF_TIM3);
	/* 步进电机驱动器：方向控制 PB6*/
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_3 | GPIO_Pin_8 | GPIO_Pin_9;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOB, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_10 | GPIO_Pin_12;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOC, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_12| GPIO_Pin_13;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOD, &GPIO_InitStructure);
	
	GPIO_ResetBits(GPIOB, GPIO_Pin_3);
	
}

//轮子电机定时器初始化
void MOTOR_TIM_Init(void)
{
	TIM_TimeBaseInitTypeDef TIM_TimeBaseInitStructure;
	TIM_OCInitTypeDef TIM_OCInitStructure;
	NVIC_InitTypeDef NVIC_InitStructure;
	
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM3, ENABLE);
	
	TIM_InternalClockConfig(TIM3);
	
	TIM_TimeBaseInitStructure.TIM_ClockDivision = TIM_CKD_DIV1;			//时钟分频因子，数字滤波采样频率的参数
	TIM_TimeBaseInitStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInitStructure.TIM_Period = 65536-1;									//ARR
	TIM_TimeBaseInitStructure.TIM_Prescaler = TIM_PRESCALER;				//PSC
	TIM_TimeBaseInitStructure.TIM_RepetitionCounter = 0; 						//高级定时器功能
	TIM_TimeBaseInit(TIM3, &TIM_TimeBaseInitStructure);
		
	TIM_OCStructInit(&TIM_OCInitStructure);	
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_Toggle;  						//翻转模式
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High;
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;
	TIM_OCInitStructure.TIM_Pulse = 0;															//CCR 比较值
	TIM_OC1Init(TIM3, &TIM_OCInitStructure);
	TIM_OC1PreloadConfig(TIM3,TIM_OCPreload_Disable);    						//关闭预装载1
	TIM_CCxCmd(TIM3,TIM_Channel_1,TIM_CCx_Disable);
	TIM_OC2Init(TIM3, &TIM_OCInitStructure);
	TIM_OC2PreloadConfig(TIM3,TIM_OCPreload_Disable);    						//关闭预装载2
	TIM_CCxCmd(TIM3,TIM_Channel_2,TIM_CCx_Disable);
	TIM_OC3Init(TIM3, &TIM_OCInitStructure);
	TIM_OC3PreloadConfig(TIM3,TIM_OCPreload_Disable);    						//关闭预装载3
	TIM_CCxCmd(TIM3,TIM_Channel_3,TIM_CCx_Disable);
	TIM_OC4Init(TIM3, &TIM_OCInitStructure);
	TIM_OC4PreloadConfig(TIM3,TIM_OCPreload_Disable);    						//关闭预装载4
	TIM_CCxCmd(TIM3,TIM_Channel_4,TIM_CCx_Disable);
	
	TIM_ClearFlag(TIM3,TIM_FLAG_CC1);																//清除定时器3的通道1的标志位
	TIM_ITConfig(TIM3,TIM_IT_CC1,ENABLE);														//开启定时器3的通道1中断

	TIM_ClearFlag(TIM3,TIM_FLAG_CC2);																//清除定时器3的通道2的标志位
	TIM_ITConfig(TIM3,TIM_IT_CC2,ENABLE);														//开启定时器3的通道2中断

	TIM_ClearFlag(TIM3,TIM_FLAG_CC3);																//清除定时器3的通道3的标志位
	TIM_ITConfig(TIM3,TIM_IT_CC3,ENABLE);														//开启定时器3的通道3中断

	TIM_ClearFlag(TIM3,TIM_FLAG_CC4);																//清除定时器3的通道4的标志位
	TIM_ITConfig(TIM3,TIM_IT_CC4,ENABLE);														//开启定时器3的通道4中断

	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);									//分组
	
	NVIC_InitStructure.NVIC_IRQChannel = TIM3_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 0;
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 0;
	NVIC_Init(&NVIC_InitStructure);
}




//电机丝杆GPIO口初始化
void SIGAN_GPIO_Init(void) 
{
	GPIO_InitTypeDef GPIO_InitStructure;
	
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOA, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOC, ENABLE);	//开启PB端口时钟
	
	/* 步进电机驱动器：脉冲输出PA6 */
	
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_AF;						//复用输出
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;					//复用输出
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_1;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);
	
	GPIO_PinAFConfig(GPIOA,GPIO_PinSource1,GPIO_AF_TIM2);
	
	/* 步进电机驱动器：方向控制 C2*/
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_2;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOC, &GPIO_InitStructure);
	
	 /* 步进电机驱动器：使能控制C0 */
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType=GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin=GPIO_Pin_0;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOC, &GPIO_InitStructure);
	
	GPIO_ResetBits(GPIOC, GPIO_Pin_0);
	
}

//丝杆电机定时器初始化
void SIGAN_TIM_Init(void)
{
	NVIC_InitTypeDef NVIC_InitStructure;
	TIM_TimeBaseInitTypeDef TIM_TimeBaseInitStructure;
	TIM_OCInitTypeDef TIM_OCInitStructure;	
	TIM_OCStructInit(&TIM_OCInitStructure);

	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);
	
	TIM_InternalClockConfig(TIM2);
	
	TIM_TimeBaseInitStructure.TIM_ClockDivision = TIM_CKD_DIV1;			//时钟分频因子，数字滤波采样频率的参数
	TIM_TimeBaseInitStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInitStructure.TIM_Period = 65536-1;									//ARR
	TIM_TimeBaseInitStructure.TIM_Prescaler = TIM_PRESCALER;				//PSC
	TIM_TimeBaseInitStructure.TIM_RepetitionCounter = 0; 						//高级定时器功能
	TIM_TimeBaseInit(TIM2, &TIM_TimeBaseInitStructure);
		
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_Toggle;  						//翻转模式
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High;
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;
	TIM_OCInitStructure.TIM_Pulse = 0;															//CCR 比较值
	TIM_OC2Init(TIM2, &TIM_OCInitStructure);
	TIM_OC2PreloadConfig(TIM2,TIM_OCPreload_Disable);    						//关闭预装载
	TIM_CCxCmd(TIM2,TIM_Channel_2,TIM_CCx_Disable);
	
	TIM_ClearFlag(TIM2,TIM_FLAG_CC2);																//清除定时器3的通道1的标志位
	TIM_ITConfig(TIM2,TIM_IT_CC2,ENABLE);														//开启定时器3的通道1中断
	
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);									//分组
	
	NVIC_InitStructure.NVIC_IRQChannel = TIM2_IRQn;
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 0;
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 0;
	NVIC_Init(&NVIC_InitStructure);
	
}









