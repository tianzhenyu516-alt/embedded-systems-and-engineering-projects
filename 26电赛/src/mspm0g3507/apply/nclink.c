#include "headfile.h"
#include "nclink.h"


static uint8_t NCLink_Head[2]={0xFF,0xFC};//数据帧头
static uint8_t NCLink_End[2] ={0xA1,0xA2};//数据帧尾
uint8_t nclink_databuf[128];//待发送数据缓冲区
uint8_t NCLink_Send_Check_Flag[20]={0};//数据解析成功，飞控给地面站发送标志位
uint8_t NCLink_Send_Ask_Flag[10]={0};//飞控接收获取参数命令请求，给地面站发送标志位

ngs_sdk_control ngs_sdk;
nav_ctrl ngs_nav_ctrl={
	.ctrl_finish_flag=1,
	.update_flag=0,
	.cnt=0,
	.dis_cm=0,
	//以下为静态成员变量，中途不可修改
	.dis_limit_cm=10.0,			//距离阈值，用于判断是否到达目标的
	.cmd_angular_max=50.0,  //角速度阈值，用于限制速度控制模式的角速度
	.cmd_vel_max=50.0,      //速度阈值，用于限制速度控制模式的线速度
}; 


uint16_t NCLINK_PPM_Databuf[10]={0};
uint8_t rc_update_flag=0;//遥控器数据更新标志位
uint8_t unlock_flag=0x03,takeoff_flag=0;//解锁、起飞标志位






/***************************************************************************************
@函数名：Serial_Data_Send(uint8_t *buf, uint32_t cnt)
@入口参数：buf:待发送数据
			     cnt:待发送字长
@出口参数：无
功能描述：串口发送函数
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void Serial_Data_Send(uint8_t *buf, uint32_t cnt)  
{
	UART_SendBytes(UART_0_INST,buf, cnt);//用户移植时，重写此串口发送函数
}

/***************************************************************************************
@函数名：Pilot_Status_Tick(void) 
@入口参数：无
@出口参数：无
功能描述：飞控接收状态显示
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void Pilot_Status_Tick(void)  
{
	bling_set(&light_red  ,500,50,0.2,0,0);//红色  //用户移植时，重写此函数
}



union
{
	unsigned char floatByte[4];
	float floatValue;
}FloatUnion;


/***************************************************************************************
@函数名：void Float2Byte(float *FloatValue, unsigned char *Byte, unsigned char Subscript)
@入口参数：FloatValue:float值
			     Byte:数组
		       Subscript:指定从数组第几个元素开始写入
@出口参数：无
功能描述：将float数据转成4字节数据并存入指定地址
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void Float2Byte(float *FloatValue, unsigned char *Byte, unsigned char Subscript)
{
	FloatUnion.floatValue = (float)2;
	if(FloatUnion.floatByte[0] == 0)//小端模式
	{
		FloatUnion.floatValue = *FloatValue;
		Byte[Subscript]     = FloatUnion.floatByte[0];
		Byte[Subscript + 1] = FloatUnion.floatByte[1];
		Byte[Subscript + 2] = FloatUnion.floatByte[2];
		Byte[Subscript + 3] = FloatUnion.floatByte[3];
	}
	else//大端模式
	{
		FloatUnion.floatValue = *FloatValue;
		Byte[Subscript]     = FloatUnion.floatByte[3];
		Byte[Subscript + 1] = FloatUnion.floatByte[2];
		Byte[Subscript + 2] = FloatUnion.floatByte[1];
		Byte[Subscript + 3] = FloatUnion.floatByte[0];
	}
}


/***************************************************************************************
@函数名：void Byte2Float(unsigned char *Byte, unsigned char Subscript, float *FloatValue)
@入口参数：Byte:数组
			     Subscript:指定从数组第几个元素开始写入
		       FloatValue:float值
@出口参数：无
功能描述：从指定地址将4字节数据转成float数据
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void Byte2Float(unsigned char *Byte, unsigned char Subscript, float *FloatValue)
{
	FloatUnion.floatByte[0]=Byte[Subscript];
	FloatUnion.floatByte[1]=Byte[Subscript + 1];
	FloatUnion.floatByte[2]=Byte[Subscript + 2];
	FloatUnion.floatByte[3]=Byte[Subscript + 3];
	*FloatValue=FloatUnion.floatValue;
}


/***************************************************************************************
@函数名：void NCLink_Send_Status(float roll,float pitch,float yaw,
											           float roll_gyro,float pitch_gyro,float yaw_gyro,
												         float imu_temp,float vbat,uint8_t fly_model,uint8_t armed)
@入口参数：roll:横滚角
			     pitch:俯仰角
           yaw:偏航角
					 roll_gyro:偏航角速度
					 pitch_gyro:偏航角速度
					 yaw_gyro:偏航角速度
					 imu_temp:IMU温度
					 vbat:偏航角速度
					 fly_model:飞行模式
					 armed:解锁状态
@出口参数：无
功能描述：发送姿态、温度、飞控状态给地面站
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void NCLink_Send_Status(float roll,float pitch,float yaw,
											  float roll_gyro,float pitch_gyro,float yaw_gyro,
												float imu_temp,float vbat,uint8_t fly_model,uint8_t armed)
{
  uint8_t _cnt=0;
  int16_t _temp;
	int32_t _temp1;
  uint8_t sum = 0;
  uint8_t i;
  nclink_databuf[_cnt++]=NCLink_Head[0];
  nclink_databuf[_cnt++]=NCLink_Head[1];
  nclink_databuf[_cnt++]=NCLINK_STATUS;
  nclink_databuf[_cnt++]=0;
  
  _temp = (int)(roll*100);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
  _temp = (int)(pitch*100);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
  _temp = (int)(yaw*10);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);  
  _temp1=100*roll_gyro;
	nclink_databuf[_cnt++]=BYTE3(_temp1);
  nclink_databuf[_cnt++]=BYTE2(_temp1);
  nclink_databuf[_cnt++]=BYTE1(_temp1);
  nclink_databuf[_cnt++]=BYTE0(_temp1);
	_temp1=100*pitch_gyro;
	nclink_databuf[_cnt++]=BYTE3(_temp1);
  nclink_databuf[_cnt++]=BYTE2(_temp1);
  nclink_databuf[_cnt++]=BYTE1(_temp1);
  nclink_databuf[_cnt++]=BYTE0(_temp1);
	
	_temp1=100*yaw_gyro;
	nclink_databuf[_cnt++]=BYTE3(_temp1);
  nclink_databuf[_cnt++]=BYTE2(_temp1);
  nclink_databuf[_cnt++]=BYTE1(_temp1);
  nclink_databuf[_cnt++]=BYTE0(_temp1);
	
  _temp = (int16_t)(100*imu_temp);//单位℃
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);	

  _temp = (int16_t)(100*vbat);//单位V
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
	
	
  nclink_databuf[_cnt++]=fly_model;//飞行模式
  nclink_databuf[_cnt++]=armed;//上锁0、解锁1
  nclink_databuf[3] = _cnt-4;
  for(i=0;i<_cnt;i++) sum ^= nclink_databuf[i];
  nclink_databuf[_cnt++]=sum;
	nclink_databuf[_cnt++]=NCLink_End[0];
	nclink_databuf[_cnt++]=NCLink_End[1];
  Serial_Data_Send(nclink_databuf, _cnt);
}


void NCLink_Send_3D_Track(float x,float y,float z,float _q0,float _q1,float _q2,float _q3)
{
  uint8_t sum=0,_cnt=0,i=0;
	int16_t _temp;
	
  nclink_databuf[_cnt++]=NCLink_Head[0];
  nclink_databuf[_cnt++]=NCLink_Head[1];
  nclink_databuf[_cnt++]=NCLINK_SEND_3D_TRACK;
  nclink_databuf[_cnt++]=0;
		
	Float2Byte(&x,nclink_databuf,_cnt);//4
	_cnt+=4;
	Float2Byte(&y,nclink_databuf,_cnt);//8
	_cnt+=4;
	Float2Byte(&z,nclink_databuf,_cnt);//12
	_cnt+=4;

  _temp = (int)(_q0*10000);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
  _temp = (int)(_q1*10000);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
  _temp = (int)(_q2*10000);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);
  _temp = (int)(_q3*10000);
  nclink_databuf[_cnt++]=BYTE1(_temp);
  nclink_databuf[_cnt++]=BYTE0(_temp);


  nclink_databuf[3] = _cnt-4;
	
  for(i=0;i<_cnt;i++) sum ^= nclink_databuf[i]; 
  nclink_databuf[_cnt++]=sum;
	
	nclink_databuf[_cnt++]=NCLink_End[0];
	nclink_databuf[_cnt++]=NCLink_End[1];
  Serial_Data_Send(nclink_databuf,_cnt);
}

/***************************************************************************************
@函数名：NCLink_Send_Userdata(float userdata1	 ,float userdata2,
											        float userdata3  ,float userdata4,
											        float userdata5  ,float userdata6)
@入口参数：userdata1:用户数据1
					 userdata2:用户数据2
					 userdata3:用户数据3
					 userdata4:用户数据4
					 userdata5:用户数据5
					 userdata6:用户数据6
@出口参数：无
功能描述：发送用户数据给地面站
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void NCLink_Send_Userdata(float userdata1	 ,float userdata2,
											    float userdata3  ,float userdata4,
											    float userdata5  ,float userdata6)
{
  uint8_t sum=0,_cnt=0,i=0;
  nclink_databuf[_cnt++]=NCLink_Head[0];
  nclink_databuf[_cnt++]=NCLink_Head[1];
  nclink_databuf[_cnt++]=NCLINK_USER;
  nclink_databuf[_cnt++]=0;
		
	Float2Byte(&userdata1,nclink_databuf,_cnt);//4
	_cnt+=4;
	Float2Byte(&userdata2,nclink_databuf,_cnt);//8
	_cnt+=4;
	Float2Byte(&userdata3,nclink_databuf,_cnt);//12
	_cnt+=4;
	Float2Byte(&userdata4,nclink_databuf,_cnt);//16
	_cnt+=4;
	Float2Byte(&userdata5,nclink_databuf,_cnt);//20
	_cnt+=4;
	Float2Byte(&userdata6,nclink_databuf,_cnt);//24
	_cnt+=4;//28

  nclink_databuf[3] = _cnt-4;
	
  for(i=0;i<_cnt;i++) sum ^= nclink_databuf[i]; 
  nclink_databuf[_cnt++]=sum;
	
	nclink_databuf[_cnt++]=NCLink_End[0];
	nclink_databuf[_cnt++]=NCLink_End[1];
  Serial_Data_Send(nclink_databuf,_cnt);
}


/***************************************************************************************
@函数名：void NCLink_Send_Check(uint8_t response)
@入口参数：response:应答
@出口参数：无
功能描述：发送应答数据给地面站
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
static void NCLink_Send_Check(uint8_t response)//地面站应答校验
{
  uint8_t sum = 0,i=0;
  nclink_databuf[0]=NCLink_Head[0];
  nclink_databuf[1]=NCLink_Head[1];
  nclink_databuf[2]=NCLINK_SEND_CHECK;
  nclink_databuf[3]=1;
  nclink_databuf[4]=response;
  for(i=0;i<5;i++) sum ^= nclink_databuf[i];
  nclink_databuf[5]=sum;
	nclink_databuf[6]=NCLink_End[0];
	nclink_databuf[7]=NCLink_End[1];
  Serial_Data_Send(nclink_databuf,8);
}

/***************************************************************************************
@函数名：NCLink_Send_Check_Status_Parameter(void)
@入口参数：无
@出口参数：无
功能描述：发送应答数据、请求数据给地面站
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
uint8_t NCLink_Send_Check_Status_Parameter(void)
{
	if(NCLink_Send_Check_Flag[0]==1)//飞控解析第1组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID1_3);
		 NCLink_Send_Check_Flag[0]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[1]==1)//飞控解析第2组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID4_6);
		 NCLink_Send_Check_Flag[1]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[2]==1)//飞控解析第3组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID7_9);
		 NCLink_Send_Check_Flag[2]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[3]==1)//飞控解析第4组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID10_12);
		 NCLink_Send_Check_Flag[3]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[4]==1)//飞控解析第5组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID13_15);
		 NCLink_Send_Check_Flag[4]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[5]==1)//飞控解析第6组PID参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PID16_18);
		 NCLink_Send_Check_Flag[5]=0;
		 return 1;
	}
  else if(NCLink_Send_Check_Flag[6]==1)//飞控解析其它参数成功，返回状态给地面站
	{
	   NCLink_Send_Check(NCLINK_SEND_PARA);
		 NCLink_Send_Check_Flag[6]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[7]==1)//飞控解析遥控器数据成功，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_RC);	
		 NCLink_Send_Check_Flag[7]=0;
		 return 1;
	}
  else if(NCLink_Send_Check_Flag[8]==1)//飞控解析位移数据成功，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_DIS);
		 NCLink_Send_Check_Flag[8]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[9]==1)//飞控传感器校准完毕，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_CAL);
		 NCLink_Send_Check_Flag[9]=0;
		
		 NCLink_Send_Check_Flag[10]=1;//每次校准完毕自动刷新地面站校准数据
		 return 1;
	}
  else if(NCLink_Send_Check_Flag[10]==1)//飞控传感器校准成功，返回状态给地面站
	{
		 static uint16_t cnt=0;
		 if(cnt==0)
		 {
		   NCLink_Send_Check(NCLINK_SEND_CAL_READ);	
			 cnt=1;
		 }
		 else if(cnt==1)
		 {	 
		   cnt=2;
		 }
		 else if(cnt==2)
		 {	 
		    cnt=3;
		 }      
		 else if(cnt==3)
		 {
		    cnt=0;
			  NCLink_Send_Check_Flag[10]=0;
		 } 
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[11]==1)//飞控恢复出厂设置完毕，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_FACTORY);
		 NCLink_Send_Check_Flag[11]=0;
		 return 1;
	}	
	else if(NCLink_Send_Check_Flag[12]==1)//飞控接收到预留参数，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_PARA_RESERVED);
		 NCLink_Send_Check_Flag[12]=0;
		 return 1;
	}	
	else if(NCLink_Send_Check_Flag[13]==1)//飞控接收到导航控制指令，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_NAV_CTRL);
		 NCLink_Send_Check_Flag[13]=0;
		 return 1;
	}
	else if(NCLink_Send_Check_Flag[14]==1)//飞控导航控制执行完毕，返回状态给地面站
	{
		 NCLink_Send_Check(NCLINK_SEND_NAV_CTRL_FINISH);
		 NCLink_Send_Check_Flag[14]=0;
		 return 1;
	}		
	else if(NCLink_Send_Ask_Flag[0]==1)//接收到地面站读取PID参数请求，飞控发送第1组PID参数给地面站
	{
		NCLink_Send_Ask_Flag[0]=0;
		return 1;
	}
	else if(NCLink_Send_Ask_Flag[1]==1)//接收到地面站读取PID参数请求，飞控发送第2组PID参数给地面站
	{
			NCLink_Send_Ask_Flag[1]=0;
			return 1;
	}
  else if(NCLink_Send_Ask_Flag[2]==1)//接收到地面站读取PID参数请求，飞控发送第3组PID参数给地面站
  {
			NCLink_Send_Ask_Flag[2]=0;
			return 1;
  }
  else if(NCLink_Send_Ask_Flag[3]==1)//接收到地面站读取PID参数请求，飞控发送第4组PID参数给地面站
  {
			NCLink_Send_Ask_Flag[3]=0;
			return 1;
	}
	else if(NCLink_Send_Ask_Flag[4]==1)//接收到地面站读取PID参数请求，飞控发送第5一组PID参数给地面站
	{
		NCLink_Send_Ask_Flag[4]=0;
		return 1;
	}
	else if(NCLink_Send_Ask_Flag[5]==1)//接收到地面站读取PID参数请求，飞控发送第6组PID参数给地面站
	{
		NCLink_Send_Ask_Flag[5]=0;
		return 1;
	}
	else if(NCLink_Send_Ask_Flag[6]==1)//接收到地面站读取其它参数请求，飞控发送其它参数给地面站
	{
		 NCLink_Send_Ask_Flag[6]=0;
		 return 1;	
	}
	else if(NCLink_Send_Ask_Flag[7]==1)//接收到地面站读取预留参数请求，飞控发送其它参数给地面站
	{
		 NCLink_Send_Ask_Flag[7]=0;
		 return 1;	
	}
	else if(NCLink_Send_Ask_Flag[8]==1)//接收到地面站读取全部预留参数请求，飞控发送其它参数给地面站
	{ 
		 NCLink_Send_Ask_Flag[8]=0;
		 return 1;	
	}
	else return 0;
}




uint32_t nclink_receive_fault_cnt=0;
static uint8_t nclink_buf[100];
void NCLink_Data_Prase_Process_Lite(uint8_t *data_buf,uint8_t num);
void NCLink_Data_Prase_Prepare_Lite(uint8_t data)//地面站数据解析
{
  static uint8_t data_len = 0,data_cnt = 0;
  static uint8_t state = 0;
  if(state==0&&data==NCLink_Head[1])//判断帧头1
  {
    state=1;
    nclink_buf[0]=data;
  }
  else if(state==1&&data==NCLink_Head[0])//判断帧头2
  {
    state=2;
    nclink_buf[1]=data;
  }
  else if(state==2&&data<0XF1)//功能字节
  {
    state=3;
    nclink_buf[2]=data;
  }
  else if(state==3&&data<100)//有效数据长度
  {
    state = 4;
    nclink_buf[3]=data;
    data_len = data;
    data_cnt = 0;
  }
  else if(state==4&&data_len>0)//数据接收
  {
    data_len--;
    nclink_buf[4+data_cnt++]=data;
    if(data_len==0)  state = 5;
  }
  else if(state==5)//异或校验
  {
    state = 6;
    nclink_buf[4+data_cnt++]=data;
  }
	else if(state==6&&data==NCLink_End[0])//帧尾0
	{
			state = 7;
			nclink_buf[4+data_cnt++]=data;
	}
	else if(state==7&&data==NCLink_End[1])//帧尾1
	{
			state = 0;
			nclink_buf[4+data_cnt]=data;
		  NCLink_Data_Prase_Process_Lite(nclink_buf,data_cnt+5);//数据解析
	}
  else 
	{
		state = 0;
		nclink_receive_fault_cnt++;
	}
}

void NCLink_Data_Prase_Process_Lite(uint8_t *data_buf,uint8_t num)//飞控数据解析进程
{
  uint8_t sum = 0;
  for(uint8_t i=0;i<(num-3);i++)  sum ^= *(data_buf+i);
  if(!(sum==*(data_buf+num-3)))    																					return;//判断sum	
	if(!(*(data_buf)==NCLink_Head[1]&&*(data_buf+1)==NCLink_Head[0]))         return;//判断帧头
	if(!(*(data_buf+num-2)==NCLink_End[0]&&*(data_buf+num-1)==NCLink_End[1])) return;//帧尾校验  
	
  if(*(data_buf+2)==0X09)                             //遥控器参数
  {
    NCLINK_PPM_Databuf[0]=(int16_t)(*(data_buf+4)<<8) |*(data_buf+5);
    NCLINK_PPM_Databuf[1]=(int16_t)(*(data_buf+6)<<8) |*(data_buf+7);
    NCLINK_PPM_Databuf[2]=(int16_t)(*(data_buf+8)<<8) |*(data_buf+9);
    NCLINK_PPM_Databuf[3]=(int16_t)(*(data_buf+10)<<8)|*(data_buf+11);
    NCLINK_PPM_Databuf[4]=(int16_t)(*(data_buf+12)<<8)|*(data_buf+13);
    NCLINK_PPM_Databuf[5]=(int16_t)(*(data_buf+14)<<8)|*(data_buf+15);
    NCLINK_PPM_Databuf[6]=(int16_t)(*(data_buf+16)<<8)|*(data_buf+17);
    NCLINK_PPM_Databuf[7]=(int16_t)(*(data_buf+18)<<8)|*(data_buf+19);
    NCLINK_PPM_Databuf[8]=(int16_t)(*(data_buf+20)<<8)|*(data_buf+21);
    NCLINK_PPM_Databuf[9]=(int16_t)(*(data_buf+22)<<8)|*(data_buf+23);
		
		rc_update_flag=1;
		
		unlock_flag=*(data_buf+24);
		takeoff_flag=*(data_buf+25);		
		NCLink_Send_Check_Flag[7]=1;
		Pilot_Status_Tick();	
  }
	else if(*(data_buf+2)==0X0A)                             //地面站控制移动数据
  {		
    ngs_sdk.move_mode=*(data_buf+4),
		ngs_sdk.mode_order=*(data_buf+5);
    ngs_sdk.move_distance=(uint16_t)(*(data_buf+6)<<8)|*(data_buf+7);;
    ngs_sdk.update_flag=true;
		
		ngs_sdk.move_flag.sdk_front_flag=false;
		ngs_sdk.move_flag.sdk_behind_flag=false;
		ngs_sdk.move_flag.sdk_left_flag=false;
		ngs_sdk.move_flag.sdk_right_flag=false;
		ngs_sdk.move_flag.sdk_up_flag=false;
		ngs_sdk.move_flag.sdk_down_flag=false;
		
		if(*(data_buf+4)==SDK_FRONT)
		{					
			ngs_sdk.move_flag.sdk_front_flag=true;
			ngs_sdk.f_distance=ngs_sdk.move_distance;
		}
		else if(*(data_buf+4)==SDK_BEHIND) 
		{					
			ngs_sdk.move_flag.sdk_behind_flag=true;
			ngs_sdk.f_distance=-ngs_sdk.move_distance;
		}
		else if(*(data_buf+4)==SDK_LEFT)  
		{			
			ngs_sdk.move_flag.sdk_left_flag=true;
			ngs_sdk.f_distance=ngs_sdk.move_distance;
		}
		else if(*(data_buf+4)==SDK_RIGHT)
		{					
			ngs_sdk.move_flag.sdk_right_flag=true;
			ngs_sdk.f_distance=-ngs_sdk.move_distance;
		}
		else if(*(data_buf+4)==SDK_UP)
		{  				
			ngs_sdk.move_flag.sdk_up_flag=true;
			ngs_sdk.f_distance=ngs_sdk.move_distance;
		}
		else if(*(data_buf+4)==SDK_DOWN) 
		{					
			ngs_sdk.move_flag.sdk_down_flag=true;
			ngs_sdk.f_distance=-ngs_sdk.move_distance;
		}				
		//NCLink_Send_Check_Flag[8]=1;
		Pilot_Status_Tick();	
		//send_check_back=1;
  }
	else if(*(data_buf+2)==0X0F)//导航控制指令
	{
		ngs_nav_ctrl.number=(uint16_t)(*(data_buf+4)<<8) |*(data_buf+5);
		Byte2Float(data_buf,6, &ngs_nav_ctrl.x);
		Byte2Float(data_buf,10,&ngs_nav_ctrl.y);
		Byte2Float(data_buf,14,&ngs_nav_ctrl.z);
		ngs_nav_ctrl.nav_mode=*(data_buf+18);
		ngs_nav_ctrl.frame_id=*(data_buf+19);
		ngs_nav_ctrl.cmd_vel_during_cnt=(uint32_t)(*(data_buf+20)<<24|*(data_buf+21)<<16|*(data_buf+22)<<8|*(data_buf+23));	//速度控制时的作用时间,单位MS
		if(ngs_nav_ctrl.nav_mode!=CMD_VEL_MODE)	ngs_nav_ctrl.update_flag=1;
		else//速度控制模式 
		{
			ngs_nav_ctrl.cmd_vel_x=-ngs_nav_ctrl.x;			   //cm/s
			ngs_nav_ctrl.cmd_vel_y= ngs_nav_ctrl.y;        //cm/s
			ngs_nav_ctrl.cmd_vel_angular_z=ngs_nav_ctrl.z; //deg/s			
			//限幅处理避免新手错误操作，输入值过大导致飞机期望过大造成的失控
			ngs_nav_ctrl.cmd_vel_x=constrain_float(ngs_nav_ctrl.cmd_vel_x,-ngs_nav_ctrl.cmd_vel_max,ngs_nav_ctrl.cmd_vel_max);
			ngs_nav_ctrl.cmd_vel_y=constrain_float(ngs_nav_ctrl.cmd_vel_y,-ngs_nav_ctrl.cmd_vel_max,ngs_nav_ctrl.cmd_vel_max);
			ngs_nav_ctrl.cmd_vel_angular_z=constrain_float(ngs_nav_ctrl.cmd_vel_angular_z,-ngs_nav_ctrl.cmd_angular_max,ngs_nav_ctrl.cmd_angular_max);
			ngs_nav_ctrl.cmd_vel_during_cnt/=5;//作用时间200*5=1000ms		
			ngs_nav_ctrl.cmd_vel_update=1;
		}	
		Pilot_Status_Tick();	
	}	
}

/***************************************************************************************
@函数名：NCLink_SEND_StateMachine(void)
@入口参数：无
@出口参数：无
功能描述：状态机——飞控发送数据给地面站
@作者：无名小哥
@日期：2020年01月17日
****************************************************************************************/
void NCLink_SEND_StateMachine(void)
{
	static uint16_t nclink_cnt=0;
	if(NCLink_Send_Check_Status_Parameter()) return;//判断地面站有无请求数据、是否需要发送应答
	if(nclink_cnt==0)//飞控姿态等基本信息
	{
		nclink_cnt++;
		NCLink_Send_Status(smartcar_imu.rpy_deg[ROL],smartcar_imu.rpy_deg[PIT],smartcar_imu.rpy_deg[YAW],
											 smartcar_imu.rpy_gyro_dps[ROL],smartcar_imu.rpy_gyro_dps[PIT],smartcar_imu.rpy_gyro_dps[YAW],
											 smartcar_imu.temperature_filter,smartcar_imu.vbat,0,0);
	}
	else if(nclink_cnt==1)//3D轨迹显示
	{
		nclink_cnt++;
		NCLink_Send_3D_Track(smartcar_imu.state_estimation.pos.x,
												 smartcar_imu.state_estimation.pos.y,
												 0,
												 smartcar_imu.quaternion[0],
												 smartcar_imu.quaternion[1],
												 smartcar_imu.quaternion[2],
												 smartcar_imu.quaternion[3]);
		
	}
	else
	{
		NCLink_Send_Userdata(RC_Data.rc_rpyt[RC_ROLL]*DEG2RAD,
												 smartcar_imu.state_estimation.w*DEG2RAD,
												 RC_Data.rc_rpyt[RC_PITCH],
												 smartcar_imu.state_estimation.speed,
												 smartcar_imu.rpy_deg[PIT],
												 smartcar_imu.rpy_kalman_deg[PIT]);
		nclink_cnt=0;	
	}
}




#define PACK_HEAD 0xa5   
#define PACK_TAIL 0x5a 

uint8_t bt_app_output_buf[50];
uint8_t bt_app_input_buf[50];
void bluetooth_app_send(float user1,float user2,float user3,float user4,
												float user5,float user6,float user7,float user8)
{
	uint8_t _cnt=0,sum=0;
	bt_app_output_buf[_cnt]=PACK_HEAD;
	_cnt++;
	bt_app_output_buf[_cnt]=32;//数据长度
	_cnt++;
	Float2Byte(&user1,bt_app_output_buf,_cnt);//1
	_cnt+=4;
	Float2Byte(&user2,bt_app_output_buf,_cnt);//5
	_cnt+=4;
	Float2Byte(&user3,bt_app_output_buf,_cnt);//9
	_cnt+=4;
	Float2Byte(&user4,bt_app_output_buf,_cnt);//13
	_cnt+=4;
	Float2Byte(&user5,bt_app_output_buf,_cnt);//17
	_cnt+=4;
	Float2Byte(&user6,bt_app_output_buf,_cnt);//21
	_cnt+=4;
	Float2Byte(&user7,bt_app_output_buf,_cnt);//25
	_cnt+=4;
	Float2Byte(&user8,bt_app_output_buf,_cnt);//29
	_cnt+=4;	
  for(uint16_t i=1;i<_cnt;i++) sum += bt_app_output_buf[i]; 
  bt_app_output_buf[_cnt++]=sum;
	bt_app_output_buf[_cnt++]=PACK_TAIL;
	//UART_SendBytes(UART_2_INST,bt_app_output_buf,_cnt);	
	DL_DMA_setSrcAddr(DMA, DMA_CH0_CHAN_ID, (uint32_t) &bt_app_output_buf[0]);
	DL_DMA_setDestAddr(DMA, DMA_CH0_CHAN_ID, (uint32_t)(&UART_2_INST->TXDATA));
	DL_DMA_setTransferSize(DMA, DMA_CH0_CHAN_ID, _cnt);
	DL_DMA_enableChannel(DMA, DMA_CH0_CHAN_ID);	
}
	
float bt_user_data[8]={0};
uint16_t bluetooth_ppm[8]={0};
uint8_t bt_update_flag=0;
void bluetooth_app_prase(uint8_t byte)
{
	uint8_t sum=0;
	static uint8_t state=0,cnt=0,data_len=0;
  if(state==0&&byte==PACK_HEAD)//帧头1
  {
    state=1;
    bt_app_input_buf[0]=byte;
  }
	else if(state==1&&byte<50)
	{
		state=2;
	  data_len=byte;
		bt_app_input_buf[1]=byte;
		cnt=0;
	}
	else if(state==2&&data_len>0)
	{
		data_len--;
	  bt_app_input_buf[2+cnt++]=byte;//cnt=32
		if(data_len==0) state = 3;
	}
	else if(state==3)//最后接收数据校验和
	{
		state=4;
		bt_app_input_buf[2+cnt++]=byte;//cnt=33
	}
	else if(state==4&&byte==PACK_TAIL)//帧尾
	{
		bt_app_input_buf[2+cnt++]=byte;//帧尾 cnt=34
		state=0;
		sum=0;
		for(uint16_t i=1;i<cnt;i++)		sum+=bt_app_input_buf[i];
		if(sum==bt_app_input_buf[cnt])//满足和校验
		{
			Byte2Float(bt_app_input_buf,2,&bt_user_data[0]);
			Byte2Float(bt_app_input_buf,6,&bt_user_data[1]);
			Byte2Float(bt_app_input_buf,10,&bt_user_data[2]);
			Byte2Float(bt_app_input_buf,14,&bt_user_data[3]);
			Byte2Float(bt_app_input_buf,18,&bt_user_data[4]);
			Byte2Float(bt_app_input_buf,22,&bt_user_data[5]);
			Byte2Float(bt_app_input_buf,26,&bt_user_data[6]);
			Byte2Float(bt_app_input_buf,30,&bt_user_data[7]);
			for(uint16_t j=0;j<8;j++)
			{
				bluetooth_ppm[j]=(int)bt_user_data[j];
				bt_update_flag=1;
			}
		}
	}
	else state=0;

}
