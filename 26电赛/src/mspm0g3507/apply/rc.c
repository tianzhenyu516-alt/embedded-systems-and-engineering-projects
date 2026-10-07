#include "Headfile.h"
#include "rc.h"

void unlock_state_check(void);


rc RC_Data={
	.fc_ready_flag=0
};

rc RC_Pilot={
	.fc_ready_flag=0
};

/***************************************************
函数名: void rc_range_init(void)
说明:	遥控器行程参数初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void rc_range_init(void)
{
	float _rc_deadband_percent=0;
	for(uint16_t i=0;i<8;i++)
	{		
		if(i==RC_THR_CHANNEL) _rc_deadband_percent=RC_THR_DEADBAND_PERCENT;
		else _rc_deadband_percent=RC_DEADBAND_PERCENT;
		
		RC_Data.cal[i].max=RC_TOP_DEFAULT;
		RC_Data.cal[i].min=RC_BUTTOM_DEFAULT;
		RC_Data.cal[i].middle=RC_MIDDLE_DEFAULT;
		
		RC_Data.cal[i].deadband=(float)((RC_Data.cal[i].max-RC_Data.cal[i].min)*_rc_deadband_percent/1.0f);;
		RC_Data.cal[i].reverse_flag=false;
		RC_Data.cal[i].scale=(RC_Data.cal[i].max-RC_Data.cal[i].min-RC_Data.cal[i].deadband)*0.5f;
	}
	
	RC_Pilot=RC_Data;
}

/***************************************************
函数名: float remote_data_remap(rc *data,uint16_t ch,float max_down,float max_up,bool reverse_flag)
说明:	遥控器数据映射函数
入口:	rc *data-遥控器结构体
			uint16_t ch-通道
			float max_down-负向最大值
			float max_up-正向最大值
			bool reverse_flag-反向控制
出口:	float 映射后的输出值
备注:	无
作者:	无名创新
****************************************************/
float remote_data_remap(rc *data,uint16_t ch,float max_down,float max_up,bool reverse_flag)
{
	if(ppm_rc.online_flag==0) return 0;
  float value=0;
  if(data->rcdata[ch]<=data->cal[ch].middle-0.5f*data->cal[ch].deadband)
		value=(data->cal[ch].middle-0.5f*data->cal[ch].deadband-data->rcdata[ch])*max_down
														/data->cal[ch].scale;
	else if(data->rcdata[ch]>=data->cal[ch].middle+0.5f*data->cal[ch].deadband)
		value=(data->cal[ch].middle+0.5f*data->cal[ch].deadband-data->rcdata[ch])*max_up
														/data->cal[ch].scale;	
  else value=0;
	
	if(reverse_flag)  value*=(-1);
  return 	value;
}


uint8_t rc_read_switch(uint16_t ch)
{
	uint16_t pulsewidth = ch;
	if (pulsewidth <= 900 || pulsewidth >= 2200) return 255;// This is an error condition
	if (pulsewidth <= 1210) return 0;//低位
	if (pulsewidth <= 1710) return 1;//中位
	return 2;//高位
}


/***************************************************
函数名: float rc_data_input(void)
说明:	遥控器数据采集
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void rc_data_input(void)
{
	if(ppm_rc.update_flag==1)//优先选择外部接收机输入的PPM信号
	{
		memcpy(RC_Data.rcdata,ppm_rc.buf,RC_CHL_MAX*sizeof(uint16_t));//更新每个通道遥控器数据
		memcpy(RC_Pilot.rcdata,ppm_rc.buf,RC_CHL_MAX*sizeof(uint16_t));//更新每个通道遥控器数据
	}
	else if(rc_update_flag==1)//无名创新虚拟遥控器
	{
		NCLINK_PPM_Databuf[1]=3000-NCLINK_PPM_Databuf[1];//第二通道反向处理
	  memcpy(RC_Data.rcdata,NCLINK_PPM_Databuf,RC_CHL_MAX*sizeof(uint16));
		memcpy(RC_Pilot.rcdata,NCLINK_PPM_Databuf,RC_CHL_MAX*sizeof(uint16_t));
	}
	else if(bt_update_flag==1)//蓝牙app遥控器数据
	{
	  bluetooth_ppm[1]=3000-bluetooth_ppm[1];//第二通道反向处理
	  memcpy(RC_Data.rcdata,bluetooth_ppm,RC_CHL_MAX*sizeof(uint16));	
		memcpy(RC_Pilot.rcdata,bluetooth_ppm,RC_CHL_MAX*sizeof(uint16_t));
	}
	
	if(ppm_rc.update_flag==1||rc_update_flag==1||bt_update_flag==1)
	{
		//清空本次更新标志位
		ppm_rc.update_flag=0;
		rc_update_flag=0;
		bt_update_flag=0;
		
		ppm_rc.online_flag=1;//存在遥控器输入信号
		
		RC_Data.rc_rpyt[RC_ROLL]	=remote_data_remap(&RC_Data ,RC_ROLL_CHANNEL	,Yaw_Max,Yaw_Max,false);
		RC_Data.rc_rpyt[RC_PITCH] =remote_data_remap(&RC_Data ,RC_PITCH_CHANNEL ,Back_Speed_Max,Front_Speed_Max,false);
		RC_Data.rc_rpyt[RC_YAW]		=remote_data_remap(&RC_Data ,RC_YAW_CHANNEL	  ,Yaw_Max		,Yaw_Max    ,false);
		RC_Data.rc_rpyt[RC_THR]		=remote_data_remap(&RC_Data ,RC_THR_CHANNEL	  ,Back_Speed_Max,Front_Speed_Max,true);
		
		RC_Data.thr=RC_Data.rcdata[RC_THR_CHANNEL];
		RC_Data.aux[AUX1]=RC_Data.rcdata[RC_AUX1_CHANNEL];
		RC_Data.aux[AUX2]=RC_Data.rcdata[RC_AUX2_CHANNEL];
		RC_Data.aux[AUX3]=RC_Data.rcdata[RC_AUX3_CHANNEL];
		RC_Data.aux[AUX4]=RC_Data.rcdata[RC_AUX4_CHANNEL];
		
		/********************************************************************************************************************/
		RC_Pilot.rc_rpyt[RC_ROLL]	=remote_data_remap(&RC_Pilot ,RC_ROLL_CHANNEL	,Pit_Rol_Max,Pit_Rol_Max,true);
		RC_Pilot.rc_rpyt[RC_PITCH]=remote_data_remap(&RC_Pilot ,RC_PITCH_CHANNEL,Pit_Rol_Max,Pit_Rol_Max,true);
		RC_Pilot.rc_rpyt[RC_YAW]	=remote_data_remap(&RC_Pilot ,RC_YAW_CHANNEL	,Yaw_Max		,Yaw_Max    ,false);
		RC_Pilot.rc_rpyt[RC_THR]	=remote_data_remap(&RC_Pilot ,RC_THR_CHANNEL	,Climb_Down_Speed_Max,Climb_Up_Speed_Max,true);
	
		RC_Pilot.thr=RC_Pilot.rcdata[RC_THR_CHANNEL];
		RC_Pilot.aux[AUX1]=RC_Pilot.rcdata[RC_AUX1_CHANNEL];
		RC_Pilot.aux[AUX2]=RC_Pilot.rcdata[RC_AUX2_CHANNEL];
		RC_Pilot.aux[AUX3]=RC_Pilot.rcdata[RC_AUX3_CHANNEL];
		RC_Pilot.aux[AUX4]=RC_Pilot.rcdata[RC_AUX4_CHANNEL];
		/********************************************************************************************************************/
		unlock_state_check();
	}
}


uint16_t imu_cal_cnt=0;
void unlock_state_check(void)
{
	RC_Pilot.fc_ready_flag=smartcar_imu.quaternion_init_ok;

	RC_Pilot.last_lock_state=RC_Pilot.lock_state;
	//解锁逻辑
  if(RC_Pilot.thr<RC_Pilot.cal[RC_THR_CHANNEL].min+RC_Pilot.cal[RC_THR_CHANNEL].scale*0.05f
		 &&RC_Pilot.rc_rpyt[RC_ROLL]==0
		 &&RC_Pilot.rc_rpyt[RC_PITCH]==0
	   &&RC_Pilot.rc_rpyt[RC_YAW]<=-Yaw_Max*Scale_Pecent_Max
		 &&RC_Pilot.fc_ready_flag==1)//温控就位
	RC_Pilot.unlock_makesure_cnt++;
	else RC_Pilot.unlock_makesure_cnt/=5;
  
	if(RC_Pilot.unlock_makesure_cnt>=100)//100*20ms=2000ms持续2S时间
	{
	  RC_Pilot.lock_state=UNLOCK;
		RC_Pilot.unlock_makesure_cnt=0;
		bling_set(&light_green,5000,200,0.5,0,0);//绿色
	}

	//上锁逻辑
	if(RC_Pilot.thr<RC_Pilot.cal[RC_THR_CHANNEL].min+RC_Pilot.cal[RC_THR_CHANNEL].scale*0.05f
	 &&RC_Pilot.rc_rpyt[RC_ROLL]==0
	 &&RC_Pilot.rc_rpyt[RC_PITCH]==0
	 &&RC_Pilot.rc_rpyt[RC_YAW]>=Yaw_Max*Scale_Pecent_Max)
	RC_Pilot.lock_makesure_cnt++;
	else RC_Pilot.lock_makesure_cnt/=5;
		
	if(RC_Pilot.lock_makesure_cnt>=50)//50*20ms=1000ms持续1S时间
	{
	  RC_Pilot.lock_state=LOCK;
		RC_Pilot.lock_makesure_cnt=0;
		RC_Pilot.auto_relock_flag=0;//清空自动上锁标志位
		RC_Pilot.rc_return_flag=0;
		RC_Pilot.auto_relock_cnt=0;
		bling_set(&light_green,3000,500,0.5,0,0);//绿色
	}
		
	//飞控自动上锁判断
	if(RC_Pilot.last_lock_state==LOCK&&RC_Pilot.lock_state==UNLOCK)//解锁完成时刻
	{ 
		//rc_data.auto_relock_flag=0;//非自稳模式下，禁止解锁后自动上锁
		RC_Pilot.auto_relock_flag=1;  //设置自动上锁标志位
		RC_Pilot.auto_relock_cnt=300; //设置解锁无任何操作，6秒后自动上锁
		
		RC_Pilot.unwanted_lock_flag=1;//禁止地面检测自动上锁标志位	
		RC_Pilot.thr_push_over_state=FREE_STYLE;
		//reset_landon_state();
	}
	
	
	//解锁后自动上锁逻辑判断
	if(RC_Pilot.auto_relock_flag==1)
	{
		 if(RC_Pilot.thr<RC_Pilot.cal[RC_THR_CHANNEL].min+RC_Pilot.cal[RC_THR_CHANNEL].scale*0.05f
		  &&RC_Pilot.rc_rpyt[RC_ROLL]==0
		  &&RC_Pilot.rc_rpyt[RC_PITCH]==0
		  &&RC_Pilot.rc_rpyt[RC_YAW]==0)//遥控器解锁后，6S内无任何操作动作位
		 {	
				RC_Pilot.auto_relock_cnt--;
				if(RC_Pilot.auto_relock_cnt<=0)  RC_Pilot.auto_relock_cnt=0;
				if(RC_Pilot.auto_relock_cnt==0)
				{
					RC_Pilot.lock_state=LOCK;
					RC_Pilot.auto_relock_flag=0;//清空自动上锁标志位
					RC_Pilot.rc_return_flag=0;
					bling_set(&light_green,3000,500,0.5,0,0);//绿色
				}
				RC_Pilot.rc_return_flag=1;//回中动作标志位
		 }
			
		 if((RC_Pilot.thr>RC_Pilot.cal[RC_THR_CHANNEL].min+RC_Pilot.cal[RC_THR_CHANNEL].scale*0.05f
		   ||ABS(RC_Pilot.rc_rpyt[RC_ROLL])>=0.1f*Pit_Rol_Max
		   ||ABS(RC_Pilot.rc_rpyt[RC_PITCH])>=0.1f*Pit_Rol_Max
		   ||ABS(RC_Pilot.rc_rpyt[RC_YAW])>=0.5f*Yaw_Max)
		   &&RC_Pilot.rc_return_flag==1&&RC_Pilot.auto_relock_cnt>0)//遥控器解锁回中后，6S内存在操作动作位
		 {	
			 RC_Pilot.auto_relock_flag=0;//清空自动上锁标志位
			 RC_Pilot.rc_return_flag=0;
			 RC_Pilot.auto_relock_cnt=0;			 
		 }		 
	}
	
	
	if(RC_Pilot.thr<RC_Pilot.cal[RC_THR_CHANNEL].min+RC_Pilot.cal[RC_THR_CHANNEL].scale*0.05f
	 &&RC_Pilot.rc_rpyt[RC_ROLL] >=Pit_Rol_Max*Scale_Pecent_Max
	 &&RC_Pilot.rc_rpyt[RC_PITCH]>=Pit_Rol_Max*Scale_Pecent_Max
	 &&RC_Pilot.rc_rpyt[RC_YAW]  >=Yaw_Max*Scale_Pecent_Max
	 &&RC_Pilot.last_lock_state==LOCK
	 &&RC_Pilot.fc_ready_flag==1)//温控就位
	imu_cal_cnt++;
	else imu_cal_cnt/=2;

	if(imu_cal_cnt>=200)//200*20ms=4000ms持续4S时间
	{
		smartcar_imu.imu_cal_flag=0;//重新校准加速度、陀螺仪
		imu_cal_cnt=0;
		bling_set(&light_green,5000,200,0.5,0,0);//绿色
	}
}

