#include "headfile.h"
#include "attitude_selfstable.h"

controller roll_angle_ctrl,pitch_angle_ctrl,yaw_angle_ctrl;//角度环
controller roll_gyro_ctrl,pitch_gyro_ctrl,yaw_gyro_ctrl;//角速度环

void attitude_ctrl_init(void)
{
	pid_control_init(&roll_angle_ctrl,//待初始化控制器结构体
										5.0,//比例参数
										0,  //积分参数
										0,  //微分参数
										30, //偏差限幅值
										0,  //积分限幅值
										500,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间
	pid_control_init(&pitch_angle_ctrl,//待初始化控制器结构体
										5.0,//比例参数
										0,  //积分参数
										0,  //微分参数
										30, //偏差限幅值
										0,  //积分限幅值
										500,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间
	pid_control_init(&yaw_angle_ctrl,//待初始化控制器结构体
										5.0,//比例参数
										0,  //积分参数
										0,  //微分参数
										30, //偏差限幅值
										0,  //积分限幅值
										500,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间

	pid_control_init(&roll_gyro_ctrl,//待初始化控制器结构体
										1.0,//比例参数
										3.0,  //积分参数
										4.5,  //微分参数
										500, //偏差限幅值
										300,  //积分限幅值
										1000,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间
										
	pid_control_init(&pitch_gyro_ctrl,//待初始化控制器结构体
										1.0,//比例参数
										3.0,  //积分参数
										4.5,  //微分参数
										500, //偏差限幅值
										300,  //积分限幅值
										1000,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间

	pid_control_init(&yaw_gyro_ctrl,//待初始化控制器结构体
										2.0,//比例参数
										1.0,  //积分参数
										2.0,  //微分参数
										200, //偏差限幅值
										200,  //积分限幅值
										800,//控制器输出限幅值
										1,  //偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间
										
	set_cutoff_frequency(200,20,&roll_angle_ctrl.lpf_params);
	set_cutoff_frequency(200,20,&pitch_angle_ctrl.lpf_params);
	set_cutoff_frequency(200,20,&yaw_angle_ctrl.lpf_params);										
	set_cutoff_frequency(200,20,&roll_gyro_ctrl.lpf_params);
	set_cutoff_frequency(200,20,&pitch_gyro_ctrl.lpf_params);
	set_cutoff_frequency(200,20,&yaw_gyro_ctrl.lpf_params);
	
}



void attitude_control(void)//姿态控制——角度+角速度
{			
	//姿态角度期望
	roll_angle_ctrl.expect =RC_Pilot.rc_rpyt[RC_ROLL];
	pitch_angle_ctrl.expect=RC_Pilot.rc_rpyt[RC_PITCH];	
  //姿态角度反馈
  roll_angle_ctrl.feedback =smartcar_imu.rpy_deg[_ROL];
	pitch_angle_ctrl.feedback=smartcar_imu.rpy_deg[_PIT];	
	//运行PID控制器
  pid_control_dt_run(&roll_angle_ctrl,0.005f);  
	pid_control_dt_run(&pitch_angle_ctrl,0.005f);
	
	//俯仰、横滚方向姿态内环角速度控制器采用PID控制器
	/***************内环角速度期望****************/
	roll_gyro_ctrl.expect=roll_angle_ctrl.output;
	pitch_gyro_ctrl.expect=pitch_angle_ctrl.output;
	/***************内环角速度反馈****************/
	roll_gyro_ctrl.feedback=smartcar_imu.rpy_gyro_dps[_ROL];
	pitch_gyro_ctrl.feedback=smartcar_imu.rpy_gyro_dps[_PIT];
	/***************内环角速度控制：微分参数动态调整****************/
	pid_control_dt_run(&roll_gyro_ctrl,0.005f);
	pid_control_dt_run(&pitch_gyro_ctrl,0.005f);
	
  //偏航角控制
	if(RC_Pilot.rc_rpyt[RC_YAW]==0)//偏航杆置于中位
	{
		if(yaw_angle_ctrl.expect==0)//初次切回中
		{
			yaw_angle_ctrl.expect=smartcar_imu.rpy_deg[_YAW];
		}
		yaw_angle_ctrl.feedback=smartcar_imu.rpy_deg[_YAW];//偏航角反馈
		pid_control_dt_yaw_run(&yaw_angle_ctrl,0.005f);//偏航角度控制
		yaw_gyro_ctrl.expect=yaw_angle_ctrl.output;//偏航角速度环期望，来源于偏航角度控制器输出
	}
	else//波动偏航方向杆后，只进行内环角速度控制
	{
		yaw_angle_ctrl.expect=0;//偏航角期望给0,不进行角度控制
		yaw_gyro_ctrl.expect=RC_Pilot.rc_rpyt[RC_YAW];//偏航角速度环期望，直接来源于遥控器打杆量
	}	
  yaw_gyro_ctrl.feedback=smartcar_imu.rpy_gyro_dps[_YAW];
  pid_control_dt_run(&yaw_gyro_ctrl,0.005f);
}


void takeoff_ctrl_reset(void)
{
  pid_integrate_reset(&roll_gyro_ctrl);//起飞前屏蔽积分
  pid_integrate_reset(&pitch_gyro_ctrl);
  pid_integrate_reset(&yaw_gyro_ctrl);
  pid_integrate_reset(&roll_angle_ctrl);
  pid_integrate_reset(&pitch_angle_ctrl);
  pid_integrate_reset(&yaw_angle_ctrl);
}

controller_output maplepilot={
	.unlock_flag=LOCK,
};


bool motor_idel_enable=false;
uint16_t motor_idel_cnt=0;
uint16_t motor_idel_value=0;
float motor_idel_period=5;//20
float motor_idel_time=0,motor_idel_last_time=0;
void ncontroller_output(void)
{
	if(RC_Pilot.lock_state==UNLOCK)//解锁状态
	{
		//控制器输出来源
		maplepilot.roll_control_output =roll_gyro_ctrl.output;
		maplepilot.pitch_control_output=pitch_gyro_ctrl.output;
		maplepilot.yaw_control_output  =yaw_gyro_ctrl.output;	
	  maplepilot.throttle_control_output=RC_Pilot.thr;
			
		if(motor_idel_enable==true)//怠速启动过程
		{
			motor_idel_time=millis();
			if(motor_idel_time-motor_idel_last_time>motor_idel_period)
			{
			  motor_idel_last_time=motor_idel_time;
				motor_idel_cnt++;
			}	  
			motor_idel_value=THR_MIN_OUTPUT+motor_idel_cnt;	
			maplepilot.motor_output[MOTOR1]=motor_idel_value;
			maplepilot.motor_output[MOTOR2]=motor_idel_value;
			maplepilot.motor_output[MOTOR3]=motor_idel_value;
			maplepilot.motor_output[MOTOR4]=motor_idel_value;	
			
		  if(motor_idel_cnt>=(THR_IDEL_OUTPUT-THR_MIN_OUTPUT))
			{
			  motor_idel_enable=false;
				motor_idel_cnt=0;
				motor_idel_last_time=motor_idel_time=0;
			}
		}
		else
		{
			if(maplepilot.throttle_control_output>=THR_CONTROL_WORK)
			{
					maplepilot.motor_output[MOTOR1]=maplepilot.throttle_control_output-maplepilot.roll_control_output+maplepilot.pitch_control_output-maplepilot.yaw_control_output;
					maplepilot.motor_output[MOTOR2]=maplepilot.throttle_control_output+maplepilot.roll_control_output-maplepilot.pitch_control_output-maplepilot.yaw_control_output;
					maplepilot.motor_output[MOTOR3]=maplepilot.throttle_control_output+maplepilot.roll_control_output+maplepilot.pitch_control_output+maplepilot.yaw_control_output;
					maplepilot.motor_output[MOTOR4]=maplepilot.throttle_control_output-maplepilot.roll_control_output-maplepilot.pitch_control_output+maplepilot.yaw_control_output;
			}
			else
			{
					maplepilot.motor_output[MOTOR1]=maplepilot.throttle_control_output;
					maplepilot.motor_output[MOTOR2]=maplepilot.throttle_control_output;
					maplepilot.motor_output[MOTOR3]=maplepilot.throttle_control_output;
					maplepilot.motor_output[MOTOR4]=maplepilot.throttle_control_output;
					takeoff_ctrl_reset();//清积分
			}			
		}
		
		if(RC_Pilot.auto_relock_flag==1//解锁初时刻，自动上锁标志为存在
			&&RC_Pilot.rc_return_flag==1)//偏航回中时清积分
		{
		  takeoff_ctrl_reset();//清积分
		}
		//解锁后油门最小输出值为怠速值
		for(uint16_t i=0;i<4;i++)
		{
			maplepilot.motor_output[i]=constrain_int16(maplepilot.motor_output[i],THR_IDEL_OUTPUT,THR_MAX_OUTPUT);
		}
	}
	else
	{
	  maplepilot.roll_control_output =0;
		maplepilot.pitch_control_output=0;
		maplepilot.yaw_control_output  =0;	
		maplepilot.throttle_control_output=THR_MIN_OUTPUT;
		
		maplepilot.motor_output[MOTOR1]=maplepilot.throttle_control_output;
		maplepilot.motor_output[MOTOR2]=maplepilot.throttle_control_output;
		maplepilot.motor_output[MOTOR3]=maplepilot.throttle_control_output;
		maplepilot.motor_output[MOTOR4]=maplepilot.throttle_control_output;
		
		motor_idel_enable=true;
		motor_idel_cnt=0;
		motor_idel_last_time=motor_idel_time=0;	
		takeoff_ctrl_reset();//清积分
	}
	//PWM输出
	steer_servo_pwm_m1p0(maplepilot.motor_output[MOTOR1]);
	steer_servo_pwm_m1p1(maplepilot.motor_output[MOTOR2]);
	steer_servo_pwm_m1p2(maplepilot.motor_output[MOTOR3]);
	steer_servo_pwm_m1p3(maplepilot.motor_output[MOTOR4]);
}

