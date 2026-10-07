#include "headfile.h"
#include "sdk.h"
#include "subtask.h"
#include "user.h"


controller_output trackless_output={
	.unlock_flag=LOCK,
};

//航向角度、角速度控制器
float	steer_angle_expect=0,steer_angle_error=0,steer_angle_output=0;
float	steer_gyro_expect=0,steer_gyro_output=0;
float	steer_gyro_scale=steer_gyro_scale_default;//0.5f

controller steerangle_ctrl;		//转向角度外环控制器结构体
controller steergyro_ctrl;		//转向角速度内环控制器结构体//角速度控制参数   1.2  0  3							 
controller distance_ctrl,azimuth_ctrl;//两轮差速位置、航向控制

/***************************************************
函数名: void trackless_params_init(void)
说明:	参数初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void trackless_params_init(void)
{
	//小车硬件相关参数:编码器方向、电机驱动方向、轮子半径、舵机中值等
	float tmp_left_enc_dir=0,tmp_right_enc_dir=1,tmp_left_move_dir=0,tmp_right_move_dir=0,tmp_wheel_radius_cm=2.4,tmp_pulse_num_per_circle=1060;
	float tmp_servo_mid_value1,tmp_servo_mid_value2;
//	ReadFlashParameterOne(LEFT_ENC_DIR_CFG,&tmp_left_enc_dir);
//	ReadFlashParameterOne(RIGHT_ENC_DIR_CFG,&tmp_right_enc_dir);	
//	ReadFlashParameterOne(LEFT_MOVE_DIR_CFG,&tmp_left_move_dir);
//	ReadFlashParameterOne(RIGHT_MOVE_DIR_CFG,&tmp_right_move_dir);
//	ReadFlashParameterOne(TIRE_RADIUS_CM_CFG,&tmp_wheel_radius_cm);
//	ReadFlashParameterOne(PULSE_NPC_CFG,&tmp_pulse_num_per_circle);
//	ReadFlashParameterOne(SERVO_MEDIAN_VALUE_1,&tmp_servo_mid_value1);
//	ReadFlashParameterOne(SERVO_MEDIAN_VALUE_2,&tmp_servo_mid_value2);
	if(isnan(tmp_left_enc_dir)==0) 					trackless_motor.left_encoder_dir_config=tmp_left_enc_dir;				else trackless_motor.left_encoder_dir_config=left_motor_encoder_dir_default;
	if(isnan(tmp_right_enc_dir)==0) 				trackless_motor.right_encoder_dir_config=tmp_right_enc_dir;			else trackless_motor.right_encoder_dir_config=right_motor_encoder_dir_default;
	if(isnan(tmp_left_move_dir)==0) 				trackless_motor.left_motion_dir_config=tmp_left_move_dir;				else trackless_motor.left_motion_dir_config=left_motion_dir_default;
	if(isnan(tmp_right_move_dir)==0)				trackless_motor.right_motion_dir_config=tmp_right_move_dir;			else trackless_motor.right_motion_dir_config=right_motion_dir_default;
	if(isnan(tmp_wheel_radius_cm)==0) 			trackless_motor.wheel_radius_cm=tmp_wheel_radius_cm;						else trackless_motor.wheel_radius_cm=tire_radius_cm_default;
	if(isnan(tmp_pulse_num_per_circle)==0)	trackless_motor.pulse_num_per_circle=tmp_pulse_num_per_circle;	else trackless_motor.pulse_num_per_circle=pulse_cnt_per_circle_default;
	if(isnan(tmp_servo_mid_value1)==0) 			trackless_motor.servo_median_value1=tmp_servo_mid_value1;				else trackless_motor.servo_median_value1=servo_median_value1_default;
	if(isnan(tmp_servo_mid_value2)==0)			trackless_motor.servo_median_value2=tmp_servo_mid_value2;				else trackless_motor.servo_median_value2=servo_median_value2_default;
	
	//速度控制相关参数:期望速度、工作模式
	float tmp_speed_setup=12,tmp_work_mode=0;
//	ReadFlashParameterOne(SPEED_SETUP,&tmp_speed_setup);
//	ReadFlashParameterOne(WORK_MODE,&tmp_work_mode);
	if(isnan(tmp_speed_setup)==0) speed_setup=tmp_speed_setup;else speed_setup=speed_expect_default;
	if(isnan(tmp_work_mode)==0) 	sdk_work_mode=tmp_work_mode;		else sdk_work_mode=work_mode_default;
	
	//转向控制相关参数:角度/角速度pid
	float tmp_turn_kp[2],tmp_turn_ki[2],tmp_turn_kd[2],tmp_turn_scale;
	float tmp_steer_gyro_kp,tmp_steer_gyro_ki,tmp_steer_gyro_kd,tmp_steer_gyro_scale;
    tmp_turn_kp[0]=20,tmp_turn_ki[0]=0,tmp_turn_kd[0]=50;
    tmp_turn_kp[1]=9,tmp_turn_ki[1]=0,tmp_turn_kd[1]=5,tmp_turn_scale=0.15;
    tmp_steer_gyro_kp=1.5,tmp_steer_gyro_ki=0,tmp_steer_gyro_kd=3,tmp_steer_gyro_scale=0.5;
//	ReadFlashParameterThree(CTRL_TURN_KP1,&tmp_turn_kp[0],&tmp_turn_ki[0],&tmp_turn_kd[0]);
//	ReadFlashParameterOne(CTRL_TURN_SCALE,&tmp_turn_scale);
//	ReadFlashParameterThree(CTRL_TURN_KP2,&tmp_turn_kp[1],&tmp_turn_ki[1],&tmp_turn_kd[1]);
//	ReadFlashParameterThree(CTRL_GYRO_KP,&tmp_steer_gyro_kp,&tmp_steer_gyro_ki,&tmp_steer_gyro_kd);
//	ReadFlashParameterOne(CTRL_GYRO_SCALE,&tmp_steer_gyro_scale);	
	//
	if(isnan(tmp_turn_kp[0])==0) 				 seektrack_ctrl[0].kp   =tmp_turn_kp[0];								else seektrack_ctrl[0].kp   =turn_kp_default1;
	if(isnan(tmp_turn_ki[0])==0) 				 seektrack_ctrl[0].ki   =tmp_turn_ki[0];								else seektrack_ctrl[0].ki   =turn_ki_default1;	
	if(isnan(tmp_turn_kd[0])==0) 				 seektrack_ctrl[0].kd   =tmp_turn_kd[0];								else seektrack_ctrl[0].kd   =turn_kd_default1;	
	if(isnan(tmp_turn_scale)==0) 			 turn_scale=tmp_turn_scale;							else turn_scale=turn_scale_default;
	
	if(isnan(tmp_turn_kp[1])==0) 				 seektrack_ctrl[1].kp   =tmp_turn_kp[1];								else seektrack_ctrl[1].kp   =turn_kp_default2;
	if(isnan(tmp_turn_ki[1])==0) 				 seektrack_ctrl[1].ki   =tmp_turn_ki[1];								else seektrack_ctrl[1].ki   =turn_ki_default2;	
	if(isnan(tmp_turn_kd[1])==0) 				 seektrack_ctrl[1].kd   =tmp_turn_kd[1];								else seektrack_ctrl[1].kd   =turn_kd_default2;	
	//
	if(isnan(tmp_steer_gyro_kp)==0) 	 steergyro_ctrl.kp	 =tmp_steer_gyro_kp;		else steergyro_ctrl.kp   =steer_gyro_kp_default;
	if(isnan(tmp_steer_gyro_ki)==0) 	 steergyro_ctrl.ki	 =tmp_steer_gyro_ki;		else steergyro_ctrl.ki   =steer_gyro_ki_default;
	if(isnan(tmp_steer_gyro_kd)==0) 	 steergyro_ctrl.kd	 =tmp_steer_gyro_kd;		else steergyro_ctrl.kd   =steer_gyro_kd_default;
	if(isnan(tmp_steer_gyro_scale)==0) steer_gyro_scale=tmp_steer_gyro_scale; else steer_gyro_scale=steer_gyro_scale_default;	
	
	//速度控制pid参数
	float tmp_speed_kp=15,tmp_speed_ki=0.2,tmp_speed_kd=10;
//	ReadFlashParameterThree(CTRL_SPEED_KP,&tmp_speed_kp,&tmp_speed_ki,&tmp_speed_kd);
	//
	if(isnan(tmp_speed_kp)==0) 				 speed_kp=tmp_speed_kp;		else speed_kp   =speed_kp_default;
	if(isnan(tmp_speed_ki)==0) 				 speed_ki=tmp_speed_ki;		else speed_ki   =speed_ki_default;	
	if(isnan(tmp_speed_kd)==0) 				 speed_kd=tmp_speed_kd;		else speed_kd   =speed_kd_default;
  //平衡控制pid参数
	float tmp_balance_kp,tmp_balance_ki,tmp_balance_kd,tmp_balance_angle;
	float tmp_balance_gyro_kp,tmp_balance_gyro_ki,tmp_balance_gyro_kd;
	
	ReadFlashParameterThree(CTRL_BALANCE_ANGLE1_KP,&tmp_balance_kp,&tmp_balance_ki,&tmp_balance_kd);
	ReadFlashParameterOne(BALANCE_ANGLE_EXPECT,&tmp_balance_angle);
	ReadFlashParameterThree(CTRL_BALANCE_GYRO_KP,&tmp_balance_gyro_kp,&tmp_balance_gyro_ki,&tmp_balance_gyro_kd);	
	//
	if(isnan(tmp_balance_kp)==0) 			selfbalance_angle1_ctrl.kp=tmp_balance_kp;		     else selfbalance_angle1_ctrl.kp     =balance_angle_kp1_default;
	if(isnan(tmp_balance_ki)==0) 			selfbalance_angle1_ctrl.ki=tmp_balance_ki;		     else selfbalance_angle1_ctrl.ki     =balance_angle_ki1_default;	
	if(isnan(tmp_balance_kd)==0) 			selfbalance_angle1_ctrl.kd=tmp_balance_kd;		     else selfbalance_angle1_ctrl.kd     =balance_angle_kd1_default;
	if(isnan(tmp_balance_angle)==0)   balance_angle_expect=tmp_balance_angle;	 				 else balance_angle_expect =balance_angle_default;
	if(isnan(tmp_balance_gyro_kp)==0) 			selfbalance_gyro_ctrl.kp=tmp_balance_gyro_kp;		     else selfbalance_gyro_ctrl.kp     =balance_gyro_kp_default;
	if(isnan(tmp_balance_gyro_ki)==0) 			selfbalance_gyro_ctrl.ki=tmp_balance_gyro_ki;		     else selfbalance_gyro_ctrl.ki     =balance_gyro_ki_default;	
	if(isnan(tmp_balance_gyro_kd)==0) 			selfbalance_gyro_ctrl.kd=tmp_balance_gyro_kd;		     else selfbalance_gyro_ctrl.kd     =balance_gyro_kd_default;
	
	//平衡速度控制pid参数
	float tmp_bspeed_kp,tmp_bspeed_ki,tmp_bspeed_kd;
	ReadFlashParameterThree(CTRL_BALANCE_SPEED_KP,&tmp_bspeed_kp,&tmp_bspeed_ki,&tmp_bspeed_kd);
	if(isnan(tmp_bspeed_kp)==0) 				 balance_speed_kp=tmp_bspeed_kp;		else balance_speed_kp   =balance_speed_kp_default;
	if(isnan(tmp_bspeed_ki)==0) 				 balance_speed_ki=tmp_bspeed_ki;		else balance_speed_ki   =balance_speed_ki_default;	
	if(isnan(tmp_bspeed_kd)==0) 				 balance_speed_kd=tmp_bspeed_kd;		else balance_speed_kd   =balance_speed_kd_default;
	
	//平衡速度中速度、转向使能参数
	float bspeed_ctrl_enable,bsteer_ctrl_enable,bctrl_number;
	ReadFlashParameterOne(BALANCE_VEL_CTRL_ENABLE,&bspeed_ctrl_enable);
	ReadFlashParameterOne(BALANCE_DIR_CTRL_ENABLE,&bsteer_ctrl_enable);
	ReadFlashParameterOne(BALANCE_CTRL_NUMBER,&bctrl_number);
	if(isnan(bspeed_ctrl_enable)==0) 	  balance_speed_ctrl_enable=bspeed_ctrl_enable;		else balance_speed_ctrl_enable   =balance_speed_ctrl_enable_default;
	if(isnan(bsteer_ctrl_enable)==0) 	  balance_steer_ctrl_enable=bsteer_ctrl_enable;		else balance_steer_ctrl_enable   =balance_steer_ctrl_enable_default;
	if(isnan(bctrl_number)==0) 	        balance_ctrl_loop_num=bctrl_number;		          else balance_ctrl_loop_num       =balance_ctrl_number_enable_default;
	
	
	//预留参数
	float tmp_reserved_params[20];
	for(uint16_t i=0;i<20;i++)
	{
		ReadFlashParameterOne(RESERVED_PARAMS_1+i,&tmp_reserved_params[i]);
	}
	if(isnan(tmp_reserved_params[0])==0) 	park_params._track_speed_cmps=tmp_reserved_params[0];								else park_params._track_speed_cmps=track_speed_cmps_default;
	if(isnan(tmp_reserved_params[1])==0) 	park_params._start_point_adjust1=tmp_reserved_params[1];						else park_params._start_point_adjust1=start_point_adjust1_default;
	if(isnan(tmp_reserved_params[2])==0) 	park_params._forward_distance_cm=tmp_reserved_params[2];						else park_params._forward_distance_cm=forward_distance_cm_default;
	if(isnan(tmp_reserved_params[3])==0) 	park_params._backward_distance1_cm=tmp_reserved_params[3];					else park_params._backward_distance1_cm=backward_distance1_cm_default;
	if(isnan(tmp_reserved_params[4])==0) 	park_params._backward_distance2_cm=tmp_reserved_params[4];					else park_params._backward_distance2_cm=backward_distance2_cm_default;
	if(isnan(tmp_reserved_params[5])==0) 	park_params._out_forward_distance1_cm=tmp_reserved_params[5];				else park_params._out_forward_distance1_cm=out_forward_distance1_cm_default;
	if(isnan(tmp_reserved_params[6])==0) 	park_params._out_forward_distance2_cm=tmp_reserved_params[6];				else park_params._out_forward_distance2_cm=out_forward_distance2_cm_default;
	if(isnan(tmp_reserved_params[7])==0) 	park_params._start_point_adjust2=tmp_reserved_params[7];						else park_params._start_point_adjust2=start_point_adjust2_default;
	if(isnan(tmp_reserved_params[8])==0) 	park_params._parallel_backward_distance1_cm=tmp_reserved_params[8];	else park_params._parallel_backward_distance1_cm=parallel_backward_distance1_cm_default;
	if(isnan(tmp_reserved_params[9])==0) 	park_params._parallel_backward_distance2_cm=tmp_reserved_params[9];	else park_params._parallel_backward_distance2_cm=parallel_backward_distance2_cm_default;
	if(isnan(tmp_reserved_params[10])==0) park_params._parallel_backward_distance3_cm=tmp_reserved_params[10];else park_params._parallel_backward_distance3_cm=parallel_backward_distance3_cm_default;

 //电池低压报警参数
	float tmp_vbat_enable,tmp_vbat_upper,tmp_vbat_lower;
	ReadFlashParameterThree(NO_VOLTAGE_ENABLE,&tmp_vbat_enable,&tmp_vbat_upper,&tmp_vbat_lower);		
	if(isnan(tmp_vbat_enable)==0) 	vbat.enable=tmp_vbat_enable;		else vbat.enable=no_voltage_enable_default;
	if(isnan(tmp_vbat_upper)==0) 	  vbat.upper=tmp_vbat_upper;			else vbat.upper=no_voltage_upper_default;
	if(isnan(tmp_vbat_lower)==0)   	vbat.lower=tmp_vbat_lower;			else vbat.lower=no_voltage_lower_default;	
}

/***************************************************
函数名: void ctrl_params_init(void)
说明:	pid控制器参数初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void ctrl_params_init(void)
{
	pid_control_init(&seektrack_ctrl[0],//待初始化控制器结构体
										turn_kp_default1,//比例参数
										turn_ki_default1,//积分参数
										turn_kd_default1,//微分参数
										20, //偏差限幅值
										0,  //积分限幅值
										500,//控制器输出限幅值
										1,	//偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										6); //微分间隔时间
	

	pid_control_init(&seektrack_ctrl[1],//待初始化控制器结构体
										turn_kp_default2,//比例参数
										turn_ki_default2,//积分参数
										turn_kd_default2,//微分参数
										20, //偏差限幅值
										0,  //积分限幅值
										500,//控制器输出限幅值
										1,	//偏差限幅标志位
										0,0,//积分分离标志位与引入积分控制时的限幅值
										1); //微分间隔时间

	pid_control_init(&selfbalance_angle1_ctrl,//待初始化控制器结构体
									 balance_angle_kp1_default,//比例参数
									 balance_angle_ki1_default,//积分参数
									 balance_angle_kd1_default,//微分参数
									 30, //偏差限幅值
									 0,  //积分限幅值
									 999,//控制器输出限幅值
									 1,	 //偏差限幅标志位
									 0,0,//积分分离标志位与引入积分控制时的限幅值
									 1); //微分间隔时间
									 
	pid_control_init(&selfbalance_gyro_ctrl,//待初始化控制器结构体
									 balance_gyro_kp_default,//比例参数
									 balance_gyro_ki_default,//积分参数
									 balance_gyro_kd_default,//微分参数
										500, //偏差限幅值
										300, //积分限幅值
										999, //控制器输出限幅值
										1,  	//偏差限幅标志位
										0,0, //积分分离标志位与引入积分控制时的限幅值
										1);  //微分间隔时间	

	pid_control_init(&steerangle_ctrl,//待初始化控制器结构体
										5.0f,//比例参数
										0,	 //积分参数
										0,	 //微分参数
										50,  //偏差限幅值
										0,   //积分限幅值
										500, //控制器输出限幅值
										1,   //偏差限幅标志位
										0,0, //积分分离标志位与引入积分控制时的限幅值
										1);  //微分间隔时间

	pid_control_init(&steergyro_ctrl,//待初始化控制器结构体
										steer_gyro_kp_default,//比例参数
										steer_gyro_ki_default,//积分参数
										steer_gyro_kd_default,//微分参数
										200, //偏差限幅值
										300, //积分限幅值
										500, //控制器输出限幅值
										1,  	//偏差限幅标志位
										0,0, //积分分离标志位与引入积分控制时的限幅值
										1);  //微分间隔时间
	
	pid_control_init(&distance_ctrl,//待初始化控制器结构体
										0.5,//比例参数
										0,//积分参数
										0,//微分参数
										75, //偏差限幅值
										0, //积分限幅值
										500, //控制器输出限幅值
										1,  	//偏差限幅标志位
										0,0, //积分分离标志位与引入积分控制时的限幅值
										1);  //微分间隔时间
	azimuth_ctrl=steerangle_ctrl;	
}

/***************************************************
函数名: void steer_angle_ctrl(void)
说明:	航向角度控制
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void steer_angle_ctrl(void)
{
	//角度控制
	steerangle_ctrl.expect=steer_angle_expect;
	steerangle_ctrl.feedback=smartcar_imu.rpy_deg[_YAW];
	steerangle_ctrl.error=steerangle_ctrl.expect-steerangle_ctrl.feedback;
	/***********************偏航角偏差超过+-180处理*****************************/
	if(steerangle_ctrl.error<-180) steerangle_ctrl.error=steerangle_ctrl.error+360;
	if(steerangle_ctrl.error>	180) steerangle_ctrl.error=steerangle_ctrl.error-360;				
	steerangle_ctrl.error=constrain_float(steerangle_ctrl.error,-50,50);
	steer_angle_output=steerangle_ctrl.kp*steerangle_ctrl.error;
	steer_angle_output=constrain_float(steer_angle_output,-500,500);
	//记录偏差值,用于判断转向执行状态
	steer_angle_error=steerangle_ctrl.error;
}

/***************************************************
函数名: void steer_gyro_ctrl(void)
说明:	航向角速度控制
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void steer_gyro_ctrl(void)
{
	steergyro_ctrl.expect=steer_gyro_expect;//期望
	steergyro_ctrl.feedback=smartcar_imu.yaw_gyro_enu;//偏航角度反馈
	pid_control_run(&steergyro_ctrl);		  //控制器运算
	steer_gyro_output=steergyro_ctrl.output;	
}

/***************************************************
函数名: void steer_control(float *output)
说明:	航向控制
入口:	float *output-控制器输出指针
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void steer_control(float *output)
{
	controller_output *_flight_output=&trackless_output;
	
	switch(trackless_output.yaw_ctrl_mode)
	{
		case ROTATE:
		{
			if(_flight_output->yaw_outer_control_output==0)//偏航控制杆置于中位
			{
				if(steer_angle_expect==0)
				{
					steer_angle_expect=smartcar_imu.rpy_deg[_YAW];
				}
				//角度控制
				steer_angle_ctrl();
				//角速度期望
				steer_gyro_expect=steer_angle_output;				
			}
			else
			{
				steer_angle_expect=0;
				//角速度期望
				steer_gyro_expect=_flight_output->yaw_outer_control_output;	
			}			
		}
		break;
		case AZIMUTH://绝对航向角度
	  {
			if(_flight_output->yaw_ctrl_start==1)//更新偏航角度期望
			{
				float yaw_tmp=_flight_output->yaw_outer_control_output;
				if(yaw_tmp<0) 	yaw_tmp+=360;
				if(yaw_tmp>360) yaw_tmp-=360;
				steer_angle_expect=yaw_tmp;
				_flight_output->yaw_ctrl_start=0;
				_flight_output->yaw_ctrl_cnt=0;
				_flight_output->yaw_ctrl_end=0;
			}
			
			if(_flight_output->yaw_ctrl_end==0)//判断偏航角是否控制完毕
			{
				if(ABS(steer_angle_error)<3.0f) _flight_output->yaw_ctrl_cnt++;
				else _flight_output->yaw_ctrl_cnt/=2;
				
				if(_flight_output->yaw_ctrl_cnt>=200)  _flight_output->yaw_ctrl_end=1;
			}			
			//角度控制
			steer_angle_ctrl();
			//角速度期望
			steer_gyro_expect=steer_angle_output;					
		}
		break;
		case CLOCKWISE://顺时针————相对给定时刻的航向角度
		{
			if(_flight_output->yaw_ctrl_start==1)//更新偏航角度期望
			{
				float yaw_tmp=smartcar_imu.rpy_deg[_YAW]-_flight_output->yaw_outer_control_output;
				if(yaw_tmp<0) 	yaw_tmp+=360;
				if(yaw_tmp>360) yaw_tmp-=360;
				steer_angle_expect=yaw_tmp;
				_flight_output->yaw_ctrl_start=0;
				_flight_output->yaw_ctrl_cnt=0;
				_flight_output->yaw_ctrl_end=0;
			}
			
			if(_flight_output->yaw_ctrl_end==0)//判断偏航角是否控制完毕
			{
				if(ABS(steer_angle_error)<3.0f) _flight_output->yaw_ctrl_cnt++;
				else _flight_output->yaw_ctrl_cnt/=2;
				
				if(_flight_output->yaw_ctrl_cnt>=200)  _flight_output->yaw_ctrl_end=1;
			}
			
			//角度控制
			steer_angle_ctrl();
			//角速度期望
			steer_gyro_expect=steer_angle_output;		
		}
		break;		
		case ANTI_CLOCKWISE://逆时针——相对给定时刻的航向角度
		{
			if(_flight_output->yaw_ctrl_start==1)//更新偏航角度期望
			{
				float yaw_tmp=smartcar_imu.rpy_deg[_YAW]+_flight_output->yaw_outer_control_output;
				if(yaw_tmp<0) 	yaw_tmp+=360;
				if(yaw_tmp>360) yaw_tmp-=360;
				steer_angle_expect=yaw_tmp;
				_flight_output->yaw_ctrl_start=0;
				_flight_output->yaw_ctrl_cnt=0;
				_flight_output->yaw_ctrl_end=0;
			}
			
			if(_flight_output->yaw_ctrl_end==0)//判断偏航角是否控制完毕
			{
				if(ABS(steer_angle_error)<3.0f) _flight_output->yaw_ctrl_cnt++;
				else _flight_output->yaw_ctrl_cnt/=2;
				
				if(_flight_output->yaw_ctrl_cnt>=200)  _flight_output->yaw_ctrl_end=1;
			}
			
			//角度控制
			steer_angle_ctrl();
			//角速度期望
			steer_gyro_expect=steer_angle_output;		
		}
		break;
		case CLOCKWISE_TURN://以某一角速度顺时针旋转多长时间
		{
			uint32_t curr_time_ms=millis();
			
			if(_flight_output->yaw_ctrl_start==1)//更新偏航角度期望
			{
				//对最大偏航角速度进行限制
				steer_gyro_expect=-_flight_output->yaw_outer_control_output;//偏航角速度环期望，来源于偏航角度控制器输出
				_flight_output->yaw_ctrl_start=0;
				_flight_output->yaw_ctrl_cnt=0;
				_flight_output->yaw_ctrl_end=0;
				_flight_output->start_time_ms=curr_time_ms;//记录开始转动的时间				
			}
			
			if(_flight_output->yaw_ctrl_end==0)//判断偏航角是否控制完毕
			{
				uint32_t tmp=curr_time_ms-_flight_output->start_time_ms;
				if(tmp>=_flight_output->execution_time_ms)					
					_flight_output->yaw_ctrl_end=1;
			}
			else
			{
				//执行完毕后,
				//1、将偏航角速度期望给0,
				//2、停止旋转并锁定当前偏航角，需要退出CLOCKWISE_TURN模式，角度期望才会有效，因为此模式没有对偏航角度进行控制
				steer_gyro_expect=0;
				steer_angle_expect=smartcar_imu.rpy_deg[_YAW];
			}
		}
		break;
		case ANTI_CLOCKWISE_TURN://以某一角速度逆时针旋转多长时间
		{
			uint32_t curr_time_ms=millis();
			
			if(_flight_output->yaw_ctrl_start==1)//更新偏航角度期望
			{
				//对最大偏航角速度进行限制
				steer_gyro_expect=_flight_output->yaw_outer_control_output;//偏航角速度环期望，来源于偏航角度控制器输出
				_flight_output->yaw_ctrl_start=0;
				_flight_output->yaw_ctrl_cnt=0;
				_flight_output->yaw_ctrl_end=0;
				_flight_output->start_time_ms=curr_time_ms;//记录开始转动的时间				
			}
			
			if(_flight_output->yaw_ctrl_end==0)//判断偏航角是否控制完毕
			{
				uint32_t tmp=curr_time_ms-_flight_output->start_time_ms;
				if(tmp>=_flight_output->execution_time_ms)					
					_flight_output->yaw_ctrl_end=1;
			}
			else
			{
				//执行完毕后,
				//1、将偏航角速度期望给0,
				//2、停止旋转并锁定当前偏航角，需要退出CLOCKWISE_TURN模式，角度期望才会有效，因为此模式没有对偏航角度进行控制
				steer_gyro_expect=0;
				steer_angle_expect=smartcar_imu.rpy_deg[_YAW];
			}
		}
		break;
		default:
		{
			steer_gyro_expect=0;
			steer_angle_expect=smartcar_imu.rpy_deg[_YAW];
		}
	}
	//角速度控制
	steer_gyro_ctrl();
	*output=-steer_gyro_output;
}

/***************************************************
函数名: void get_distance_error(vector2f t)
说明:	获取目标位置和当前位置的偏差
入口:	vector2f t-目标位置
出口:	无
备注:	无
作者:	无名创新
****************************************************/
float get_distance_error(vector2f t)
{
	return sqrtf(sq(t.x-smartcar_imu.state_estimation.pos.x)+sq(t.y-smartcar_imu.state_estimation.pos.y));
}

vector2f target={0,0};
/***************************************************
函数名: void position_control(void)
说明:	二维目标位置控制
入口:	无
出口:	无
备注:	
		y+(初始车头左侧)
		*
		*
		*
		*
		*
		*
		***********x+(初始车头方向)
作者:	无名创新
****************************************************/
void position_control(void)//已任意姿态到达目标点,无速度末端角度约束
{
	if(ngs_nav_ctrl.update_flag==1)//地面站/ROS发送串口控制指令
	{
		target.x=ngs_nav_ctrl.x;
		target.y=ngs_nav_ctrl.y;
		
		ngs_nav_ctrl.update_flag=0;
		ngs_nav_ctrl.ctrl_finish_flag=0;
		ngs_nav_ctrl.cnt=0;	
	}
	
	//航向控制
	float theta=atan2f((target.y-smartcar_imu.state_estimation.pos.y),(target.x-smartcar_imu.state_estimation.pos.x));//目标航向
	//角度控制
	azimuth_ctrl.expect=theta*RAD2DEG;
	azimuth_ctrl.feedback=smartcar_imu.rpy_deg[_YAW];
	azimuth_ctrl.error=azimuth_ctrl.expect-azimuth_ctrl.feedback;
	/***********************偏航角偏差超过+-180处理*****************************/
	if(azimuth_ctrl.error<-180) azimuth_ctrl.error=azimuth_ctrl.error+360;
	if(azimuth_ctrl.error> 180) azimuth_ctrl.error=azimuth_ctrl.error-360;				
	azimuth_ctrl.error=constrain_float(azimuth_ctrl.error,-30,30);
	azimuth_ctrl.output=azimuth_ctrl.kp*azimuth_ctrl.error;
	
	//限制最大期望角速度，轮子与底边摩擦力小时改下此值，能减小里程计的距离误差
	steer_angle_output=constrain_float(azimuth_ctrl.output,-100,100);
	
	steergyro_ctrl.expect=steer_angle_output;//期望
	steergyro_ctrl.feedback=smartcar_imu.yaw_gyro_enu;//偏航角度反馈
	pid_control_run(&steergyro_ctrl);		  //控制器运算
	steer_gyro_output=steergyro_ctrl.output;

	//距离控制
	distance_ctrl.expect=0;
	distance_ctrl.feedback=-get_distance_error(target);
	distance_ctrl.error=distance_ctrl.expect-distance_ctrl.feedback;
  distance_ctrl.error=constrain_float(distance_ctrl.error,-50,50);
	distance_ctrl.output=distance_ctrl.kp*distance_ctrl.error;
	distance_ctrl.output=constrain_float(distance_ctrl.output,-20,20);//对速度期望进行限制，避免轮胎打滑造成里程计误差
	
	//航点遍历结束标志判断
	if(ngs_nav_ctrl.cnt<10)//持续50ms满足
	{
		if(ABS(distance_ctrl.error)<=3.0f) ngs_nav_ctrl.cnt++;
		else ngs_nav_ctrl.cnt/=2;
	}
	else
	{
		ngs_nav_ctrl.ctrl_finish_flag=1;
		ngs_nav_ctrl.cnt=0;
	}
	
	if(ngs_nav_ctrl.ctrl_finish_flag==1)//到达目标位置后，速度期望给0
	{
		steer_gyro_output=0;
		distance_ctrl.output=0;
	}
}


/***************************************************
函数名: void distance_control(void)
说明:	距离控制
入口:	无 
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void distance_control(void)
{
	//距离控制
	distance_ctrl.feedback=smartcar_imu.state_estimation.distance;
	distance_ctrl.error=distance_ctrl.expect-distance_ctrl.feedback;
  distance_ctrl.error=constrain_float(distance_ctrl.error,-50,50);
	distance_ctrl.output=3.0f*distance_ctrl.error;//
	distance_ctrl.output=constrain_float(distance_ctrl.output,-20,20);//对速度期望进行限制，避免轮胎打滑造成里程计误差
}
