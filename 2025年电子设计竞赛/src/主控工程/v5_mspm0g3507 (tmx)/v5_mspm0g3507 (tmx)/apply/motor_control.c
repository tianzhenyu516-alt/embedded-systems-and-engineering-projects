#include "headfile.h"
#include "motor_control.h"
#include "user.h"

float left_pwm,right_pwm;//左右电机最终的输出值

motor_config trackless_motor={
	.left_encoder_dir_config=left_motor_encoder_dir_default,	//编码器方向配置
	.right_encoder_dir_config=right_motor_encoder_dir_default,//编码器方向配置
	.left_motion_dir_config=left_motion_dir_default,					//电机运动方向配置
	.right_motion_dir_config=right_motion_dir_default,				//电机运动方向配置
	.wheel_radius_cm=tire_radius_cm_default,									//驱动轮的半径
	.pulse_num_per_circle=pulse_cnt_per_circle_default,				//驱动轮转动一圈时编码器的脉冲累计值
	.servo_median_value1=servo_median_value1_default,					//舵机机械中值1
	.servo_median_value2=servo_median_value2_default,					//舵机机械中值2
};

uint8_t speed_ctrl_mode=1;//0:直接控制、1:两轮单独控制、2:自平衡控制模式
uint8_t speed_pid_mode=0; //0:位置式PID控制、1:增量式PID控制
float motion_ctrl_pwm=0,turn_ctrl_pwm=0;//运动、转向控制输出
int16_t motion_test_pwm_default=500;

#define speed_err_max  50.0f				//速度偏差限幅值
#define speed_integral_max  600.0f	//积分限幅值
#define speed_ctrl_output_max 999		//控制器限幅值


#define speed_err_limit  100.0f					//自平衡速度偏差限幅值100
#define speed_integral_limit  500.0f		//自平衡积分限幅值300
#define speed_ctrl_output_limit 750.0f	//自平衡控制器限幅值500

//速度控制器参数
float speed_setup=0;//速度设定值
float speed_kp=speed_kp_default,speed_ki=speed_ki_default,speed_kd=speed_kd_default;
float speed_error[2]={0,0},speed_expect[2]={speed_expect_default,speed_expect_default},speed_feedback[2]={0,0};
float	speed_integral[2]={0,0},speed_output[2]={0,0};

//自平衡速度控制器参数
float balance_speed_kp=balance_speed_kp_default,balance_speed_ki=balance_speed_ki_default,balance_speed_kd=balance_speed_kd_default;
float balance_speed_error=0,balance_speed_expect=speed_expect_default,balance_speed_feedback=0;
float balance_last_speed_feedback=0,balance_speed_feedback_filter=0;
float	balance_speed_integral=0,balance_speed_output=0,balance_last_speed_output=0;
#define speed_smooth_period   (20/5)//20ms
uint16_t speed_smooth_output_cnt=0;
float speed_smooth_output=0;
//
float speed_output_delta[2]={0,0},speed_output_last[2]={0,0},speed_error_last[2]={0,0};

/***************************************************
函数名: void speed_control_100hz(uint8_t _speed_ctrl_mode)
说明:	速度控制
入口:	uint8_t _speed_ctrl_mode-速度控制方式,1:普通速度控制;2:自平衡速度控制
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void speed_control_100hz(uint8_t _speed_ctrl_mode)
{
	static uint16_t _cnt=0;
	switch(_speed_ctrl_mode)
	{
		case 1:
		{
			_cnt++;	if(_cnt<2)	return;	_cnt=0;//10ms控制一次
			if(speed_pid_mode==0)
			{	
					speed_feedback[0]=smartcar_imu.left_motor_speed_cmps;
					speed_error[0]=speed_expect[0]-speed_feedback[0];
					speed_error[0]=constrain_float(speed_error[0],-speed_err_max,speed_err_max);
					speed_integral[0]+=speed_ki*speed_error[0];
					speed_integral[0]=constrain_float(speed_integral[0],-speed_integral_max,speed_integral_max);
					speed_output[0]=speed_integral[0]+speed_kp*speed_error[0];
					speed_output[0]=constrain_float(speed_output[0],-speed_ctrl_output_max,speed_ctrl_output_max);
						
					speed_feedback[1]=smartcar_imu.right_motor_speed_cmps;
					speed_error[1]=speed_expect[1]-speed_feedback[1];
					speed_error[1]=constrain_float(speed_error[1],-speed_err_max,speed_err_max);
					speed_integral[1]+=speed_ki*speed_error[1];
					speed_integral[1]=constrain_float(speed_integral[1],-speed_integral_max,speed_integral_max);
					speed_output[1]=speed_integral[1]+speed_kp*speed_error[1];
					speed_output[1]=constrain_float(speed_output[1],-speed_ctrl_output_max,speed_ctrl_output_max);
			}
			else
			{
					speed_output_last[0]=speed_output[0];//记录上次控制器输出
					speed_error_last[0]=speed_error[0];  //记录上次偏差
					speed_feedback[0]=smartcar_imu.left_motor_speed_cmps;
					speed_error[0]=speed_expect[0]-speed_feedback[0];
					speed_error[0]=constrain_float(speed_error[0],-speed_err_max,speed_err_max);
					speed_output_delta[0]=speed_kp*(speed_error[0]-speed_error_last[0])+speed_ki*speed_error[0];//计算速度输出增量
					speed_output[0]=speed_output_last[0]+speed_output_delta[0];//当前控制器输出
					speed_output[0]=constrain_float(speed_output[0],-speed_ctrl_output_max,speed_ctrl_output_max);
					
					speed_output_last[1]=speed_output[1];//记录上次控制器输出
					speed_error_last[1]=speed_error[1];  //记录上次偏差
					speed_feedback[1]=smartcar_imu.right_motor_speed_cmps;
					speed_error[1]=speed_expect[1]-speed_feedback[1];
					speed_error[1]=constrain_float(speed_error[1],-speed_err_max,speed_err_max);
					speed_output_delta[1]=speed_kp*(speed_error[1]-speed_error_last[1])+speed_ki*speed_error[1];//计算速度输出增量
					speed_output[1]=speed_output_last[1]+speed_output_delta[1];//当前控制器输出
					speed_output[1]=constrain_float(speed_output[1],-speed_ctrl_output_max,speed_ctrl_output_max);			
			}		
		}
		break;
		case 2://速度控制——平衡控制
		{
			speed_smooth_output_cnt++;
			if(speed_smooth_output_cnt>=speed_smooth_period)//n个5ms控制一次
			{
				/***************************************************************/
				balance_speed_expect=speed_setup;
				balance_last_speed_feedback=balance_speed_feedback_filter;
				balance_speed_feedback=0.5f*(smartcar_imu.left_motor_speed_cmps+smartcar_imu.right_motor_speed_cmps);
				balance_speed_feedback_filter=0.75f*balance_speed_feedback+0.25f*balance_last_speed_feedback;
				
				balance_speed_error=balance_speed_expect-balance_speed_feedback_filter;	
				balance_speed_error=constrain_float(balance_speed_error,-speed_err_limit,speed_err_limit);
				balance_speed_integral+=balance_speed_ki*balance_speed_error;
				balance_speed_integral=constrain_float(balance_speed_integral,-speed_integral_limit,speed_integral_limit);
				
				//下面代码用于调试参数时，积分参数中途给0时，对积分控制进行清0
				if(balance_speed_ki<=0.0001f) balance_speed_integral=0;
				
				balance_last_speed_output=balance_speed_output;
				balance_speed_output=balance_speed_kp*balance_speed_error+balance_speed_integral;//PI控制器
				balance_speed_output=constrain_float(balance_speed_output,-speed_ctrl_output_limit,speed_ctrl_output_limit);
				speed_smooth_output_cnt=0;
			}
			speed_smooth_output=balance_last_speed_output+(balance_speed_output-balance_last_speed_output)*(speed_smooth_output_cnt+1)/speed_smooth_period;
			//speed_smooth_output=balance_speed_output;
		}		
		break;		
		default:
		{
			_cnt++;	if(_cnt<2)	return;	_cnt=0;//10ms控制一次
			
			/***************************************************************/
			balance_speed_expect=speed_setup;
			balance_speed_feedback=0.5f*(smartcar_imu.left_motor_speed_cmps+smartcar_imu.right_motor_speed_cmps);
			balance_speed_error=balance_speed_expect-balance_speed_feedback;
			balance_speed_error=constrain_float(balance_speed_error,-speed_err_max,speed_err_max);
			balance_speed_integral+=speed_ki*balance_speed_error;
			balance_speed_integral=constrain_float(balance_speed_integral,-speed_integral_max,speed_integral_max);
			balance_speed_output=balance_speed_integral+speed_kp*balance_speed_error;
			balance_speed_output=constrain_float(balance_speed_output,-999,999);			
		}
	}		
}




	

//#define right_pwm_channel_1		GPIO_PWM_0_C0_IDX//TIMA0-CH0-PB14
//#define right_pwm_channel_2		GPIO_PWM_0_C1_IDX//TIMA0-CH1-PA3
//#define left_pwm_channel_1    GPIO_PWM_0_C2_IDX//TIMA0-CH2-PA7
//#define left_pwm_channel_2    GPIO_PWM_0_C3_IDX//TIMA0-CH3-PA4
#define right_pwm_channel_1		GPIO_PWM_0_C3_IDX//TIMA0-CH3-PA4
#define right_pwm_channel_2		GPIO_PWM_0_C2_IDX//TIMA0-CH2-PA7
#define left_pwm_channel_1    GPIO_PWM_0_C1_IDX//TIMA0-CH1-PA3
#define left_pwm_channel_2    GPIO_PWM_0_C0_IDX//TIMA0-CH0-PB14


/***************************************************
函数名: void motor_output(uint8_t _speed_ctrl_mode)
说明:	最终PWM控制输出
入口:	uint8_t _speed_ctrl_mode-速度控制方式,0:调试模式;1:普通速度控制;2:自平衡速度控制
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void motor_output(uint8_t _speed_ctrl_mode)
{
	if(_speed_ctrl_mode==0)//仅在初始调试电机运动方向时使用
	{
		left_pwm =motion_ctrl_pwm;
		right_pwm=motion_ctrl_pwm;
	}
	else if(_speed_ctrl_mode==1)//两轮速度单独控制
	{
		right_pwm=speed_output[1];
		left_pwm =speed_output[0];
	}
	else if(_speed_ctrl_mode==2)//自平衡控制输出
	{
		left_pwm =motion_ctrl_pwm+turn_ctrl_pwm*balance_steer_ctrl_enable;
		right_pwm=motion_ctrl_pwm-turn_ctrl_pwm*balance_steer_ctrl_enable;
	}
	else
	{
		right_pwm=0;
		left_pwm =0;	
	}
	
	if(trackless_output.unlock_flag==LOCK)
	{
		left_pwm =0;
		right_pwm=0;	
	}
	
	left_pwm =constrain_float(left_pwm,-999,999);
	right_pwm=constrain_float(right_pwm,-999,999);
	
	
	//右边电机输出
	if(trackless_motor.right_motion_dir_config==0)
	{
		if(right_pwm>=0)
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,         right_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, right_pwm, right_pwm_channel_2);
		}
		else
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, ABS(right_pwm), right_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0, 						 right_pwm_channel_2);	
		}
	}
	else
	{
		if(right_pwm>=0)
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, right_pwm, right_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,         right_pwm_channel_2);
		}
		else
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0, 						 right_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, ABS(right_pwm), right_pwm_channel_2);
		}
	}
	
	
	//左边电机输出
	if(trackless_motor.left_motion_dir_config==0)
	{	
		if(left_pwm>=0)
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, left_pwm, left_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,        left_pwm_channel_2);				
		}
		else
		{			
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,             left_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, ABS(left_pwm), left_pwm_channel_2);		
		}
	}
	else
	{
		if(left_pwm>=0)
		{
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,        left_pwm_channel_1);	
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, left_pwm, left_pwm_channel_2);	
		}
		else
		{		
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, ABS(left_pwm), left_pwm_channel_1);
			DL_TimerA_setCaptureCompareValue(PWM_0_INST, 0,             left_pwm_channel_2);		
		}	
	}
}




