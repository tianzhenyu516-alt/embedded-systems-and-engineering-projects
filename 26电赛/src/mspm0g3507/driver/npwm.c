#include "ti_msp_dl_config.h"
#include "ntimer.h"
#include "npwm.h"





/***************************************
函数名:	void PWM_Output((uint16_t width1,uint16_t width2,uint16_t width3,uint16_t width4))
说明: uint16_t width1-待输出的脉冲宽度1
			uint16_t width2-待输出的脉冲宽度2
			uint16_t width3-待输出的脉冲宽度3
			uint16_t width4-待输出的脉冲宽度4
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void PWM_Output(uint16_t width1,uint16_t width2,uint16_t width3,uint16_t width4)
{
	uint16_t pwm[4]={0};
	pwm[0]=width1;
	pwm[1]=width2;
	pwm[2]=width3;
	pwm[3]=width4;
	
	DL_TimerA_setCaptureCompareValue(PWM_0_INST, pwm[0], GPIO_PWM_0_C0_IDX);//TIMA0-CH0-PB14 0~1000
	DL_TimerA_setCaptureCompareValue(PWM_0_INST, pwm[1], GPIO_PWM_0_C1_IDX);//TIMA0-CH1-PA3
	DL_TimerA_setCaptureCompareValue(PWM_0_INST, pwm[2], GPIO_PWM_0_C2_IDX);//TIMA0-CH2-PA7  0~999
	DL_TimerA_setCaptureCompareValue(PWM_0_INST, pwm[3], GPIO_PWM_0_C3_IDX);//TIMA0-CH3-PA4
}      

/***************************************
函数名:	void steer_servo_pwm_m1p0(uint16_t us)
说明: uint16_t us-输出脉宽值
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void steer_servo_pwm_m1p0(uint16_t us)
{
	Reserved_PWM5_Output(us);
}

/***************************************
函数名:	void steer_servo_pwm_m1p1(uint16_t us)
说明: uint16_t us-输出脉宽值
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void steer_servo_pwm_m1p1(uint16_t us)
{
	Reserved_PWM6_Output(us);
}

/***************************************
函数名:	void steer_servo_pwm_m1p2(uint16_t us)
说明: uint16_t us-输出脉宽值
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void steer_servo_pwm_m1p2(uint16_t us)
{
	Reserved_PWM7_Output(us);
}

/***************************************
函数名:	void steer_servo_pwm_m1p3(uint16_t us)
说明: uint16_t us-输出脉宽值
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void steer_servo_pwm_m1p3(uint16_t us)
{
	Reserved_PWM8_Output(us);
}
