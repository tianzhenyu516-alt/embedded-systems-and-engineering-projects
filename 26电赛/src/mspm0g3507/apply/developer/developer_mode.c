#include "headfile.h"
#include "sdk.h"
#include "subtask.h"
#include "user.h"
#include "developer_mode.h"

int16_t sdk_work_mode=0;


#define wheel_space_cm  12.8f//轮间距  12.8cm



void sdk_duty_run(void)
{
	if(trackless_output.init==0)
	{		
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output=0;
		trackless_output.init=1;
		flight_subtask_reset();//复位sdk子任务状态量
	}
	//if(smartcar_imu.imu_convergence_flag!=1) return;//姿态解算系统就位
	
	switch(sdk_work_mode)
	{
		case 0://初始调试模式，用于确定电机运动方向时使用
		{
			speed_ctrl_mode=0;  //直接开环输出指定PWM数值，用于调试电机方向
			motion_ctrl_pwm=motion_test_pwm_default;//默认输出百分之50占空的pwm
		}
		break;
		case 1://调速测试模式——速度期望来源于按键设定
		{
			speed_ctrl_mode=1;//速度控制方式为两轮单独控制
			speed_expect[0]=30;//左边轮子速度期望
			speed_expect[1]=30;//右边轮子速度期望
			//速度控制
			speed_control_100hz(speed_ctrl_mode);				
		}
		break;		
		case 2://基于灰度管的自主寻迹
		{
			speed_ctrl_mode=1;//速度控制方式为两轮单独控制
			gray_turn_control_200hz(&turn_ctrl_pwm);//基于灰度对管的转向控制
			//期望速度
			speed_expect[0]=speed_setup+turn_ctrl_pwm*turn_scale;//左边轮子速度期望
			speed_expect[1]=speed_setup-turn_ctrl_pwm*turn_scale;//右边轮子速度期望
			//速度控制
			speed_control_100hz(speed_ctrl_mode);		
		}
		break;		
		case 3:
		{
			//用户预留任务，编写后注意加上break跳出
		}
		case 4:
		{
			//用户预留任务，编写后注意加上break跳出
		}
		case 5:
		{
			//用户预留任务，编写后注意加上break跳出
		}
		default:
		{
	
		}
	}
}

