#include "headfile.h"
#include "vision.h"

float install_angle_rpy[3]={0,0,0};
float install_height_cm=30.0f;
unsigned char sdk_data_to_send[10];

/***************************************
函数名:	void SDK_DT_Send_Check(unsigned char mode,COM_SDK com)
说明: 飞控向openmv发送工作模式数据帧
入口:	unsigned char mode-模式
			COM_SDK com-串口号
出口:	无
备注:	无
作者:	无名创新
***************************************/
void SDK_DT_Send_Check(unsigned char mode,COM_SDK com)
{
  sdk_data_to_send[0]=0xFF;
  sdk_data_to_send[1]=0xFE;
  sdk_data_to_send[2]=0xA0;
  sdk_data_to_send[3]=2;
  sdk_data_to_send[4]=mode;
  sdk_data_to_send[5]=0
    ;
//  u8 sum = 0;
//  for(u8 i=0;i<6;i++) sum += sdk_data_to_send[i];
//  sdk_data_to_send[6]=sum;
//	if(com==UART7_SDK) UART_SendBytes(7,sdk_data_to_send, 7);
//	if(com==UART1_SDK) UART_SendBytes(1,sdk_data_to_send, 7); 
}


#define SDK_TARGET_X_OFFSET  0
#define SDK_TARGET_Y_OFFSET  0


Target_Check camera1,camera2;
float SDK_Target_Yaw_Gyro=0;

/*************************************************************************/
#define  Pixel_Size_MV    0.0024f//6um=0.000006m=0.0006cm
                       //320---0.0012
                       //160---0.0024
                       //80 ---0.0048
#define  Focal_Length_MV  0.42f

#define OV7725_Sensor_Width_MM    		3.984f//3984um
#define OV7725_Sensor_Height_MM   		2.952f//2952um
#define Pixel_Image_Width_MV    		160//320
#define Pixel_Image_Height_MV   		120//240
#define Pixel_Image_Focal_MM_MV 		4.2f
#define Pixel_Image_View_Angle_X_MV  (56.72/2)//deg(50.75/2)
#define Pixel_Image_View_Angle_Y_MV  (44.07/2)//deg(38.72/2)
/*************************************************************************/
#define  Pixel_Size_CV    0.00056f//cm
													//2592:1944——0.00014cm
													//640:480——0.00056cm
#define  Focal_Length_CV  0.36f  //焦距3.6mm

#define OV5647_Sensor_Width_MM    		3.674f//3674um
#define OV5647_Sensor_Height_MM   		2.738f//2738.4um#
#define Pixel_Image_Width_CV    			640//640
#define Pixel_Image_Height_CV   			480//480
#define Pixel_Image_Focal_MM_CV 			3.6f
#define Pixel_Image_View_Angle_X_CV  (53.5/2)//约为66deg广角
#define Pixel_Image_View_Angle_Y_CV  (41.4/2)


#define AprilTag_Side_Length  13.6f//cm13.6

float _Pixel_Image_View_Angle_X,_Pixel_Image_View_Angle_Y;
/***************************************
函数名:	void Get_Camera_Wide_Angle(float view_angle)
说明: 通过摄像头视场角计算x,y方向视角
入口:	float view_angle-视场角fov
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Get_Camera_Wide_Angle(float view_angle)
{
	float fh=5.0f/tanf(0.5f*view_angle*DEG2RAD);
  _Pixel_Image_View_Angle_X=2*RAD2DEG*atanf(4/fh);
  _Pixel_Image_View_Angle_Y=2*RAD2DEG*atanf(3/fh);
}

uint16_t _CX=0,_CY=0;
float _P1=0,_P2=0,_TX=0,_TY=0,_DX=0,_DY=0;
/***************************************
函数名:	void Sensor_Parameter_Sort(uint16_t tx,uint16_t ty,float pitch,float roll,float alt)
说明: 从图像坐标到实际距离偏移的转换
入口:	uint16_t tx-图像坐标x
			uint16_t ty-图像坐标y
			float pitch-俯仰角
			float roll-横滚角
			float alt-距离
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Sensor_Parameter_Sort(uint16_t tx,uint16_t ty,float pitch,float roll,float alt)
{
//	Get_Camera_Wide_Angle(68);//根据摄像头广角，计算得到X、Y轴视角
	float theta_x_max=0,theta_y_max=0;
	theta_x_max=Pixel_Image_View_Angle_X_MV;
	theta_y_max=Pixel_Image_View_Angle_Y_MV;
  _P1=0.5f*Pixel_Image_Width_MV/tanf(theta_x_max*DEG2RAD);	
	_P2=0.5f*Pixel_Image_Height_MV/tanf(theta_y_max*DEG2RAD);
	
	_CX=Pixel_Image_Width_MV/2;
	_CY=Pixel_Image_Height_MV/2;
	
	float tmp_x=0,tmp_y=0;
	tmp_x=atanf((_CX-tx)/_P1);
	tmp_y=atanf((_CY-ty)/_P2);
	
	_TX= tanf(tmp_x+roll*DEG2RAD) *_P1;
	_TY= tanf(tmp_y+pitch*DEG2RAD)*_P2;
	
//	_DX=alt*_TX/_P1;
//	_DY=alt*_TY/_P2;
	_DX=0.5f*alt*_TX/_P1;
	_DY=0.5f*alt*_TY/_P2;

	camera1.sdk_target.x=_DX;
  camera1.sdk_target.y=_DY;
}


/***************************************
函数名:	void SDK_DT_Reset(void)
说明: SDK数据结构体复位
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void SDK_DT_Reset(void)
{
  camera1.x=0;
  camera1.y=0; 
  camera1.pixel=0;
  camera1.flag=0;
	camera1.state=0;
	camera1.angle=0;
	camera1.distance=0;
	camera1.apriltag_id=0;
	camera1.width=0;
	camera1.height=0;
	camera1.fps=0;
	camera1.reserved1=0;
	camera1.reserved2=0;
	camera1.reserved3=0;
	camera1.reserved4=0;
	camera1.range_sensor1=0;
	camera1.range_sensor2=0;
	camera1.range_sensor3=0;
	camera1.range_sensor4=0;
	
	camera2.x=0;
  camera2.y=0; 
  camera2.pixel=0;
  camera2.flag=0;
	camera2.state=0;
	camera2.angle=0;
	camera2.distance=0;
	camera2.apriltag_id=0;
	camera2.width=0;
	camera2.height=0;
	camera2.fps=0;
	camera2.reserved1=0;
	camera2.reserved2=0;
	camera2.reserved3=0;
	camera2.reserved4=0;
	camera2.range_sensor1=0;
	camera2.range_sensor2=0;
	camera2.range_sensor3=0;
	camera2.range_sensor4=0;
}

/***************************************
函数名:	void Openmv_Data_Receive_Anl_1(uint8_t *data_buf,uint8_t num,Target_Check *target)
说明: openmv1数据解析
入口:	uint8_t *data_buf-待解析数据
			uint8_t num-待解析数据长度
			Target_Check *target-目标检测结构体
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Openmv_Data_Receive_Anl_1(uint8_t *data_buf,uint8_t num,Target_Check *target)
{
  uint8_t sum = 0;
  for(uint8_t i=0;i<(num-1);i++)  sum+=*(data_buf+i);
  if(!(sum==*(data_buf+num-1))) 	return;//不满足和校验条件
  if(!(*(data_buf)==0xFF && *(data_buf+1)==0xFC))return;//不满足帧头条件
	target->x				  =*(data_buf+4)<<8|*(data_buf+5);
  target->y					=*(data_buf+6)<<8|*(data_buf+7);
	target->pixel			=*(data_buf+8)<<8|*(data_buf+9);  
	target->flag			=*(data_buf+10);
	target->state		  =*(data_buf+11);		
	target->angle		  =*(data_buf+12)<<8|*(data_buf+13);
	target->distance  =*(data_buf+14)<<8|*(data_buf+15);
	target->apriltag_id=*(data_buf+16)<<8|*(data_buf+17);
	target->width	    =*(data_buf+18)<<8|*(data_buf+19);
	target->height	  =*(data_buf+20)<<8|*(data_buf+21);
	target->fps  		  =*(data_buf+22);
	target->reserved1 =*(data_buf+23);
	target->reserved2 =*(data_buf+24);
	target->reserved3 =*(data_buf+25);
	target->reserved4 =*(data_buf+26);
	//扩展距离传感器
	target->range_sensor1 =*(data_buf+27)<<8|*(data_buf+28);
	target->range_sensor2 =*(data_buf+29)<<8|*(data_buf+30);
	target->range_sensor3 =*(data_buf+31)<<8|*(data_buf+32);
	target->range_sensor4 =*(data_buf+33)<<8|*(data_buf+34);
	target->camera_id=*(data_buf+35);
	target->reserved1_int32=*(data_buf+36)<<24|*(data_buf+37)<<16|*(data_buf+38)<<8|*(data_buf+39);
	target->reserved2_int32=*(data_buf+40)<<24|*(data_buf+41)<<16|*(data_buf+42)<<8|*(data_buf+43);
	target->reserved3_int32=*(data_buf+44)<<24|*(data_buf+45)<<16|*(data_buf+46)<<8|*(data_buf+47);
	target->reserved4_int32=*(data_buf+48)<<24|*(data_buf+49)<<16|*(data_buf+50)<<8|*(data_buf+51);
	
	target->x_pixel_size=Pixel_Size_MV*(Pixel_Image_Width_MV/target->width);
	target->y_pixel_size=Pixel_Size_MV*(Pixel_Image_Height_MV/target->height);
  target->apriltag_distance=AprilTag_Side_Length*Focal_Length_MV/(target->x_pixel_size*FastSqrt(target->pixel));
  target->sdk_mode=*(data_buf+2);
	
	//从左到右依次是bit16、bit15 、bit14、bit13...、bit1
	target->x0.value=target->x;
	//从上到下依次是bit16、bit15 、bit14、bit13...、bit1
	target->y0.value=target->y;
	
	if(target->camera_id==0x01)//摄像头id为OPENMV
	{
		switch(target->sdk_mode)
		{
			case 0xC3://线检测
			{
				target->target_ctrl_enable=target->flag;		
				if(target->flag!=0)  
				{
					if(target->trust_cnt<20)	 
					{
						target->trust_cnt++;
						target->trust_flag=0;
					}
					else target->trust_flag=1;
				}
				else 
				{
					target->trust_cnt/=2;
					target->trust_flag=0;
				}
				target->sdk_target_offset.x=SDK_TARGET_X_OFFSET;
				target->sdk_target_offset.y=SDK_TARGET_Y_OFFSET;
				//Sensor_Parameter_Sort(target->x,target->y,install_angle_rpy[_PIT],install_angle_rpy[_ROL],install_height_cm);
				if(target->angle>90) camera1.sdk_angle=target->angle-180;
				else camera1.sdk_angle=target->angle;	

				target->sdk_target.x=15.0f*(0.5f*camera1.width-camera1.x)/(0.5f*camera1.width);
			}
			break;
			case 0xC4:
			{
				target->target_ctrl_enable=target->flag;		
				if(target->flag!=0)  
				{
					if(target->trust_cnt<20)	 
					{
						target->trust_cnt++;
						target->trust_flag=0;
					}
					else target->trust_flag=1;
				}
				else 
				{
					target->trust_cnt/=2;
					target->trust_flag=0;
				}	

				
				switch(target->x)
				{
					case 0x0001:gray_status[1]=-15; vision_status_worse/=2;break;											//0000-0000-0000-0001b
					case 0x0003:gray_status[1]=-14; vision_status_worse/=2;break;											//0000-0000-0000-0011b
					case 0x0002:gray_status[1]=-13;	vision_status_worse/=2;break;											//0000-0000-0000-0010b
					case 0x0006:gray_status[1]=-12;	vision_status_worse/=2;break;											//0000-0000-0000-0110b
					case 0x0004:gray_status[1]=-11;	vision_status_worse/=2;break;											//0000-0000-0000-0100b
					case 0x000C:gray_status[1]=-10;	vision_status_worse/=2;break;											//0000-0000-0000-1100b
					case 0x0008:gray_status[1]=-9;	vision_status_worse/=2;break;											//0000-0000-0000-1000b
					case 0x0018:gray_status[1]=-8;	vision_status_worse/=2;break;											//0000-0000-0001-1000b
					case 0x0010:gray_status[1]=-7;	vision_status_worse/=2;break;											//0000-0000-0001-0000b
					case 0x0030:gray_status[1]=-6;	vision_status_worse/=2;break;											//0000-0000-0011-0000b
					case 0x0020:gray_status[1]=-5;	vision_status_worse/=2;break;											//0000-0000-0010-0000b
					case 0x0060:gray_status[1]=-4;	vision_status_worse/=2;break;											//0000-0000-0110-0000b
					case 0x0040:gray_status[1]=-3;	vision_status_worse/=2;break;											//0000-0000-0100-0000b
					case 0x00C0:gray_status[1]=-2;  vision_status_worse/=2;break;											//0000-0000-1100-0000b
					case 0x0080:gray_status[1]=-1;  vision_status_worse/=2;break;											//0000-0000-1000-0000b
					case 0x0180:gray_status[1]=0;		vision_status_worse/=2;break;											//0000-0001-1000-0000b
					case 0x0100:gray_status[1]=1;		vision_status_worse/=2;break;											//0000-0001-0000-0000b
					case 0x0300:gray_status[1]=2;		vision_status_worse/=2;break;											//0000-0011-0000-0000b
					case 0x0200:gray_status[1]=3;		vision_status_worse/=2;break;											//0000-0010-0000-0000b
					case 0x0600:gray_status[1]=4;		vision_status_worse/=2;break;											//0000-0110-0000-0000b
					case 0x0400:gray_status[1]=5;		vision_status_worse/=2;break;											//0000-0100-0000-0000b
					case 0x0C00:gray_status[1]=6;		vision_status_worse/=2;break;											//0000-1100-0000-0000b
					case 0x0800:gray_status[1]=7;		vision_status_worse/=2;break;											//0000-1000-0000-0000b
					case 0x1800:gray_status[1]=8;		vision_status_worse/=2;break;											//0001-1000-0000-0000b
					case 0x1000:gray_status[1]=9;		vision_status_worse/=2;break;											//0001-0000-0000-0000b
					case 0x3000:gray_status[1]=10;	vision_status_worse/=2;break;											//0011-0000-0000-0000b
					case 0x2000:gray_status[1]=11;	vision_status_worse/=2;break;											//0010-0000-0000-0000b
					case 0x6000:gray_status[1]=12;	vision_status_worse/=2;break;											//0110-0000-0000-0000b
					case 0x4000:gray_status[1]=13;	vision_status_worse/=2;break;											//0100-0000-0000-0000b
					case 0xC000:gray_status[1]=14;	vision_status_worse/=2;break;											//1100-0000-0000-0000b
					case 0x8000:gray_status[1]=15;	vision_status_worse/=2;break;											//1000-0000-0000-0000b
					case 0x0000:gray_status[1]=gray_status_backup[1][0];vision_status_worse++;break;  //0000-0000-0000-0000b
					default:
					{
						gray_status[1]=gray_status_backup[1][0];
						vision_status_worse++;
					}							
				}
				
				//车库特征点识别单独处理
				static uint16_t tmp_park_cnt=0;
				switch(target->y)
				{
					case 0x0010: 
					case 0x0018: 
					case 0x0008: 
					case 0x000C: tmp_park_cnt++;break;
					case 0x0004: 
					{
						if(tmp_park_cnt>5)
						{
							tmp_park_cnt=0;
							target->carpark_flag[target->carpark_type][target->carpark_num]=1;
							target->carpark_num++;
							
							beep.period=200;//200*5ms
							beep.light_on_percent=0.5f;			
							beep.reset=1;
							beep.times=1;			
						}
					}
					break;
					case 0x0006: 
					case 0x0002: 
					case 0x0003: 
					case 0x0001: break;
				}
			}
			break;
			default:
			{
				target->target_ctrl_enable=0;
				target->trust_flag=0;
				target->x=0;
				target->y=0;
			}
		}
	}
}



static uint8_t state[2] = {0};
static uint8_t _data_len[2] = {0},_data_cnt[2] = {0};
static uint8_t _buf[2][SDK_Target_Length];
/***************************************************
函数名: void SDK_Data_Receive_Prepare_1(uint8_t data)
说明:	openmv1数据解析状态机
入口:	uint8_t data-当前待解析字节
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void SDK_Data_Receive_Prepare_1(uint8_t data)
{
	uint8_t label=0;
  if(state[label]==0&&data==0xFF)//帧头1
  {
    state[label]=1;
    _buf[label][0]=data;
  }
  else if(state[label]==1&&data==0xFC)//帧头2
  {
    state[label]=2;
    _buf[label][1]=data;
  }
  else if(state[label]==2&&data<0XFF)//功能字节
  {
    state[label]=3;
    _buf[label][2]=data;
  }
  else if(state[label]==3&&data<50)//数据长度
  {
    state[label] = 4;
    _buf[label][3]=data;
    _data_len[label] = data;
    _data_cnt[label] = 0;
  }
  else if(state[label]==4&&_data_len>0)//有多少数据长度，就存多少个
  {
    _data_len[label]--;
    _buf[label][4+_data_cnt[label]++]=data;
    if(_data_len[label]==0) state[label] = 5;
  }
  else if(state[label]==5)//最后接收数据校验和
  {
    state[label] = 0;
    _buf[label][4+_data_cnt[label]]=data;
		Openmv_Data_Receive_Anl_1(_buf[label],_data_cnt[label]+5,&camera1);
  }
  else state[label] = 0;
}


/***************************************
函数名:	void Openmv_Data_Receive_Anl_2(uint8_t *data_buf,uint8_t num,Target_Check *target)
说明: openmv2数据解析
入口:	uint8_t *data_buf-待解析数据
			uint8_t num-待解析数据长度
			Target_Check *target-目标检测结构体
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Openmv_Data_Receive_Anl_2(uint8_t *data_buf,uint8_t num,Target_Check *target)
{
  uint8_t sum = 0;
	if(!(*(data_buf)==0xFF && *(data_buf+1)==0xFC))return;//不满足帧头条件
	
  for(uint8_t i=0;i<(num-1);i++)  sum+=*(data_buf+i);
  if(!(sum==*(data_buf+num-1))) 	return;//不满足和校验条件
  	
	target->x				  	=*(data_buf+4)<<8|*(data_buf+5);
  target->y						=*(data_buf+6)<<8|*(data_buf+7);
	target->pixel				=*(data_buf+8)<<8|*(data_buf+9);  
	target->flag				=*(data_buf+10);
	target->state		  	=*(data_buf+11);		
	target->angle		  	=*(data_buf+12)<<8|*(data_buf+13);
	target->distance  	=*(data_buf+14)<<8|*(data_buf+15);
	target->apriltag_id	=*(data_buf+16)<<8|*(data_buf+17);
	target->width	    	=*(data_buf+18)<<8|*(data_buf+19);
	target->height	  	=*(data_buf+20)<<8|*(data_buf+21);
	target->fps  		  	=*(data_buf+22);
	target->reserved1 	=*(data_buf+23);
	target->reserved2 	=*(data_buf+24);
	target->reserved3 	=*(data_buf+25);
	target->reserved4 	=*(data_buf+26);
	//扩展距离传感器
	target->range_sensor1 =*(data_buf+27)<<8|*(data_buf+28);
	target->range_sensor2 =*(data_buf+29)<<8|*(data_buf+30);
	target->range_sensor3 =*(data_buf+31)<<8|*(data_buf+32);
	target->range_sensor4 =*(data_buf+33)<<8|*(data_buf+34);
	target->camera_id=*(data_buf+35);
	target->reserved1_int32=*(data_buf+36)<<24|*(data_buf+37)<<16|*(data_buf+38)<<8|*(data_buf+39);
	target->reserved2_int32=*(data_buf+40)<<24|*(data_buf+41)<<16|*(data_buf+42)<<8|*(data_buf+43);
	target->reserved3_int32=*(data_buf+44)<<24|*(data_buf+45)<<16|*(data_buf+46)<<8|*(data_buf+47);
	target->reserved4_int32=*(data_buf+48)<<24|*(data_buf+49)<<16|*(data_buf+50)<<8|*(data_buf+51);	
	
	target->sdk_mode=*(data_buf+2);
	
	if(target->camera_id==0x01)//摄像头id为OPENMV
	{
		target->x_pixel_size=Pixel_Size_MV*(Pixel_Image_Width_MV/target->width);
		target->y_pixel_size=Pixel_Size_MV*(Pixel_Image_Height_MV/target->height);
		target->apriltag_distance=AprilTag_Side_Length*Focal_Length_MV/(target->x_pixel_size*FastSqrt(target->pixel));
		
		switch(target->sdk_mode)
		{
			case 0xA1:
			default:
			{
				target->target_ctrl_enable=0;
				target->trust_flag=0;
				target->x=0;
				target->y=0;		
			}
		}
	}
}


/***************************************************
函数名: void SDK_Data_Receive_Prepare_2(uint8_t data)
说明:	openmv2数据解析状态机
入口:	uint8_t data-当前待解析字节
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void SDK_Data_Receive_Prepare_2(uint8_t data)
{
	uint8_t label=1;
  if(state[label]==0&&data==0xFF)//帧头1
  {
    state[label]=1;
    _buf[label][0]=data;
  }
  else if(state[label]==1&&data==0xFC)//帧头2
  {
    state[label]=2;
    _buf[label][1]=data;
  }
  else if(state[label]==2&&data<0XFF)//功能字节
  {
    state[label]=3;
    _buf[label][2]=data;
  }
  else if(state[label]==3&&data<50)//数据长度
  {
    state[label] = 4;
    _buf[label][3]=data;
    _data_len[label] = data;
    _data_cnt[label] = 0;
  }
  else if(state[label]==4&&_data_len>0)//有多少数据长度，就存多少个
  {
    _data_len[label]--;
    _buf[label][4+_data_cnt[label]++]=data;
    if(_data_len[label]==0) state[label] = 5;
  }
  else if(state[label]==5)//最后接收数据校验和
  {
    state[label] = 0;
    _buf[label][4+_data_cnt[label]]=data;
		Openmv_Data_Receive_Anl_2(_buf[label],_data_cnt[label]+5,&camera2);
  }
  else state[label] = 0;
}
