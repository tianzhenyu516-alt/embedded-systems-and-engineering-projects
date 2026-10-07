#include "sys.h"
 
/******************   	  
功能：高级定时器1中断初始化,这里时钟选择为APB2
参数：arr：自动重装值。
			psc：时钟预分频数
返回值：无
******************/
void TIM1_Int_Init(u16 arr,u16 psc)
{  
 
	TIM_TimeBaseInitTypeDef  TIM_TimeBaseStructure;
	NVIC_InitTypeDef NVIC_InitStructure;
 
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_TIM1, ENABLE);	//使能定时器1时钟
 
   //初始化TIM1
	TIM_TimeBaseStructure.TIM_Period = arr; //设置在下一个更新事件装入活动的自动重装载寄存器周期的值
	TIM_TimeBaseStructure.TIM_Prescaler =psc; //设置用来作为TIMx时钟频率除数的预分频值 
	TIM_TimeBaseStructure.TIM_ClockDivision = TIM_CKD_DIV1; //设置时钟分割:TDTS = Tck_tim
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;  //TIM向上计数模式
	TIM_TimeBaseInit(TIM1, &TIM_TimeBaseStructure); //根据TIM_TimeBaseInitStruct中指定的参数初始化TIMx的时间基数单位
	
	TIM_TimeBaseInit(TIM1, &TIM_TimeBaseStructure); //参数初始化
  TIM_ClearFlag(TIM1, TIM_FLAG_Update);//清中断标志位
	TIM_ITConfig(TIM1, TIM_IT_Update|TIM_IT_Trigger,ENABLE ); //使能指定的TIM1中断,允许更新中断 允许触发中断源 
	
	//中断优先级NVIC设置
	NVIC_InitStructure.NVIC_IRQChannel = TIM1_UP_IRQn;  //TIM1中断
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 2;  //先占优先级0级
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 2;  //从优先级3级
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE; //IRQ通道被使能
	NVIC_Init(&NVIC_InitStructure);  //初始化NVIC寄存器
 
	TIM_Cmd(TIM1, ENABLE);  //使能TIM1	
 
}
 
//定时器1中断服务程序
void TIM1_UP_IRQHandler(void)   //TIM1中断
{  	     
	if(TIM_GetITStatus(TIM1, TIM_IT_Update) != RESET)//检查指定的TIM中断发生与否:TIM 中断源 
	{
		//应用代码编写区		
		TIM_ClearITPendingBit(TIM1, TIM_IT_Update);//清除TIMx的中断待处理位:TIM 中断源 
	}	     
}

/*
 *==============================================================================
功能：TIM1 PWM部分初始化，初始化引脚使其输出PWM信号
参数：arr：自动重装值
			psc：时钟预分频数
			ch: 定时器通道号 范围：1--4
			RCC_APB2Periph: APB2对应的gpio端口号 如：RCC_APB2Periph_GPIOB，RCC_APB2Periph_GPIOC
			GPIOx: GPIO端口 如GPIOA
			GPIO_Pin：GPIO号 如GPIO_Pin_8
返回值：无
应用示例：TIM1_PWM_Init(4999,7199,1,RCC_APB2Periph_GPIOA,GPIOA,GPIO_Pin_8);
 *==============================================================================
 */

void TIM1_PWM_Init(u16 arr,u16 psc,u8 ch,uint32_t RCC_APB2Periph,GPIO_TypeDef* GPIOx,uint16_t GPIO_Pinx)
{  
	GPIO_InitTypeDef GPIO_InitStructure;
	TIM_TimeBaseInitTypeDef  TIM_TimeBaseStructure;
	TIM_OCInitTypeDef  TIM_OCInitStructure;

	RCC_APB2PeriphClockCmd(RCC_APB2Periph_TIM1 | RCC_APB2Periph, ENABLE);	//使能定时器1时钟
	
 
   //设置该引脚为复用输出功能,输出TIM2 CH1的PWM脉冲波形	GPIOA.0
	GPIO_InitStructure.GPIO_Pin = GPIO_Pinx; //TIM_CH1  TIM_CH2
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;  //推挽输出
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOx, &GPIO_InitStructure);//初始化GPIO
 
   //初始化TIM2
	TIM_TimeBaseStructure.TIM_Period = arr; //设置在下一个更新事件装入活动的自动重装载寄存器周期的值
	TIM_TimeBaseStructure.TIM_Prescaler =psc; //设置用来作为TIMx时钟频率除数的预分频值 
	TIM_TimeBaseStructure.TIM_ClockDivision = 0; //设置时钟分割:TDTS = Tck_tim
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;  //TIM向上计数模式
	TIM_TimeBaseInit(TIM1, &TIM_TimeBaseStructure); //根据TIM_TimeBaseInitStruct中指定的参数初始化TIMx的时间基数单位
	
	//初始化TIM Channel 1-4 PWM模式	 
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1; //选择定时器模式:TIM脉冲宽度调制模式1
 	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable; //比较输出使能
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High; //输出极性:TIM输出比较极性高
	if(ch==1)
	{
		TIM_OC1Init(TIM1, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM1 OC1
		TIM_OC1PreloadConfig(TIM1, TIM_OCPreload_Enable);  //使能TIM1_CH1上的预装载寄存器
	}
	else if(ch==2)
	{
		TIM_OC2Init(TIM1, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM1 OC1
		TIM_OC2PreloadConfig(TIM1, TIM_OCPreload_Enable);  //使能TIM1_CH1上的预装载寄存器
	}
	else if(ch==3)
	{
		TIM_OC3Init(TIM1, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM1 OC1
		TIM_OC3PreloadConfig(TIM1, TIM_OCPreload_Enable);  //使能TIM1_CH1上的预装载寄存器
	}
	else if(ch==4)
	{
		TIM_OC4Init(TIM1, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM1 OC1
		TIM_OC4PreloadConfig(TIM1, TIM_OCPreload_Enable);  //使能TIM1_CH1上的预装载寄存器
	}
 
	TIM_Cmd(TIM1, ENABLE);  //使能TIM1
	TIM_ARRPreloadConfig(TIM1, ENABLE); //使能TIMx在ARR上的预装载寄存器
	TIM_CtrlPWMOutputs(TIM1,ENABLE);        //MOE 主输出使能,高级定时器必须开启这个
 
}

