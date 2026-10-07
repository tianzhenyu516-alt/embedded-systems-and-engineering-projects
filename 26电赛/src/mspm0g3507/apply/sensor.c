#include "headfile.h"
#include "sensor.h"
#include "Fusion.h"

#define temperature_ctrl_enable 0//IMU恒温控制使能
																 //1、使用MSPM0栈神扩展板-带温控
																 //0、外接MPU6050-不带温控

lpf_param accel_lpf_param,gyro_lpf_param;
lpf_buf gyro_filter_buf[3],accel_filter_buf[3];

sensor smartcar_imu;
FusionAhrs ahrs;
FusionOffset offset;
#define sampling_frequent 200

/***************************************************
函数名: vector3f_sub(vector3f a,vector3f b,vector3f *c)
说明:	向量作差
入口:	vector3f a-被减数
			vector3f b-减数
			vector3f *c-差
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void vector3f_sub(vector3f a,vector3f b,vector3f *c)
{
	c->x=a.x-b.x;
  c->y=a.y-b.y;
  c->z=a.z-b.z;
}

/***************************************************
函数名: void euler_to_quaternion(float *rpy,float *q)
说明:	欧拉角转四元数
入口:	float *rpy-欧拉角
			float *q-四元数
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void euler_to_quaternion(float *rpy,float *q)
{
	float sPitch2, cPitch2; // sin(phi/2) and cos(phi/2)
	float sRoll2 , cRoll2;  // sin(theta/2) and cos(theta/2)
	float sYaw2  , cYaw2;   // sin(psi/2) and cos(psi/2)
	//calculate sines and cosines
	
	FastSinCos(0.5f * rpy[0]*DEG2RAD, &sRoll2, &cRoll2);//roll
	FastSinCos(0.5f * rpy[1]*DEG2RAD, &sPitch2,&cPitch2);//pitch
	FastSinCos(0.5f * rpy[2]*DEG2RAD, &sYaw2,  &cYaw2);//yaw
	
	// compute the quaternion elements
	q[0] = cPitch2*cRoll2*cYaw2+sPitch2*sRoll2*sYaw2;
	q[1] = sPitch2*cRoll2*cYaw2-cPitch2*sRoll2*sYaw2;
	q[2] = cPitch2*sRoll2*cYaw2+sPitch2*cRoll2*sYaw2;
	q[3] = cPitch2*cRoll2*sYaw2-sPitch2*sRoll2*cYaw2;

  // Normalise quaternion
  float recipNorm = invSqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
  q[0] *= recipNorm;
  q[1] *= recipNorm;
  q[2] *= recipNorm;
  q[3] *= recipNorm;
}

/***************************************************
函数名: void quaternion_to_cb2n(float *q,float *cb2n)
说明: 通过四元数计算方向余弦矩阵
入口:	float *q-四元数
			float *cb2n-方向余弦矩阵
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void quaternion_to_cb2n(float *q,float *cb2n)
{
	float a=q[0];
	float b=q[1];
	float c=q[2];
	float d=q[3];
	float bc=b*c;
	float ad=a*d;
	float bd=b*d;
	float ac=a*c;
	float cd=c*d;
  float ab=a*b;
	float a2=a*a;
	float b2=b*b;
	float c2=c*c;
	float d2=d*d;
  cb2n[0]=a2+b2-c2-d2;
  cb2n[1]=2*(bc-ad);
  cb2n[2]=2*(bd+ac);  
  cb2n[3]=2*(bc+ad);
  cb2n[4]=a2-b2+c2-d2;
  cb2n[5]=2*(cd-ab);
  cb2n[6]=2*(bd-ac);
  cb2n[7]=2*(cd+ab);
  cb2n[8]=a2-b2-c2+d2;	
}

/***************************************************
函数名: void calculate_quaternion_init(vector3f a,vector3f m,float *q)
说明: 通过加速度计、磁力计数据计算初始四元数
入口:	vector3f a-三轴加速度计
			vector3f m-三轴磁力计
			float *q-四元数
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void calculate_quaternion_init(vector3f a,vector3f m,float *q)
{
	float ax,ay,az,mx,my,mz;
	float rpy_obs_deg[3],_sin_rpy[2],_cos_rpy[2];
	
	ax= a.x;	ay= a.y;	az= a.z;
	mx= m.x;	my= m.y;	mz= m.z;	
	float norm = invSqrt(mx * mx + my * my + az * az);
	mx *=	norm;
	my *=	norm;
	mz *=	norm;
	
  rpy_obs_deg[0]=-57.3f*atan(ax*invSqrt(ay*ay+az*az)); //横滚角
  rpy_obs_deg[1]= 57.3f*atan(ay*invSqrt(ax*ax+az*az)); //俯仰角
	_sin_rpy[_PIT] =	sinf(rpy_obs_deg[1]*DEG2RAD);
	_cos_rpy[_PIT] =	cosf(rpy_obs_deg[1]*DEG2RAD);
	_sin_rpy[_ROL] =	sinf(rpy_obs_deg[0]*DEG2RAD);
	_cos_rpy[_ROL] =	cosf(rpy_obs_deg[0]*DEG2RAD);

  /************磁力计倾角补偿*****************/
	vector2f magn;	
	magn.y=  my * _cos_rpy[_PIT]- mz * _sin_rpy[_PIT];
	magn.x=  mx * _cos_rpy[_ROL]
					+my * _sin_rpy[_ROL] * _cos_rpy[_PIT]
					+mz * _sin_rpy[_ROL] * _cos_rpy[_PIT];
  /***********反正切得到磁力计观测角度*********/
  rpy_obs_deg[2] = atan2f(magn.x,magn.y)*57.296f;
	if(rpy_obs_deg[2]<0) rpy_obs_deg[2] = rpy_obs_deg[2]+360;
	rpy_obs_deg[2] = constrain_float(rpy_obs_deg[2],0.0f,360);
	//
	euler_to_quaternion(rpy_obs_deg,q);//计算观测四元数
}

/***************************************************
函数名: float kalman_filter(float angle,float gyro)
说明:	非矩阵卡尔曼滤波
入口:	float angle-观测欧拉角
			float gyro-角速度
出口:	无
备注:	无
作者:	无名创新
****************************************************/
float kalman_filter(float angle,float gyro)
{
	static uint8_t init;
	static float x=0; 
	static float P=0.000001; 
	static float Q=0.000001; 
	static float R=0.35;//0.35 
	static float k=0; //*************
	if(init==0)
	{
		x=angle;
		init=1;
	}
	x=x+gyro*0.005f; 
	P=P+Q; 
	k=P/(P+R); 
	x=x+k*(angle-x);
	P=(1-k)*P;
	return x; 
} 


/***************************************************
函数名: void imu_data_sampling(void)
说明:	IMU数据采样/校准/滤波
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void imu_data_sampling(void)
{
	if(smartcar_imu.lpf_init==0)
	{
		set_cutoff_frequency(200, 50,&gyro_lpf_param); //姿态角速度反馈滤波参数 
		set_cutoff_frequency(200, 30,&accel_lpf_param);//姿态解算加计修正滤波值
	  smartcar_imu.lpf_init=1;
	}
	smartcar_imu.last_temperature_raw=smartcar_imu.temperature_raw;
	//陀螺仪/陀螺仪数据采集
	ICM206xx_Read_Data(&smartcar_imu._gyro_dps_raw,&smartcar_imu._accel_g_raw,&smartcar_imu.temperature_raw);
	//陀螺仪数据低通滤波
	smartcar_imu.gyro_dps_raw.x=LPButterworth(smartcar_imu._gyro_dps_raw.x,&gyro_filter_buf[0],&gyro_lpf_param);
  smartcar_imu.gyro_dps_raw.y=LPButterworth(smartcar_imu._gyro_dps_raw.y,&gyro_filter_buf[1],&gyro_lpf_param);
  smartcar_imu.gyro_dps_raw.z=LPButterworth(smartcar_imu._gyro_dps_raw.z,&gyro_filter_buf[2],&gyro_lpf_param);		
	//加速度数据低通滤波
	smartcar_imu.accel_g_raw.x=LPButterworth(smartcar_imu._accel_g_raw.x,&accel_filter_buf[0],&accel_lpf_param);
	smartcar_imu.accel_g_raw.y=LPButterworth(smartcar_imu._accel_g_raw.y,&accel_filter_buf[1],&accel_lpf_param);
	smartcar_imu.accel_g_raw.z=LPButterworth(smartcar_imu._accel_g_raw.z,&accel_filter_buf[2],&accel_lpf_param);	
	//温度传感器数据一阶低通滤波
	smartcar_imu.temperature_filter=0.75f*smartcar_imu.temperature_raw+0.25f*smartcar_imu.temperature_filter;
  //得到校准后的角速度、加速度、磁力计数据
	vector3f_sub(smartcar_imu.gyro_dps_raw,smartcar_imu.gyro_offset,&smartcar_imu.gyro_dps);
  
	smartcar_imu.accel_g.x=smartcar_imu.accel_scale.x*smartcar_imu.accel_g_raw.x-smartcar_imu.accel_offset.x;
  smartcar_imu.accel_g.y=smartcar_imu.accel_scale.y*smartcar_imu.accel_g_raw.y-smartcar_imu.accel_offset.y;
  smartcar_imu.accel_g.z=smartcar_imu.accel_scale.z*smartcar_imu.accel_g_raw.z-smartcar_imu.accel_offset.z;  	
	//加速度计/陀螺仪校准检测
	imu_calibration(&smartcar_imu.gyro_dps_raw,&smartcar_imu.accel_g_raw);
	
	//通过三轴加速度计,计算水平观测角度
	float ax,ay,az;
	ax=smartcar_imu.accel_g.x;
	ay=smartcar_imu.accel_g.y;
	az=smartcar_imu.accel_g.z;
	
  smartcar_imu.rpy_obs_deg[0]=-57.3f*atan(ax*invSqrt(ay*ay+az*az)); //横滚角
  smartcar_imu.rpy_obs_deg[1]= 57.3f*atan(ay*invSqrt(ax*ax+az*az)); //俯仰角
	//俯仰轴姿态角卡尔曼滤波
	smartcar_imu.rpy_kalman_deg[1]=kalman_filter(smartcar_imu.rpy_obs_deg[1],smartcar_imu.gyro_dps.x);
}

/***************************************************
函数名: void trackless_ahrs_update(void)
说明:	姿态更新
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void trackless_ahrs_update(void)
{
	/****************************************************/
	FusionVector gyroscope={0.0f, 0.0f, 0.0f};
	FusionVector accelerometer = {0.0f, 0.0f, 1.0f};
	FusionVector earthacceleration = {0.0f, 0.0f, 0.0f}; 
	
	gyroscope.axis.x=smartcar_imu.gyro_dps.x;
	gyroscope.axis.y=smartcar_imu.gyro_dps.y;
	gyroscope.axis.z=smartcar_imu.gyro_dps.z;
	
	accelerometer.axis.x=smartcar_imu.accel_g.x;
	accelerometer.axis.y=smartcar_imu.accel_g.y;
	accelerometer.axis.z=smartcar_imu.accel_g.z;
	if(smartcar_imu.quaternion_init_ok==0)
	{
		if(smartcar_imu.temperature_stable_flag==1)//温度稳定
		{
			calculate_quaternion_init(smartcar_imu.accel_g,smartcar_imu.mag_tesla,smartcar_imu.quaternion_init);
			smartcar_imu.quaternion_init_ok	=	1;
			//AHRS初始化
			FusionOffsetInitialise(&offset, sampling_frequent);
			FusionAhrsInitialise(&ahrs);
			//Set AHRS algorithm settings
			const FusionAhrsSettings settings = {
							.gain = 0.5f,
							.accelerationRejection = 10.0f,
							.magneticRejection = 20.0f,
							.rejectionTimeout = 5 * sampling_frequent, /* 5 seconds */
			};
			FusionAhrsSetSettings(&ahrs, &settings);
		}		
	}

	if(smartcar_imu.quaternion_init_ok==1)
	{
		gyroscope = FusionOffsetUpdate(&offset, gyroscope);
		FusionAhrsUpdateNoMagnetometer(&ahrs, gyroscope, accelerometer,0.005f);//FusionAhrsUpdateExternalHeading(&ahrs, gyroscope, accelerometer,uav_ahrs.rpy_obs_deg[2],0.005f);
		FusionEuler euler=FusionQuaternionToEuler(FusionAhrsGetQuaternion(&ahrs));
		earthacceleration=FusionAhrsGetEarthAcceleration(&ahrs);
		smartcar_imu.rpy_deg[_ROL]=euler.angle.pitch;
		smartcar_imu.rpy_deg[_PIT]=euler.angle.roll;
		smartcar_imu.rpy_deg[_YAW]=euler.angle.yaw;
		//获取导航系系统运动加速度
		smartcar_imu.accel_earth_cmpss.x=earthacceleration.axis.x*GRAVITY_MSS*100.0f;
		smartcar_imu.accel_earth_cmpss.y=earthacceleration.axis.y*GRAVITY_MSS*100.0f;
		smartcar_imu.accel_earth_cmpss.z=earthacceleration.axis.z*GRAVITY_MSS*100.0f;
		
		if(smartcar_imu.imu_convergence_cnt<200*5)  smartcar_imu.imu_convergence_cnt++;
		else if(smartcar_imu.imu_convergence_cnt==200*5)
		{
			smartcar_imu.imu_convergence_cnt++;
			beep.period=100;//100*5ms
			beep.light_on_percent=0.5f;
			beep.reset=1;	
			beep.times=2;//闪烁2次		
		}
		else 
		{
			smartcar_imu.imu_convergence_flag=1;
		}
	}

  smartcar_imu.rpy_gyro_dps[_PIT]=smartcar_imu.gyro_dps.x;
  smartcar_imu.rpy_gyro_dps[_ROL]=smartcar_imu.gyro_dps.y;
  smartcar_imu.rpy_gyro_dps[_YAW]=smartcar_imu.gyro_dps.z;
  //计算姿态相关三角函数
  smartcar_imu.sin_rpy[_PIT]=FastSin(smartcar_imu.rpy_deg[_PIT]*DEG2RAD);
  smartcar_imu.cos_rpy[_PIT]=FastCos(smartcar_imu.rpy_deg[_PIT]*DEG2RAD);
  smartcar_imu.sin_rpy[_ROL]=FastSin(smartcar_imu.rpy_deg[_ROL]*DEG2RAD);
  smartcar_imu.cos_rpy[_ROL]=FastCos(smartcar_imu.rpy_deg[_ROL]*DEG2RAD);
  smartcar_imu.sin_rpy[_YAW]=FastSin(smartcar_imu.rpy_deg[_YAW]*DEG2RAD);
  smartcar_imu.cos_rpy[_YAW]=FastCos(smartcar_imu.rpy_deg[_YAW]*DEG2RAD);
	//提取姿态四元数
  smartcar_imu.quaternion[0]=ahrs.quaternion.element.w;
	smartcar_imu.quaternion[1]=ahrs.quaternion.element.x;
  smartcar_imu.quaternion[2]=ahrs.quaternion.element.y;
	smartcar_imu.quaternion[3]=ahrs.quaternion.element.z;
	//计算载体系到导航系旋转矩阵
	quaternion_to_cb2n(smartcar_imu.quaternion,smartcar_imu.cb2n);						  //通过四元数求取旋转矩阵	
	//将无人机在导航坐标系下的沿着正东、正北方向的运动加速度旋转到当前航向的运动加速度:机头(俯仰)+横滚 
  smartcar_imu.accel_body_cmpss.x= smartcar_imu.accel_earth_cmpss.x*smartcar_imu.cos_rpy[_YAW]+smartcar_imu.accel_earth_cmpss.y*smartcar_imu.sin_rpy[_YAW];  //横滚正向运动加速度  X轴正向
  smartcar_imu.accel_body_cmpss.y=-smartcar_imu.accel_earth_cmpss.x*smartcar_imu.sin_rpy[_YAW]+smartcar_imu.accel_earth_cmpss.y*smartcar_imu.cos_rpy[_YAW];  //机头正向运动加速度  Y轴正向
	
	//{-sinθ          cosθsin Φ                          cosθcosΦ                   }
  smartcar_imu.yaw_gyro_enu=-smartcar_imu.sin_rpy[_ROL]*smartcar_imu.gyro_dps.x
														+smartcar_imu.cos_rpy[_ROL]*smartcar_imu.sin_rpy[_PIT]*smartcar_imu.gyro_dps.y
														+smartcar_imu.cos_rpy[_PIT]*smartcar_imu.cos_rpy[_ROL]*smartcar_imu.gyro_dps.z;	
	smartcar_imu.vbat=get_battery_voltage();
}



float temp_kp=8.0f,temp_ki=0.75f,temp_kd=125.0f;
float temp_error=0,temp_expect=50.0f,temp_feedback=0,temp_last_error=0;
float	temp_integral=0,temp_output=0;
/***************************************************
函数名: void imu_temperature_ctrl(void)
说明:	IMU恒温控制
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void imu_temperature_ctrl(void)
{
	temperature_state_check();
	static uint16_t tmp_period_cnt=0;
	tmp_period_cnt++;
	if(tmp_period_cnt<20) return;
	tmp_period_cnt=0;
	
	float temp_dis_error=0;
	temp_last_error=temp_error;
	temp_feedback=smartcar_imu.temperature_filter;
	temp_error=temp_expect-temp_feedback;
	temp_error=constrain_float(temp_error,-50,50);
	if(ABS(temp_error)<10)	temp_integral+=temp_ki*temp_error*0.1f;
	temp_integral=constrain_float(temp_integral,-80,80);
	temp_dis_error=temp_error-temp_last_error;
	temp_output=temp_kp*temp_error+temp_integral+temp_kd*temp_dis_error;
	temp_output=constrain_float(temp_output,-100,100);
}

/***************************************************
函数名: void simulation_pwm_init(void)
说明:	模拟pwm初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void simulation_pwm_init(void)
{	
	DL_GPIO_clearPins(heater_port, heater_pin);
}

#define Simulation_PWM_Period_MAX  100//100*1ms=0.1S
/***************************************************
函数名: void simulation_pwm_output(void)
说明:	模拟pwm输出
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void simulation_pwm_output(void)
{
#if temperature_ctrl_enable
	int16_t width=temp_output;
	static uint16_t cnt=0;	cnt++;
	if(cnt>=Simulation_PWM_Period_MAX)  cnt=0;
  if(cnt<=width) DL_GPIO_setPins(heater_port, heater_pin);
	else DL_GPIO_clearPins(heater_port, heater_pin);
#else
	DL_GPIO_clearPins(heater_port, heater_pin);
#endif
}

/***************************************************
函数名: uint8_t temperature_state_get(void)
说明:	温度接近目标值检测
入口:	无
出口:	uint8_t 就位标志
备注:	无
作者:	无名创新
****************************************************/
uint8_t temperature_state_get(void)
{
#if temperature_ctrl_enable
	return (ABS(temp_error))<=3.0f?1:0;
#else
	return 1;
#endif
  
	
}

/***************************************************
函数名: void temperature_state_check(void)
说明:	温度恒定检测
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void temperature_state_check(void)
{
	static uint16_t _cnt=0;
	static uint16_t temperature_crash_cnt=0;
	if(temperature_state_get()==1){
		_cnt++;
		if(_cnt>=400) smartcar_imu.temperature_stable_flag=1;
	}
	else{
		_cnt/=2;
	}
	
	if(temperature_crash_cnt<400)
	{
		if(smartcar_imu.last_temperature_raw==smartcar_imu.temperature_raw)	temperature_crash_cnt++;
		else temperature_crash_cnt/=2;
		smartcar_imu.imu_health=1;		
	}
	else
	{
		smartcar_imu.imu_health=0;
	}	
}	


/***************************************************
函数名: void get_wheel_speed(void)
说明:	车载里程计系统
入口:	无
出口:	无
备注:	在温度恒定之后,姿态解算就位后才开始计算
作者:	无名创新
****************************************************/
void get_wheel_speed(void)
{
	static uint32_t cnt=0;
	if(cnt<200)  { cnt++; return; }
	smartcar_imu.left_motor_speed_cmps =get_left_motor_speed();
	smartcar_imu.right_motor_speed_cmps=get_right_motor_speed();
	//计算两轮平均速度
	smartcar_imu.state_estimation.speed=0.5f*(smartcar_imu.left_motor_speed_cmps+smartcar_imu.right_motor_speed_cmps);
	smartcar_imu.state_estimation.azimuth=smartcar_imu.rpy_deg[_YAW];
	smartcar_imu.state_estimation.w=smartcar_imu.yaw_gyro_enu;
	//计算x,y方向上的速度分量
	smartcar_imu.state_estimation.vel.x=smartcar_imu.state_estimation.speed*cosf(DEG2RAD*smartcar_imu.state_estimation.azimuth);
	smartcar_imu.state_estimation.vel.y=smartcar_imu.state_estimation.speed*sinf(DEG2RAD*smartcar_imu.state_estimation.azimuth);
	//速度直接积分得到两个方向的位置
	smartcar_imu.state_estimation.pos.x+=smartcar_imu.state_estimation.vel.x*0.005f;
	smartcar_imu.state_estimation.pos.y+=smartcar_imu.state_estimation.vel.y*0.005f;
	//平均速度直接积分总距离
	smartcar_imu.state_estimation.distance+=smartcar_imu.state_estimation.speed*0.005f;
}


