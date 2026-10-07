#include "ti_msp_dl_config.h"
#include "datatype.h"
#include "system.h"
#include "user.h"
#include "nqei.h"

encoder NEncoder={
	.left_motor_period_ms=20,
	.right_motor_period_ms=20,
};
systime timer_qei1,timer_qei0;

extern motor_config trackless_motor;


/***************************************
函数名:	void QEI0_IRQHandler(void)
说明: QEI0中断服务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void QEI0_IRQHandler(void)
{
	//NEncoder.right_motor_dir=((DL_GPIO_readPins(PORTB_PORT,  PORTB_RIGHT_DIR_PIN))!=0?1:-1);
	NEncoder.right_motor_dir=((PORTB_PORT->DIN31_0 & PORTB_RIGHT_DIR_PIN)!=0?1:-1);
	if(trackless_motor.right_encoder_dir_config==0)
	{		
		if(NEncoder.right_motor_dir==1)	NEncoder.right_motor_period_cnt++;
		else NEncoder.right_motor_period_cnt--;
		NEncoder.right_motor_total_cnt+=NEncoder.right_motor_dir;	
	}
	else
	{
		if(NEncoder.right_motor_dir==1)	NEncoder.right_motor_period_cnt--;
		else NEncoder.right_motor_period_cnt++;
		NEncoder.right_motor_total_cnt-=NEncoder.right_motor_dir;				
	}	
}

/***************************************
函数名:	void QEI1_IRQHandler(void)
说明: QEI1中断服务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void QEI1_IRQHandler(void)
{
	//NEncoder.left_motor_dir=((DL_GPIO_readPins(PORTB_PORT,  PORTB_LEFT_DIR_PIN))!=0?-1:1);
	NEncoder.left_motor_dir=((PORTB_PORT->DIN31_0 & PORTB_LEFT_DIR_PIN)!=0?-1:1);
	if(trackless_motor.left_encoder_dir_config==0)
	{	
		if(NEncoder.left_motor_dir==1)	NEncoder.left_motor_period_cnt++;
		else NEncoder.left_motor_period_cnt--;
		NEncoder.left_motor_total_cnt+=NEncoder.left_motor_dir;
	}
	else
	{
		if(NEncoder.left_motor_dir==1)	NEncoder.left_motor_period_cnt--;
		else NEncoder.left_motor_period_cnt++;
		NEncoder.left_motor_total_cnt-=NEncoder.left_motor_dir;
	}		
}

/***************************************
函数名:	void get_left_motor_speed(void)
说明: 获取左边轮子实际速度值
入口:	无
出口:	无
备注:	将单位时间内的脉冲数,转化成rpm、cm/s
作者:	无名创新
***************************************/
float get_left_motor_speed(void)
{
	static uint16_t cnt1=0;cnt1++;
	if(cnt1>=4)
	{
		cnt1=0;
		NEncoder.left_motor_period_ms=20;
		//将速度转化成转每分钟
		NEncoder.left_motor_speed_rpm=60*(NEncoder.left_motor_period_cnt*1.0f/trackless_motor.pulse_num_per_circle)
																	/(NEncoder.left_motor_period_ms*0.001f);	
		NEncoder.left_motor_speed_cmps=2*3.14f*trackless_motor.wheel_radius_cm*(NEncoder.left_motor_speed_rpm/60.0f);
		NEncoder.left_motor_period_cnt=0;
	}
	return NEncoder.left_motor_speed_cmps;
}

/***************************************
函数名:	void get_right_motor_speed(void)
说明: 获取右边轮子实际速度值
入口:	无
出口:	无
备注:	将单位时间内的脉冲数,转化成rpm、cm/s
作者:	无名创新
***************************************/
float get_right_motor_speed(void)
{
	static uint16_t cnt2=0;cnt2++;
	if(cnt2>=4)
	{
		cnt2=0;
		NEncoder.right_motor_period_ms=20;
		//将速度转化成转每分钟
		NEncoder.right_motor_speed_rpm=60*(NEncoder.right_motor_period_cnt*1.0f/trackless_motor.pulse_num_per_circle)
																	/(NEncoder.right_motor_period_ms*0.001f);
		NEncoder.right_motor_speed_cmps=2*3.14f*trackless_motor.wheel_radius_cm*(NEncoder.right_motor_speed_rpm/60);
		
		NEncoder.right_motor_period_cnt=0;	
	}
	return NEncoder.right_motor_speed_cmps;
}

/***************************************
函数名:	void motor_total_cnt_reset(void)
说明: 总脉冲计数复位
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void motor_total_cnt_reset(void)
{
	NEncoder.left_motor_total_cnt =0;
	NEncoder.right_motor_total_cnt=0;
}


/***************************************
函数名:	void Encoder_Init(void)
说明: 编码器采集初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Encoder_Init(void)
{

}


