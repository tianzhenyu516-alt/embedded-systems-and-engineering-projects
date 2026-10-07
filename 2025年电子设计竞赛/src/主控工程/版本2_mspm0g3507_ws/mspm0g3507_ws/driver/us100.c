#include "headfile.h"
#include "user.h"
#include "us100.h"



uint8_t  com3_rx_buf[4]={0};
uint16_t com3_rx_cnt=0;
_rangefinder rangefinder;
/***************************************
函数名:	void us100_start(void)
说明: us100测距触发指令
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void us100_start(void)
{
//	UART_SendByte(UART_3_INST,0x55);
}

/***************************************
函数名:	float us100_get_distance(uint8 MSB,uint8 LSB)
说明: 超声波回传的两个字节换算成实际距离
入口:	uint8 MSB-高字节
			uint8 LSB-低字节
出口:	float 返回距离值
备注:	无
作者:	无名创新
***************************************/
float us100_get_distance(uint8 MSB,uint8 LSB)
{
  return (256*(MSB)+(LSB))/10.0f;//单位cm
}

/***************************************
函数名:	float us100_get_temperature(uint8_t data)
说明: 获取温度数据
入口:	uint8 data-温度字节
出口:	float 返回温度值
备注:	无
作者:	无名创新
***************************************/
float us100_get_temperature(uint8_t data)
{
  return (data-45)/1.0;//℃
}

/***************************************
函数名:	void us100_statemachine(void)
说明: us100测量状态机
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void us100_statemachine(void)
{
	static uint16_t us100_cnt=0;
	us100_cnt++;
	if(us100_cnt>=20)
	{		
		us100_cnt=0;
		
		rangefinder.pre_last_distance=rangefinder.last_distance;//上上次高度
		rangefinder.last_distance=rangefinder.distance;//上次高度
		rangefinder.distance=us100_get_distance(com3_rx_buf[0],com3_rx_buf[1]);

		rangefinder.last_vel=rangefinder.vel;
		rangefinder.vel=(rangefinder.distance-rangefinder.last_distance)/0.1f;
		rangefinder.acc=(rangefinder.vel-rangefinder.last_vel)/0.1f;
		
		com3_rx_cnt=0;
		us100_start();
	}
}





/***************************************
函数名:	void rangefinder_init(void)
说明: 测距传感器初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void rangefinder_init(void)
{
	float tmp_sensor_type=0;
	ReadFlashParameterOne(RANGEFINDER_TYPE,&tmp_sensor_type);
	if(isnan(tmp_sensor_type)==0) 	rangefinder.sensor_type=tmp_sensor_type;				
	else rangefinder.sensor_type=rangefinder_type_default;
	rangefinder.sensor_init_type=rangefinder.sensor_type;
	switch(rangefinder.sensor_type)
	{

	}
}	


/***************************************
函数名:	void rangefinder_statemachine(void)
说明: 测距采集状态机
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void rangefinder_statemachine(void)
{
	if(rangefinder.sensor_init_type!=rangefinder.sensor_type)//初始化时传感器类型与当前设置传感器类型不一致
	{
		return;
		//重启复位才生效
	}
	switch(rangefinder.sensor_type)
	{
		case 0 :
	  case 1 :us100_statemachine();break;
		default:us100_statemachine();
	}
}	


