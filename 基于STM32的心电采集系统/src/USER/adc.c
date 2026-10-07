/******************** (C) COPYRIGHT 2012 WildFire Team ***************************
 * 文件名  ：adc.c
 * 描述    ：adc应用函数库        
 * 实验平台：野火STM32开发板
 * 硬件连接：----------------------------------------------------
 *          |                                                    |
 *          | PC1 - ADC1 连接外部电压(通过一个滑动变阻器分压而来)|
 *          |                                                    |
 *           ----------------------------------------------------
 * 库版本  ：ST3.5.0 
 *
 * 作者    ：wildfire team 
 * 论坛    ：http://www.amobbs.com/forum-1008-1.html
 * 淘宝    ：http://firestm32.taobao.com
**********************************************************************************/
#include "adc.h"

#define ADC1_DR_Address    ((u32)0x40012400+0x4c)

__IO u16 BUF1[100];  //缓冲1区
__IO u16 BUF2[100];  //缓冲2区


/*
 * 函数名：ADC1_GPIO_Config
 * 描述  ：使能ADC1和DMA1的时钟，初始化PC.0
 * 输入  : 无
 * 输出  ：无
 * 调用  ：内部调用
 */
 void ADC1_GPIO_Config(void)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	
	/* Enable DMA clock */
	RCC_AHBPeriphClockCmd(RCC_AHBPeriph_DMA1, ENABLE);  //开启DMA时钟
	
	/* Enable ADC1 and GPIOC clock */
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_ADC1 | RCC_APB2Periph_GPIOC, ENABLE);//开启ADC时钟
	
	/* Configure PC.01  as analog input */
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AIN;
	GPIO_Init(GPIOC, &GPIO_InitStructure);				// PC0,输入时不用设置速率
}


/* 函数名：ADC1_Mode_Config
 * 描述  ：配置ADC1的工作模式为MDA模式
 * 输入  : 无
 * 输出  ：无
 * 调用  ：内部调用
 */
void ADC1_Mode_Config(void)
{
	DMA_InitTypeDef DMA_InitStructure;
	ADC_InitTypeDef ADC_InitStructure;
	
	/* DMA channel1 configuration */
	DMA_DeInit(DMA1_Channel1);
	DMA_InitStructure.DMA_PeripheralBaseAddr = ADC1_DR_Address;	 //ADC地址
	DMA_InitStructure.DMA_MemoryBaseAddr = (u32)&BUF1;//内存地址
	DMA_InitStructure.DMA_DIR = DMA_DIR_PeripheralSRC;
	DMA_InitStructure.DMA_BufferSize = 100;   //缓存单元的个数 
	DMA_InitStructure.DMA_PeripheralInc = DMA_PeripheralInc_Disable;//外设地址固定
	DMA_InitStructure.DMA_MemoryInc = DMA_MemoryInc_Enable;         //内存地址固定
	DMA_InitStructure.DMA_PeripheralDataSize = DMA_PeripheralDataSize_HalfWord;	//半字
	DMA_InitStructure.DMA_MemoryDataSize = DMA_MemoryDataSize_HalfWord;
	DMA_InitStructure.DMA_Mode = DMA_Mode_Circular;		//循环传输
	DMA_InitStructure.DMA_Priority = DMA_Priority_High;
	DMA_InitStructure.DMA_M2M = DMA_M2M_Disable;
	DMA_Init(DMA1_Channel1, &DMA_InitStructure);
	DMA_ITConfig(DMA1_Channel1,DMA_IT_TC,ENABLE);//启动中断标志
	
	
	/* ADC1 configuration */
	
	ADC_InitStructure.ADC_Mode = ADC_Mode_Independent;	//独立ADC模式
	ADC_InitStructure.ADC_ScanConvMode = DISABLE ; 	    //禁止扫描模式，扫描模式用于多通道采集
	ADC_InitStructure.ADC_ContinuousConvMode = DISABLE;	//开启连续转换模式，即不停地进行ADC转换
	ADC_InitStructure.ADC_ExternalTrigConv = ADC_ExternalTrigConv_T2_CC2 ;	//使用外部触发转换
	//ADC_InitStructure.ADC_ExternalTrigConv =ADC_ExternalTrigConv_None;	//不使用外部触发转换
	ADC_InitStructure.ADC_DataAlign = ADC_DataAlign_Right; 	//采集数据右对齐
	ADC_InitStructure.ADC_NbrOfChannel = 1;	        	  //要转换的通道数目1
	ADC_Init(ADC1, &ADC_InitStructure);
	
	/*配置ADC时钟，为PCLK2的8分频，即9Hz*/
	RCC_ADCCLKConfig(RCC_PCLK2_Div6); 
	/*配置ADC1的通道11为55.	5个采样周期，序列为1 */ 
	ADC_RegularChannelConfig(ADC1, ADC_Channel_10, 1, ADC_SampleTime_1Cycles5);
	
	ADC_DMACmd(ADC1, ENABLE);     //使能DMA传输
	ADC_Cmd(ADC1, ENABLE);        //使能ADC外设
  
	ADC_ResetCalibration(ADC1);   //复位校准寄存器
	while(ADC_GetResetCalibrationStatus(ADC1));
	ADC_StartCalibration(ADC1);   //ADC校准 
	while(ADC_GetCalibrationStatus(ADC1));
	DMA_Cmd(DMA1_Channel1, ENABLE);
  ADC_ExternalTrigConvCmd(ADC1, ENABLE);   //使用外部中断触发
	//ADC_SoftwareStartConvCmd(ADC1, ENABLE);
}

static void DMA_Interrupt_Init(void)      //配置DMA中断
{
	
  NVIC_InitTypeDef NVIC_InitStructure;
  NVIC_PriorityGroupConfig(NVIC_PriorityGroup_1);
  NVIC_InitStructure.NVIC_IRQChannel = DMA1_Channel1_IRQn;
  NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority =1;
  NVIC_InitStructure.NVIC_IRQChannelSubPriority =1;
  NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
  NVIC_Init(&NVIC_InitStructure);
}

void timer_init()
{
	TIM_TimeBaseInitTypeDef   TIM_TimeBaseStructure;
	TIM_OCInitTypeDef         TIM_OCInitStructure;
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2,ENABLE);   //开启定时器时钟
	
	TIM_TimeBaseStructure.TIM_Period = 400;      //设置100msTIM2比较的周期
  TIM_TimeBaseStructure.TIM_Prescaler = 720-1;   //系统主频72M，这里分频720，相当于100K的定时器2时钟
	TIM_TimeBaseStructure.TIM_ClockDivision = 0x0; 
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up; 
	TIM_TimeBaseInit(TIM2, & TIM_TimeBaseStructure);
	
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1;//下面详细说明
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;//TIM_OutputState_Disable; 
	TIM_OCInitStructure.TIM_Pulse = 200; 
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_Low;//如果是PWM1要为Low，则为High 
	TIM_OC2Init(TIM2, &TIM_OCInitStructure); 
	TIM_Cmd(TIM2, ENABLE); 
	TIM_InternalClockConfig(TIM2); 
	TIM_OC2PreloadConfig(TIM2, TIM_OCPreload_Enable); 
	TIM_UpdateDisableConfig(TIM2, DISABLE); 
}


void ADC1_Init(void)
{
	ADC1_GPIO_Config();
	//NVIC_User_Init();   //中断配置函数
	ADC1_Mode_Config();
	DMA_Interrupt_Init();
	timer_init();
}

/******************* (C) COPYRIGHT 2012 WildFire Team *****END OF FILE************/

