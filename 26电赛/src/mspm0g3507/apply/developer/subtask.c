#include "headfile.h"
#include "subtask.h"

#define SUBTASK_NUM 20
#define flight_subtask_delta 5//5ms



uint16_t flight_subtask_cnt[SUBTASK_NUM]={0};//飞行任务子线程计数器，可以用于控制每个航点子线程的执行
uint32_t flight_global_cnt[SUBTASK_NUM]={0}; //飞行任务子线全局计数器，可以结合位置偏差用于判断判断航点是否到达
uint32_t execute_time_ms[SUBTASK_NUM]={0};//飞行任务子线执行时间，可以用于设置某个子线程的执行时间

void flight_subtask_reset(void)
{
	for(uint16_t i=0;i<SUBTASK_NUM;i++)
	{
		flight_subtask_cnt[i]=0;
		execute_time_ms[i]=0;
		flight_global_cnt[i]=0;
	}
}



void flight_subtask_1(void)//顺时针转90°
{
	static uint8_t n=0;
	if(flight_subtask_cnt[n]==0)
	{
		trackless_output.yaw_ctrl_mode=CLOCKWISE;
		trackless_output.yaw_ctrl_start=1;
		trackless_output.yaw_outer_control_output  =90;//顺时针90度	
		flight_subtask_cnt[n]=1;		
	}
	else if(flight_subtask_cnt[n]==1)
	{
		trackless_output.yaw_ctrl_mode=CLOCKWISE;
		trackless_output.yaw_outer_control_output  =0;
		
		if(trackless_output.yaw_ctrl_end==1)  flight_subtask_cnt[n]=2;//执行完毕后，切换到下一阶段	
	}
	else if(flight_subtask_cnt[n]==2)
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
	else//其它情形
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];		
	}
}

void flight_subtask_2(void)//逆时针转90°
{
	static uint8_t n=1;
	if(flight_subtask_cnt[n]==0)
	{
		trackless_output.yaw_ctrl_mode=ANTI_CLOCKWISE;
		trackless_output.yaw_ctrl_start=1;
		trackless_output.yaw_outer_control_output  =90;//逆时针90度
		flight_subtask_cnt[n]=1;		
	}
	else if(flight_subtask_cnt[n]==1)
	{
		trackless_output.yaw_ctrl_mode=ANTI_CLOCKWISE;
		trackless_output.yaw_outer_control_output  =0;
		
		if(trackless_output.yaw_ctrl_end==1)  flight_subtask_cnt[n]=2;//执行完毕后，切换到下一阶段	
	}
	else if(flight_subtask_cnt[n]==2)
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
	else//其它情形
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];		
	}
}



//以30deg/s的角速度顺时针转动3000ms，完成后降落
void flight_subtask_3(void)
{
	static uint8_t n=2;
	if(flight_subtask_cnt[n]==0)
	{
		
		trackless_output.yaw_ctrl_mode=CLOCKWISE_TURN;
		trackless_output.yaw_ctrl_start=1;
		trackless_output.yaw_outer_control_output  =30;//以30deg/s的角速度顺时针转动3000ms
		trackless_output.execution_time_ms=3000;//执行时间
		flight_subtask_cnt[n]=1;		
	}
	else if(flight_subtask_cnt[n]==1)
	{
		trackless_output.yaw_ctrl_mode=CLOCKWISE_TURN;
		trackless_output.yaw_outer_control_output  =0;
		
	  if(trackless_output.yaw_ctrl_end==1)  flight_subtask_cnt[n]=2;//执行完毕后，切换到下一阶段		
	}
	else if(flight_subtask_cnt[n]==2)
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
	else
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
}

//以30deg/s的角速度逆时针转动3000ms
void flight_subtask_4(void)
{
	static uint8_t n=3;
	if(flight_subtask_cnt[n]==0)
	{
		trackless_output.yaw_ctrl_mode=ANTI_CLOCKWISE_TURN;
		trackless_output.yaw_ctrl_start=1;
		trackless_output.yaw_outer_control_output  =30;//以30deg/s的角速度顺时针转动3000ms
		trackless_output.execution_time_ms=3000;//执行时间
		flight_subtask_cnt[n]=1;		
	}
	else if(flight_subtask_cnt[n]==1)
	{
		trackless_output.yaw_ctrl_mode=ANTI_CLOCKWISE_TURN;
		trackless_output.yaw_outer_control_output  =0;
		
	  if(trackless_output.yaw_ctrl_end==1)  flight_subtask_cnt[n]=2;//执行完毕后，切换到下一阶段		
	}
	else if(flight_subtask_cnt[n]==2)
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
	else
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
	}
}



void flight_subtask_5(void)
{
	static uint8_t n=4;
	if(flight_subtask_cnt[n]==0)
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
		speed_setup=40;//前进
		if(rangefinder.distance<50)//前方距离比较小，继续转动
		{
			speed_setup=0;//停止
			flight_subtask_cnt[n]=1;	
		}			
	}
	else if(flight_subtask_cnt[n]==1)
	{
		trackless_output.yaw_ctrl_mode=CLOCKWISE;
		trackless_output.yaw_ctrl_start=1;
		trackless_output.yaw_outer_control_output  =90;//顺时针90度
		
		speed_setup=0;//停止		
		flight_subtask_cnt[n]=2;		
	}
	else if(flight_subtask_cnt[n]==2)
	{
		trackless_output.yaw_ctrl_mode=CLOCKWISE;
		trackless_output.yaw_outer_control_output  =0;
		
		if(trackless_output.yaw_ctrl_end==1)  flight_subtask_cnt[n]=3;//执行完毕后，切换到下一阶段	
	}
	else if(flight_subtask_cnt[n]==3)//转动完毕后，继续判断前方距离
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
		if(rangefinder.distance<50)//前方距离比较小，继续转动
		{
			flight_subtask_cnt[n]=1;//继续转动	
		}
		else
		{
			flight_subtask_cnt[n]=0;//恢复前进	
		}
	}
	else//其它情形
	{
		trackless_output.yaw_ctrl_mode=ROTATE;
		trackless_output.yaw_outer_control_output  =RC_Data.rc_rpyt[RC_ROLL];
		speed_setup=RC_Data.rc_rpyt[RC_PITCH];//速度期望来源于俯仰杆给定
	}
} 


#define start_point_precision_cm 0.5f
#define distance_precision_cm 1.0f
#define steer_execute_time_ms 500
#define steer_value_default 300
#define freedom_time_ms 5000					//在车库里面停留时间



_park_params park_params={
	._track_speed_cmps=track_speed_cmps_default,
	._start_point_adjust1=start_point_adjust1_default,
	._forward_distance_cm=forward_distance_cm_default,
	._backward_distance1_cm=backward_distance1_cm_default,
	._backward_distance2_cm=backward_distance2_cm_default,
	._out_forward_distance1_cm=out_forward_distance1_cm_default,
	._out_forward_distance2_cm=out_forward_distance2_cm_default,
	._start_point_adjust2=start_point_adjust2_default,
	._parallel_backward_distance1_cm=parallel_backward_distance1_cm_default,
	._parallel_backward_distance2_cm=parallel_backward_distance2_cm_default,
	._parallel_backward_distance3_cm=parallel_backward_distance3_cm_default
};


void auto_reverse_stall_park(void)
{
	static uint8_t n=5;
	static float steer_gradient_cnt=0;
	static float servo_ctrl_value=300;
	if(flight_subtask_cnt[n]==0)//第一阶段自主寻迹
	{
		speed_ctrl_mode=1;//速度控制方式为两轮单独控制
//		vision_turn_control_50hz(&turn_ctrl_pwm);//基于OPENMV视觉处理的转向控制
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+turn_ctrl_pwm);	
		//期望速度
		speed_expect[0]=park_params._track_speed_cmps;//左边轮子速度期望
		speed_expect[1]=park_params._track_speed_cmps;//右边轮子速度期望
		//速度控制
		speed_control_100hz(speed_ctrl_mode);

		//判断途径车库边线情况
		if(camera1.carpark_num==3)//经过库2
		{
			flight_subtask_cnt[n]++;
			//继续前进5cm
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._start_point_adjust1;			
		}
	}
	else if(flight_subtask_cnt[n]==1)//视觉识别到车库特征点后,执行继续前进或者后退
	{
		if(park_params._start_point_adjust1>0)//如果是向前调整开始倒车点，则继续寻迹
		{
//			vision_turn_control_50hz(&turn_ctrl_pwm);//基于OPENMV视觉处理的转向控制
		}
		else turn_ctrl_pwm=0;//轮胎回正后继续倒车
		
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+turn_ctrl_pwm);	
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(flight_global_cnt[n]<20)//连续20次满足位置偏差很小,即认为位置控制完成
		{
			if(ABS(distance_ctrl.error)<start_point_precision_cm)	flight_global_cnt[n]++;	
			else flight_global_cnt[n]/=2;			
		}
		else 
		{
			flight_global_cnt[n]=0;
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=-steer_value_default;
			steer_gradient_cnt=execute_time_ms[n];
		}
	}
	else if(flight_subtask_cnt[n]==2)//第二阶段停车后,轮子左打
	{
		float steer_gradient_value=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._forward_distance_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==3)//第三阶段
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;
			//期望速度
			//speed_expect[0]=0;//左边轮子速度期望
			//speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];	
		}
	}
	else	if(flight_subtask_cnt[n]==4)//第四阶段
	{
		float steer_gradient_value0_1=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);//从0渐变到1
		float steer_gradient_value_n1_p1=(steer_gradient_value0_1-0.5f)/0.5f;//从-1渐变到1
		
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value_n1_p1);
		
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
	  //期望速度
		speed_expect[0]=0;//左边轮子速度期望
		speed_expect[1]=0;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance-park_params._backward_distance1_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==5)//第五阶段
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];		
		}
	}
	else	if(flight_subtask_cnt[n]==6)//第六阶段
	{
		float steer_gradient_value0_1=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);//从0渐变到1
		float steer_gradient_value_1_0=1.0f-steer_gradient_value0_1;//从1渐变到0
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value_1_0);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance-park_params._backward_distance2_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==7)//第五阶段
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=freedom_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=0;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望		
		}
	}
	else if(flight_subtask_cnt[n]==8)//在车尾停泊5S
	{
		//转向控制
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._out_forward_distance1_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==9)//出库先前进
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=300;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望		
		}	
	}
	else if(flight_subtask_cnt[n]==10)
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		speed_control_100hz(speed_ctrl_mode);
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._out_forward_distance2_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==11)//出库转向
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=0;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望		
		}	
	}
	else if(flight_subtask_cnt[n]==12)//倒车入库结束，接下一进程
	{
		for(uint16_t i=0;i<4;i++)
		{
			camera1.carpark_flag[0][i]=0;
			camera1.carpark_flag[1][i]=0;
		}
		camera1.carpark_num=0;
		sdk_work_mode+=1;
	}
	else
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);	
	}
}



void auto_parallel_park(void)
{
	static uint8_t n=6;	
	static float steer_gradient_cnt=0;
	static float servo_ctrl_value=300;
	
	if(flight_subtask_cnt[n]==0)//第一阶段自主寻迹
	{
		speed_ctrl_mode=1;//速度控制方式为两轮单独控制
	//	vision_turn_control_50hz(&turn_ctrl_pwm);//基于OPENMV视觉处理的转向控制
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+turn_ctrl_pwm);	
		//期望速度
		speed_expect[0]=park_params._track_speed_cmps;//左边轮子速度期望
		speed_expect[1]=park_params._track_speed_cmps;//右边轮子速度期望
		//速度控制
		speed_control_100hz(speed_ctrl_mode);

		//判断途径车库边线情况
		if(camera1.carpark_num==3)//经过库2
		{
			flight_subtask_cnt[n]++;
			//继续前进5cm
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._start_point_adjust2;			
		}
	}
	else if(flight_subtask_cnt[n]==1)//执行继续前进10cm
	{
		if(park_params._start_point_adjust2>0)//如果是向前调整开始倒车点，则继续寻迹
		{
//			vision_turn_control_50hz(&turn_ctrl_pwm);//基于OPENMV视觉处理的转向控制
		}
		else turn_ctrl_pwm=0;//轮胎回正后继续倒车
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+turn_ctrl_pwm);	
		
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(flight_global_cnt[n]<20)
		{
			if(ABS(distance_ctrl.error)<start_point_precision_cm)	flight_global_cnt[n]++;	
			else flight_global_cnt[n]/=2;			
		}
		else 
		{
			flight_global_cnt[n]=0;
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];
		}
	}
	else if(flight_subtask_cnt[n]==2)//第二阶段刹车、转向
	{
		float steer_gradient_value=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance-park_params._parallel_backward_distance1_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==3)//第三阶段
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];	
		}
	}
	else if(flight_subtask_cnt[n]==4)//车头回正
	{
		float steer_gradient_value0_1=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);//从0渐变到1
		float steer_gradient_value_1_0=1.0f-steer_gradient_value0_1;//从1渐变到0
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value_1_0);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance-park_params._parallel_backward_distance2_cm;
		}			
	}
	else if(flight_subtask_cnt[n]==5)//竖直后退
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=-steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];	
		}	
	}
	else if(flight_subtask_cnt[n]==6)//车轮向左侧打
	{
		float steer_gradient_value=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance-park_params._parallel_backward_distance3_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==7)//车轮向左侧打并后退
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=freedom_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=0;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
		}		
	}
	else if(flight_subtask_cnt[n]==8)//车轮直接回正,原地等待5s
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		speed_setup=0;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=-steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];
		}	
	}
	else if(flight_subtask_cnt[n]==9)//轮胎向左打，准备出库
	{
		float steer_gradient_value=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value);	
		//期望速度
		speed_expect[0]=0;//左边轮子速度期望
		speed_expect[1]=0;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);	
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=-steer_value_default;	
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._parallel_backward_distance3_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==10)//车轮向左侧打并前进
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=-steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];
		}		
	}
	else if(flight_subtask_cnt[n]==11)//轮胎逐渐回正后继续前进
	{
		float steer_gradient_value0_1=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);//从0渐变到1
		float steer_gradient_value_1_0=1.0f-steer_gradient_value0_1;//从1渐变到0
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value_1_0);
		//速度控制
		speed_control_100hz(speed_ctrl_mode);
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._parallel_backward_distance2_cm;
		}			
	}
	else if(flight_subtask_cnt[n]==12)//回正后继续前进
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
			steer_gradient_cnt=execute_time_ms[n];
		}		
	}
	else if(flight_subtask_cnt[n]==13)//轮胎向右打
	{
		float steer_gradient_value=(float)((steer_gradient_cnt-execute_time_ms[n])/steer_gradient_cnt);
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value*steer_gradient_value);	
		//期望速度
		speed_expect[0]=0;//左边轮子速度期望
		speed_expect[1]=0;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);	
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=steer_execute_time_ms/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=steer_value_default;	
			distance_ctrl.expect=smartcar_imu.state_estimation.distance+park_params._parallel_backward_distance1_cm;
		}		
	}
	else if(flight_subtask_cnt[n]==14)//轮胎向右打后继续前进
	{
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+servo_ctrl_value);
		//距离控制
		distance_control();
		speed_setup=distance_ctrl.output;
		//期望速度
		speed_expect[0]=speed_setup;//左边轮子速度期望
		speed_expect[1]=speed_setup;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);

		if(ABS(distance_ctrl.error)<distance_precision_cm)
		{
			flight_subtask_cnt[n]++;
			execute_time_ms[n]=3000/flight_subtask_delta;//子任务执行时间;
			servo_ctrl_value=0;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
		}		
	}
	else if(flight_subtask_cnt[n]==15)//继续巡线
	{
		speed_ctrl_mode=1;//速度控制方式为两轮单独控制
		//vision_turn_control_50hz(&turn_ctrl_pwm);//基于OPENMV视觉处理的转向控制
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2+turn_ctrl_pwm);	
		//期望速度
		speed_expect[0]=park_params._track_speed_cmps;//左边轮子速度期望
		speed_expect[1]=park_params._track_speed_cmps;//右边轮子速度期望
		//速度控制
		speed_control_100hz(speed_ctrl_mode);	
		
		if(execute_time_ms[n]>0) execute_time_ms[n]--;
		if(execute_time_ms[n]==0) 
		{
			flight_subtask_cnt[n]++;
			servo_ctrl_value=0;
			//期望速度
			speed_expect[0]=0;//左边轮子速度期望
			speed_expect[1]=0;//右边轮子速度期望
		}	
	}
	else//巡线结束后停止
	{
		speed_ctrl_mode=1;//速度控制方式为两轮单独控制
		steer_servo_pwm_m1p3(trackless_motor.servo_median_value2);
		//速度控制
		speed_expect[0]=0;//左边轮子速度期望
		speed_expect[1]=0;//右边轮子速度期望
		speed_control_100hz(speed_ctrl_mode);		
	}
}


