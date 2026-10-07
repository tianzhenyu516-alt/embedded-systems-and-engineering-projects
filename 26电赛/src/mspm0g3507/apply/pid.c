#include "headfile.h"
#include "pid.h"




/***************************************************
函数名: void pid_control_init(controller *ctrl,
															float kp,
															float ki,
															float kd,
															float err_max,
															float integral_max,
															float output_max,
															uint8_t err_limit_flag,
															uint8_t integral_separate_flag,
															float integral_separate_limit,
															uint8_t dis_error_gap_cnt)
说明:	pid控制器初始化
入口:	controller *ctrl-待初始化控制器结构体
			float kp-比例参数
			float ki-积分参数
			float kd-微分参数
			float err_max-偏差限幅值
			float integral_max-积分限幅值
			float output_max-输出限幅值
			uint8_t err_limit_flag-偏差限幅标志位
			uint8_t integral_separate_flag-积分分离标志位
			float integral_separate_limit-积分分离限幅标志位
			uint8_t dis_error_gap_cnt-计算微分时的间隔次数
出口:	无
备注:	无
****************************************************/
void pid_control_init(controller *ctrl,
											float kp,
											float ki,
											float kd,
											float err_max,
											float integral_max,
											float output_max,
											uint8_t err_limit_flag,
											uint8_t integral_separate_flag,
											float integral_separate_limit,
											uint8_t dis_error_gap_cnt)
{
	ctrl->kp=kp;
	ctrl->ki=ki;
	ctrl->kd=kd;
	ctrl->error_limit_max=err_max;
	ctrl->integral_limit_max=integral_max;
	ctrl->output_limit_max=output_max;
	ctrl->error_limit_flag=err_limit_flag;
	ctrl->integral_separate_flag =integral_separate_flag;
	ctrl->integral_separate_limit=integral_separate_limit;
	
	ctrl->dis_error_gap_cnt=dis_error_gap_cnt;
	
	ctrl->init_flag=1;
}

void  pid_integrate_reset(controller *ctrl)  {ctrl->integral=0.0f;}
/***************************************************
函数名: float pid_control_run(controller *ctrl)
说明:	pid控制器运行
入口:	controller *ctrl-控制器结构体
出口:	无
备注:	无
****************************************************/
float pid_control_run(controller *ctrl)
{
  /*******偏差计算*********************/
	for(uint16_t i=19;i>0;i--)
	{
		ctrl->error_backup[i]=ctrl->error_backup[i-1];
	}
	ctrl->error_backup[0]=ctrl->error;
	
  ctrl->last_error=ctrl->error;//保存上次偏差
  ctrl->error=ctrl->expect-ctrl->feedback;//期望减去反馈得到偏差
	ctrl->dis_error=ctrl->error-ctrl->error_backup[ctrl->dis_error_gap_cnt-1];//微分		ctrl->dis_error=ctrl->error-ctrl->last_error;//原始微分
	
  if(ctrl->error_limit_flag==1)//偏差限幅度标志位
  {
    if(ctrl->error>= ctrl->error_limit_max)  ctrl->error= ctrl->error_limit_max;
    if(ctrl->error<=-ctrl->error_limit_max)  ctrl->error=-ctrl->error_limit_max;
  }
  /*******积分计算*********************/
  if(ctrl->integral_separate_flag==1)//积分分离标志位
  {
		//只在偏差比较小的时候引入积分控制
    if(ABS(ctrl->error)<=ctrl->integral_separate_limit)	 ctrl->integral+=ctrl->ki*ctrl->error;
  }
  else
  {
    ctrl->integral+=ctrl->ki*ctrl->error;
  }
	/*******积分限幅*********************/
	if(ctrl->integral>=ctrl->integral_limit_max)   ctrl->integral=ctrl->integral_limit_max;
	if(ctrl->integral<=-ctrl->integral_limit_max)  ctrl->integral=-ctrl->integral_limit_max;
	
	/*******总输出计算*********************/
  ctrl->last_output=ctrl->output;//输出值递推
  ctrl->output=ctrl->kp*ctrl->error//比例
							+ctrl->integral//积分
							+ctrl->kd*ctrl->dis_error;//微分
	
	/*******总输出限幅*********************/
  if(ctrl->output>= ctrl->output_limit_max)  ctrl->output= ctrl->output_limit_max;
  if(ctrl->output<=-ctrl->output_limit_max)  ctrl->output=-ctrl->output_limit_max;
  /*******返回总输出*********************/
  return ctrl->output;
}



float pid_control_dt_run(controller *ctrl,float dt)
{
  float _dt=0;
  get_systime(&ctrl->_time);
  _dt=ctrl->_time.period/1000.0f;
	if(_dt>1.05f*dt||_dt<0.95f*dt||isnan(_dt)!=0)   _dt=dt;
	if(_dt<0.0001f) return 0;

  /*******偏差计算*********************/
	for(uint16_t i=19;i>0;i--)
	{
		ctrl->error_backup[i]=ctrl->error_backup[i-1];
	}
	ctrl->error_backup[0]=ctrl->error;
	
  ctrl->last_error=ctrl->error;//保存上次偏差
  ctrl->error=ctrl->expect-ctrl->feedback;//期望减去反馈得到偏差
	ctrl->dis_error=ctrl->error-ctrl->error_backup[ctrl->dis_error_gap_cnt-1];//微分		ctrl->dis_error=ctrl->error-ctrl->last_error;//原始微分

  if(ctrl->error_limit_flag==1)//偏差限幅度标志位
  {
    if(ctrl->error>= ctrl->error_limit_max)  ctrl->error= ctrl->error_limit_max;
    if(ctrl->error<=-ctrl->error_limit_max)  ctrl->error=-ctrl->error_limit_max;
  }
  /*******积分计算*********************/
  if(ctrl->integral_separate_flag==1)//积分分离标志位
  {
		//只在偏差比较小的时候引入积分控制
    if(ABS(ctrl->error)<=ctrl->integral_separate_limit)	 ctrl->integral+=ctrl->ki*ctrl->error*_dt;
  }
  else
  {
    ctrl->integral+=ctrl->ki*ctrl->error*_dt;
  }
	/*******积分限幅*********************/
	if(ctrl->integral>=ctrl->integral_limit_max)   ctrl->integral=ctrl->integral_limit_max;
	if(ctrl->integral<=-ctrl->integral_limit_max)  ctrl->integral=-ctrl->integral_limit_max;
	
	ctrl->dis_error_lpf=LPButterworth(ctrl->dis_error,&ctrl->lpf_buffer,&ctrl->lpf_params);
		
	/*******总输出计算*********************/
  ctrl->last_output=ctrl->output;//输出值递推
  ctrl->output=ctrl->kp*ctrl->error//比例
							+ctrl->integral//积分
							+ctrl->kd*ctrl->dis_error_lpf;//微分
	
	/*******总输出限幅*********************/
  if(ctrl->output>= ctrl->output_limit_max)  ctrl->output= ctrl->output_limit_max;
  if(ctrl->output<=-ctrl->output_limit_max)  ctrl->output=-ctrl->output_limit_max;
  /*******返回总输出*********************/
  return ctrl->output;
}


float pid_control_dt_yaw_run(controller *ctrl,float dt)
{
  float _dt=0;
  get_systime(&ctrl->_time);
  _dt=ctrl->_time.period/1000.0f;
	if(_dt>1.05f*dt||_dt<0.95f*dt||isnan(_dt)!=0)   _dt=dt;
	if(_dt<0.0001f) return 0;
	
  /*******偏差计算*********************/
	for(uint16_t i=19;i>0;i--)
	{
		ctrl->error_backup[i]=ctrl->error_backup[i-1];
	}
	ctrl->error_backup[0]=ctrl->error;
	
  ctrl->last_error=ctrl->error;//保存上次偏差
  ctrl->error=ctrl->expect-ctrl->feedback;//期望减去反馈得到偏差
	ctrl->dis_error=ctrl->error-ctrl->error_backup[ctrl->dis_error_gap_cnt-1];//微分		ctrl->dis_error=ctrl->error-ctrl->last_error;//原始微分

  /***********************偏航角偏差超过+-180处理*****************************/
	if(ctrl->error<-180) ctrl->error=ctrl->error+360;
	if(ctrl->error>180)  ctrl->error=ctrl->error-360;

	
  if(ctrl->error_limit_flag==1)//偏差限幅度标志位
  {
    if(ctrl->error>= ctrl->error_limit_max)  ctrl->error= ctrl->error_limit_max;
    if(ctrl->error<=-ctrl->error_limit_max)  ctrl->error=-ctrl->error_limit_max;
  }
  /*******积分计算*********************/
  if(ctrl->integral_separate_flag==1)//积分分离标志位
  {
		//只在偏差比较小的时候引入积分控制
    if(ABS(ctrl->error)<=ctrl->integral_separate_limit)	 ctrl->integral+=ctrl->ki*ctrl->error*_dt;
  }
  else
  {
    ctrl->integral+=ctrl->ki*ctrl->error*_dt;
  }
	/*******积分限幅*********************/
	if(ctrl->integral>=ctrl->integral_limit_max)   ctrl->integral=ctrl->integral_limit_max;
	if(ctrl->integral<=-ctrl->integral_limit_max)  ctrl->integral=-ctrl->integral_limit_max;
	
	/*******总输出计算*********************/
  ctrl->last_output=ctrl->output;//输出值递推
  ctrl->output=ctrl->kp*ctrl->error//比例
							+ctrl->integral//积分
							+ctrl->kd*ctrl->dis_error;//微分
	
	/*******总输出限幅*********************/
  if(ctrl->output>= ctrl->output_limit_max)  ctrl->output= ctrl->output_limit_max;
  if(ctrl->output<=-ctrl->output_limit_max)  ctrl->output=-ctrl->output_limit_max;
  /*******返回总输出*********************/
  return ctrl->output;
}

