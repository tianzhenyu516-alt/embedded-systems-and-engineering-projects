#include "headfile.h"
#include "self_balancing.h"
#include "user.h"


#define balance_deadzone 75				 //平衡换向控制死区  50
#define drive_brake_angle_max   30 //最大刹车驱动角度  30

float balance_angle_expect=balance_angle_default;//期望角度零点
float	balance_angle_output=0,balance_gyro_output=0;//控制器输出
float balance_speed_scale=balance_speed_scale_default;//速度控制器输出转换到期望调整的姿态角度之间的转换系数
float balance_angle_delta=0;//期望调整的姿态角度
uint8_t balance_speed_ctrl_enable=1,balance_steer_ctrl_enable=1,balance_ctrl_loop_num=1;//自己调节参数时,速度/转向控制使能

//自平衡角度控制器结构体
controller selfbalance_angle1_ctrl=
{
	.kp=balance_angle_kp1_default,  			//比例参数
	.ki=balance_angle_ki1_default,  			//积分参数
	.kd=balance_angle_kd1_default,  			//微分参数
	.error_limit_max=75.0f,  		//偏差限幅值
	.integral_limit_max=0,			//积分限幅值
	.output_limit_max=500,			//控制器输出限幅值
	.error_limit_flag=1,  			//偏差限幅标志位
	.integral_separate_flag=0,  //积分分离标志位
	.integral_separate_limit=0, //引入积分控制时的限幅值
	.dis_error_gap_cnt=1,				//微分间隔时间
};		

/***************************************************
函数名: void balance_control_single_control(void)
说明:	单角度环自平衡控制
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void balance_control_single_control(void)
{
	selfbalance_angle1_ctrl.expect=balance_angle_expect;//期望
	selfbalance_angle1_ctrl.feedback=smartcar_imu.rpy_kalman_deg[PIT];	//反馈		smartcar_imu.rpy_deg[PIT]
	
	selfbalance_angle1_ctrl.error=selfbalance_angle1_ctrl.expect-selfbalance_angle1_ctrl.feedback;
	selfbalance_angle1_ctrl.error=constrain_float(selfbalance_angle1_ctrl.error,-75.0f,75.0f);
	selfbalance_angle1_ctrl.output=selfbalance_angle1_ctrl.kp*selfbalance_angle1_ctrl.error+selfbalance_angle1_ctrl.kd*(-smartcar_imu.rpy_gyro_dps[PIT]);
	
	balance_angle_output=selfbalance_angle1_ctrl.output;
	balance_angle_output=constrain_float(balance_angle_output,-10000,10000);
	
	//在平衡控制的基础上,叠加速度控制输出
	motion_ctrl_pwm=balance_angle_output-speed_smooth_output*balance_speed_ctrl_enable;  
	//叠加死区控制
	if(motion_ctrl_pwm>0) motion_ctrl_pwm+=balance_deadzone;
	if(motion_ctrl_pwm<0) motion_ctrl_pwm-=balance_deadzone;
}




controller selfbalance_angle2_ctrl=
{
	.kp=balance_angle_kp2_default,  			//比例参数
	.ki=balance_angle_ki2_default,  			//积分参数
	.kd=balance_angle_kd2_default,  			//微分参数
	.error_limit_max=20,  			//偏差限幅值
	.integral_limit_max=0,			//积分限幅值
	.output_limit_max=500,			//控制器输出限幅值
	.error_limit_flag=1,  			//偏差限幅标志位
	.integral_separate_flag=0,  //积分分离标志位
	.integral_separate_limit=0, //引入积分控制时的限幅值
	.dis_error_gap_cnt=1,				//微分间隔时间
};
controller selfbalance_gyro_ctrl;		  //自平衡角速度控制器结构体


/***************************************************
函数名: void balance_control_double_closed_loop(void)
说明:	角度+角速度环自平衡控制
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void balance_control_double_closed_loop(void)
{	
	//根据速度控制器输出值，线性映射成姿态角度变化量
	balance_angle_delta=balance_speed_scale*speed_smooth_output;
	balance_angle_delta=constrain_float(balance_angle_delta,-drive_brake_angle_max,drive_brake_angle_max);
  //角度控制
	selfbalance_angle2_ctrl.expect=(balance_angle_expect-balance_angle_delta);//期望
	selfbalance_angle2_ctrl.feedback=smartcar_imu.rpy_deg[PIT];							 //反馈
	pid_control_run(&selfbalance_angle2_ctrl);		  													 //控制器运算		
	balance_angle_output=selfbalance_angle2_ctrl.output;
	balance_angle_output=constrain_float(balance_angle_output,-500,500);
	//角速度控制
	selfbalance_gyro_ctrl.expect=balance_angle_output;//期望
	selfbalance_gyro_ctrl.feedback=smartcar_imu.rpy_gyro_dps[PIT];//反馈
	pid_control_run(&selfbalance_gyro_ctrl);		  //控制器运算
	balance_gyro_output=selfbalance_gyro_ctrl.output;
	//最终输出限幅
	balance_gyro_output=constrain_float(balance_gyro_output,-999,999);
}



//balance_angle_delta=balance_speed_scale*speed_smooth_output*balance_speed_ctrl_enable;
//balance_angle_delta=constrain_float(balance_angle_delta,-15,15);
//balance_angle_delta=0;
//selfbalance_angle1_ctrl.expect=(balance_angle_expect-balance_angle_delta);//期望

