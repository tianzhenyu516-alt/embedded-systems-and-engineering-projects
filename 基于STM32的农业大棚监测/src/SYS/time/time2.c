#include "sys.h"
#include "usart3.h"
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
uint8_t Tim2Count=0;
extern u8 mqttflag;//MQTT消息发布标志
void TIM2_Init(u32 arr,u32 psc)
{
	TIM_TimeBaseInitTypeDef TIM_TimeBaseStructure;

	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2,ENABLE);
	
	TIM_TimeBaseStructure.TIM_Period = arr;
	TIM_TimeBaseStructure.TIM_Prescaler = psc;
	TIM_TimeBaseStructure.TIM_ClockDivision = 0;
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInit(TIM2,&TIM_TimeBaseStructure);
	
	TIM_ITConfig(TIM2, TIM_IT_Update, ENABLE);		
	TIM_Cmd(TIM2, ENABLE);
}


void TIM2_IRQHandler(void)
{
	if (TIM_GetITStatus(TIM2, TIM_IT_Update) != RESET)  
	{		
        KeyScan();//按键扫描
        if(!System.mqttflag)
        {
           Tim2Count++;
            if(Tim2Count>=30)
            {
                Tim2Count=0;
                System.mqttflag=1;
            }
        }
		TIM_ClearITPendingBit(TIM2, TIM_IT_Update); 					
	}

}

/*
 *==============================================================================
功能：TIM2 PWM部分初始化，初始化引脚使其输出PWM信号
参数：arr：自动重装值
			psc：时钟预分频数
			ch: 定时器通道号 范围：1--4
			RCC_APB2Periph: APB2对应的gpio端口号 如：RCC_APB2Periph_GPIOA，RCC_APB2Periph_GPIOC
			GPIOx: GPIO端口 如GPIOA
			GPIO_Pin：GPIO号 如GPIO_Pin_2
返回值：无
应用示例：TIM2_PWM_Init(4999,7199,3,RCC_APB2Periph_GPIOB,GPIOB,GPIO_Pin_2);

注意！！！
1.当不使用重映射时，默认TIM2四个的IO口是PA0、PA1、PA2、PA3

2.要使用PA15、PB3、PA2、PA3的端口组合，要调用下面的语句进行部分重映射：
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO, ENABLE);   //重映射必须要开AFIO时钟
  GPIO_PinRemapConfig(GPIO_PartialRemap1_TIM2, ENABLE);

3.要使用PA0、PA1、PB10、PB11的端口组合，要调用下面的语句进行部分重映射：
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO, ENABLE);   //重映射必须要开AFIO时钟
  GPIO_PinRemapConfig(GPIO_PartialRemap2_TIM2, ENABLE);

4.要使用PA15、PB3、PB10、PB11的端口组合，要调用下面的语句进行完全重映射：
  RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO, ENABLE);   //重映射必须要开AFIO时钟
  GPIO_PinRemapConfig(GPIO_FullRemap_TIM2, ENABLE);
  GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable , ENABLE);	//禁止JTAG功能，把PB3，PB4作为普通IO口使用
同时还要禁用JTAG功能，PA15、PB3、PB10、PB11才会正常输出。
 *==============================================================================
 */
void TIM2_PWM_Init(u16 arr,u16 psc,u8 ch,uint32_t RCC_APB2Periph,GPIO_TypeDef* GPIOx,uint16_t GPIO_Pinx)
{  
	GPIO_InitTypeDef GPIO_InitStructure;
	TIM_TimeBaseInitTypeDef  TIM_TimeBaseStructure;
	TIM_OCInitTypeDef  TIM_OCInitStructure;
	

	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);	//使能定时器3时钟
 	RCC_APB2PeriphClockCmd(RCC_APB2Periph | RCC_APB2Periph_AFIO, ENABLE);  //使能GPIO外设和AFIO复用功能模块时钟
	
	GPIO_PinRemapConfig(GPIO_PartialRemap2_TIM2, ENABLE); //Timer3部分重映射  TIM2_CH2->PB5 
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO, ENABLE);   //重映射必须要开AFIO时钟
//    GPIO_PinRemapConfig(GPIO_FullRemap_TIM2, ENABLE);
//    GPIO_PinRemapConfig(GPIO_Remap_SWJ_JTAGDisable , ENABLE);	//禁止JTAG功能，把PB3，PB4作为普通IO口使用
 
   //设置该引脚为复用输出功能,输出TIM2 CH2的PWM脉冲波形
	GPIO_InitStructure.GPIO_Pin = GPIO_Pinx; //TIM_CH2
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;  //复用推挽输出
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOx, &GPIO_InitStructure);//初始化GPIO
 
   //初始化TIM2
	TIM_TimeBaseStructure.TIM_Period = arr; //设置在下一个更新事件装入活动的自动重装载寄存器周期的值
	TIM_TimeBaseStructure.TIM_Prescaler =psc; //设置用来作为TIMx时钟频率除数的预分频值 
	TIM_TimeBaseStructure.TIM_ClockDivision = 0; //设置时钟分割:TDTS = Tck_tim
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;  //TIM向上计数模式
	TIM_TimeBaseInit(TIM2, &TIM_TimeBaseStructure); //根据TIM_TimeBaseInitStruct中指定的参数初始化TIMx的时间基数单位
	
	//初始化TIM2 Channel2 PWM模式	 
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM2; //选择定时器模式:TIM脉冲宽度调制模式2
 	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable; //比较输出使能
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High; //输出极性:TIM输出比较极性高
	if(ch==1)
	{
		TIM_OC1Init(TIM2, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM2 OC1
		TIM_OC1PreloadConfig(TIM2, TIM_OCPreload_Enable);  //使能TIM2在CCR2上的预装载寄存器
	}
	else if(ch==2)
	{
		TIM_OC2Init(TIM2, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM2 OC2
		TIM_OC2PreloadConfig(TIM2, TIM_OCPreload_Enable);  //使能TIM2在CCR2上的预装载寄存器
	}
	else if(ch==3)
	{
		TIM_OC3Init(TIM2, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM2 OC3
		TIM_OC3PreloadConfig(TIM2, TIM_OCPreload_Enable);  //使能TIM2在CCR2上的预装载寄存器
	}
	else if(ch==4)
	{
		TIM_OC4Init(TIM2, &TIM_OCInitStructure);  //根据T指定的参数初始化外设TIM2 OC4
		TIM_OC4PreloadConfig(TIM2, TIM_OCPreload_Enable);  //使能TIM2在CCR2上的预装载寄存器
	}
 
	TIM_Cmd(TIM2, ENABLE);  //使能TIM2
	//TIM_Cmd(TIM2, DISABLE);  //失能TIM2
}



