#ifndef __USER_H
#define __USER_H


/***********************************************************************************************************************/
#define left_motor_encoder_dir_default   0
#define right_motor_encoder_dir_default  0
#define left_motion_dir_default   0
#define right_motion_dir_default  0
#define tire_radius_cm_default  2.40f			 //轮胎半径，单位为cm
#define pulse_cnt_per_circle_default  1060 //实际轮子转动一周的脉冲数量 530 1080 40750
#define servo_median_value1_default   1500  //舵机机械中值
#define servo_median_value2_default   1500  //舵机机械中值
#define rangefinder_type_default 0

#define no_voltage_enable_default 0
#define no_voltage_upper_default 7.2f
#define no_voltage_lower_default 5.5f


/***********************************************************************************************************************/
#define balance_speed_ctrl_enable_default 1			//自平衡控制时,速度控制使能默认值
#define balance_steer_ctrl_enable_default 0			//自平衡控制时,转向控制使能默认值
#define balance_ctrl_number_enable_default 1		//自平衡控制模式默认值,暂未用到



/***********************************************************************************************************************/
#define speed_expect_default 			80.0f			//自主寻迹时，速度默认设定值
#define work_mode_default   			0 				//小车工作模式出厂默认值



/***********************************************************************************************************************/
#define turn_kp_default1						30.0f 	//基于红外对管识别轨迹时,自主寻迹的位置控制器比例参数KP	
#define turn_ki_default1						0.0f		//基于红外对管识别轨迹时,自主寻迹的位置控制器积分参数KI	
#define turn_kd_default1						150			//基于红外对管识别轨迹时,自主寻迹的位置控制器微分参数KD	
#define turn_scale_default        	1.5f		//转向控制器输出转换到轮子期望差速时的量程转换系数
#define turn_kp_default2						20.0f		//基于视觉openmv识别轨迹时,自主寻迹的位置控制器比例参数KP
#define turn_ki_default2						0.0f		//基于视觉openmv识别轨迹时,自主寻迹的位置控制器积分参数KI
#define turn_kd_default2						5.0f	  //基于视觉openmv识别轨迹时,自主寻迹的位置控制器微分参数KD	



/***********************************************************************************************************************/
#define steer_gyro_kp_default  		1.5f			//转向陀螺仪控制时，角速度内环比例系数KP
#define steer_gyro_ki_default  		0.0f			//转向陀螺仪控制时，角速度内环积分系数KI
#define steer_gyro_kd_default  		3.0f			//转向陀螺仪控制时，角速度内环微分系数KD	
#define	steer_gyro_scale_default	0.5f			//转向陀螺仪控制时，角速度内环控制器输出转换到轮子期望差速时的量程转换系数



/***********************************************************************************************************************/
#define speed_kp_default  				8.0f			//速度控制器比例参数KP
#define	speed_ki_default					0.6f			//速度控制器积分参数KI
#define	speed_kd_default					0.0f			//速度控制器微分参数KD



/***********************************************************************************************************************/
#define balance_angle_kp1_default  				135.0f	//自平衡单环角度控制器比例参数KP
#define balance_angle_ki1_default  				0.0f		//自平衡单环角度控制器积分参数KI
#define balance_angle_kd1_default  				5.0f		//自平衡单环角度控制器微分参数KD
#define balance_angle_default       			51.5f

#define balance_speed_kp_default        	10			//自平衡时速度控制器比例参数KP
#define balance_speed_ki_default					3			  //自平衡时速度控制器积分参数KI
#define balance_speed_kd_default        	0				//自平衡时速度控制器微分参数KD



/***********************************************************************************************************************/
#define balance_speed_scale_default 			0.04f		//自平衡双环控制时，角速度控制器输出转换到期望姿态倾角时的量程转换系数  0.04f

#define balance_angle_kp2_default  				95.0f		//自平衡双环控制时,角度控制器比例参数KP
#define balance_angle_ki2_default  				0.0f		//自平衡双环控制时,角度控制器积分参数KI
#define balance_angle_kd2_default  				3.5f		//自平衡双环控制时,角度控制器微分参数KD

#define balance_gyro_kp_default  					8.0f		//自平衡双环控制时,角速度控制器比例参数KP
#define balance_gyro_ki_default  					0.5f		//自平衡双环控制时,角速度控制器积分参数KI
#define balance_gyro_kd_default  					1.5f		//自平衡双环控制时,角速度控制器微分参数KD



#endif




