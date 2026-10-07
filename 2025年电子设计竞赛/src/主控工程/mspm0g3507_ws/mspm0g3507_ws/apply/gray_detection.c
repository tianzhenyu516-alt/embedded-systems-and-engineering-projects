#include "headfile.h"
#include "gray_detection.h"
#include "user.h"


#define steer_deadzone 50//50  转向控制死区
u8 flag_turn=0,flag_end=0;
typedef struct
{
	uint16_t state;
  bool gray_bit[16];
}_gray_state; 
_gray_state gray_state;
float gray_status[2]={0},gray_status_backup[2][20]={0};//灰度传感器状态与历史值
float turn_output=0,turn_output_last=0;//控制器输出值
float	turn_scale=turn_scale_default;//转向控制差速系数  0.15
uint32_t gray_status_worse=0;	//灰度管异常状态计数器
controller seektrack_ctrl[2];		//自主寻迹控制器结构体
uint32_t vision_status_worse=0;



/***************************************************
函数名: void gpio_input_init(void)
说明:	12路灰度管gpio检测初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void gpio_input_init(void)
{

}

#define read_gray_bit1   ((PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT0_PIN ) ? 0x01 : 0x00)
#define read_gray_bit2   ((PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT1_PIN ) ? 0x01 : 0x00)
#define read_gray_bit3   ((PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT2_PIN ) ? 0x01 : 0x00)
#define read_gray_bit4   ((PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT3_PIN ) ? 0x01 : 0x00)
#define read_gray_bit5   ((PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT4_PIN ) ? 0x01 : 0x00)


/***************************************************
函数名: void gpio_input_check_channel_7(void)
说明:	7路灰度管gpio检测
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void gpio_input_check_channel_5(void)
{
	gray_state.gray_bit[0]=read_gray_bit1;
  gray_state.gray_bit[1]=read_gray_bit2;
	gray_state.gray_bit[2]=read_gray_bit3;
	gray_state.gray_bit[3]=read_gray_bit4;
	
  gray_state.gray_bit[4]=read_gray_bit5;

	gray_state.state=0x0000;	
	for(uint16_t i=0;i<5;i++)
	{
		gray_state.state|=gray_state.gray_bit[i]<<i;
	}
	
	for(uint16_t i=19;i>0;i--)
	{
		gray_status_backup[0][i]=gray_status_backup[0][i-1];
	}
	gray_status_backup[0][0]=gray_status[0];
    if(gray_state.state==0x0001||gray_state.state==0x0003) flag_turn=1;
    if(gray_state.state==0x0004) flag_end=1;
	switch(gray_state.state)
	{
		case 0x0001:gray_status[0]=4;	gray_status_worse/=2;break;									//00001b
		case 0x0003:gray_status[0]=3;	gray_status_worse/=2;break;									//00011b
	    case 0x0002:gray_status[0]=2;	gray_status_worse/=2;break;									//00010b
		case 0x0006:gray_status[0]=1;	gray_status_worse/=2;break;									//00110b
		case 0x0004:gray_status[0]=0;	  gray_status_worse/=2;break;							     //00100b
		case 0x000C:gray_status[0]=-1;	gray_status_worse/=2;break;									//01100b
		case 0x0008:gray_status[0]=-2;   gray_status_worse/=2;break;								    //01000b
		case 0x0018:gray_status[0]=-3;   gray_status_worse/=2;break;									//11000b
		case 0x0010:gray_status[0]=-4;   gray_status_worse/=2;break;									//10000b

		case 0x0000:gray_status[0]=gray_status_backup[0][0];gray_status_worse++;break; //0000000b
		default:
		{
             gray_status[0]=gray_status_backup[0][0];
			gray_status_worse++;
		}
	}
}




/***************************************************
函数名: void gray_turn_control_200hz(float *output)
说明:	灰度管寻迹时的转向控制
入口:	float *output-控制器输出
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void gray_turn_control_200hz(float *output)
{
		//数据异常处理
	if(gray_status_worse>=1000)//持续1S内检测不到正常黑线，可以认定为跑出赛道丢线处理
	{
		trackless_output.unlock_flag=LOCK;//上锁
	}	
	
	//保存上次控制器输出
	turn_output_last=turn_output;
	//转向PD控制输出，舵向控制实时性要求高，引入积分I会使舵向响应滞后
	seektrack_ctrl[0].expect=0;							//期望
	seektrack_ctrl[0].feedback=gray_status[0];	//反馈
	pid_control_run(&seektrack_ctrl[0]);		  //控制器运算
	turn_output=seektrack_ctrl[0].output;
	//叠加死区控制
	if(turn_output>0) turn_output+=steer_deadzone;
	if(turn_output<0) turn_output-=steer_deadzone;
	//输出限幅
	turn_output=constrain_float(turn_output,-500,500);//转向控制输出限幅
	
	*output=0.75f*turn_output+0.25f*turn_output_last;//输出为前后两次计算的均值
}

