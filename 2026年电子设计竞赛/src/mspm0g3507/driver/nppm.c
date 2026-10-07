#include "ti_msp_dl_config.h"
#include "datatype.h"
#include "system.h"
#include "us100.h"
#include "nqei.h"
#include "nppm.h"

mppm ppm_rc;//ppm数据结构体

void nPPM_Handler(void);
/***************************************
函数名:	void PPM_Init(void)
说明: PPM硬件资源初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void PPM_Init(void)
{	
	//NVIC_ClearPendingIRQ(PORTA_INT_IRQN);
	NVIC_ClearPendingIRQ(PORTB_INT_IRQN);
	//NVIC_EnableIRQ(PORTA_INT_IRQN);//GPIOA中断使能
	NVIC_EnableIRQ(PORTB_INT_IRQN);//GPIOB中断使能
}


/***************************************
函数名:	void nPPM_Handler(void)
说明: PPM中断服务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新  mk0
***************************************/
uint16 PPM_buf[8]={0}; 
uint32_t last_ppm_time=0,now_ppm_time=0;
uint8_t ppm_ready=0,ppm_sample_cnt=0,ppm_prase=0;
uint16_t ppm_time_delta=0;	
void nPPM_Handler(void)
{
  last_ppm_time=now_ppm_time;//系统运行时间获取，单位us
  now_ppm_time=micros();//单位us	
  ppm_time_delta=now_ppm_time-last_ppm_time;//获取时间间隔
  //PPM解析开始
	if(ppm_ready==1)
	{
		if(ppm_time_delta>=2400)//帧结束电平至少2ms=2000us，由于部分老版本遥控器、
			//接收机输出PPM信号不标准，当出现解析异常时，尝试改小此值，该情况仅出现一例：使用天地飞老版本遥控器
		{
			ppm_prase = 1;
			ppm_sample_cnt=0;		
		}
		else if(ppm_time_delta>=900&&ppm_time_delta<=2100&&ppm_prase==1)
		{         
			PPM_buf[ppm_sample_cnt++]=ppm_time_delta;//对应通道写入缓冲区       
			if(ppm_sample_cnt>=8)//单次解析结束
			{
				memcpy(ppm_rc.buf,PPM_buf,ppm_sample_cnt*sizeof(uint16));
				ppm_prase=0;
				ppm_rc.update_flag=1;
			}
		}
	}
	else if(ppm_time_delta>=2400)//帧结束电平至少2ms=2000us
	{
		ppm_ready=1;
		ppm_prase=1;
		ppm_sample_cnt=0;
	}
}



void GROUP1_IRQHandler(void)
{
	if(DL_Interrupt_getStatusGroup(DL_INTERRUPT_GROUP_1,DL_INTERRUPT_GROUP1_GPIOB))
	{
		if(DL_GPIO_getEnabledInterruptStatus(PORTB_PORT, PORTB_RIGHT_PULSE_PIN))
		{
			QEI0_IRQHandler();
			DL_GPIO_clearInterruptStatus(PORTB_PORT, PORTB_RIGHT_PULSE_PIN);
		}		
		
		if(DL_GPIO_getEnabledInterruptStatus(PORTB_PORT, PORTB_LEFT_PULSE_PIN))
		{
			QEI1_IRQHandler();
			DL_GPIO_clearInterruptStatus(PORTB_PORT, PORTB_LEFT_PULSE_PIN);
		}
		DL_Interrupt_clearGroup(DL_INTERRUPT_GROUP_1, DL_INTERRUPT_GROUP1_GPIOB);		
	}
	
//	if(DL_Interrupt_getStatusGroup(DL_INTERRUPT_GROUP_1, DL_INTERRUPT_GROUP1_GPIOA))
//	{
//		if(DL_GPIO_getEnabledInterruptStatus(PORTA_PORT, PORTA_PPM_PIN))
//		{
//			//nPPM_Handler();
//			DL_GPIO_clearInterruptStatus(PORTA_PORT, PORTA_PPM_PIN);
//		}	
//		DL_Interrupt_clearGroup(DL_INTERRUPT_GROUP_1, DL_INTERRUPT_GROUP1_GPIOA);		
//	}
}


