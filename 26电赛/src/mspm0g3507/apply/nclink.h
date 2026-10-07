#ifndef __NCLINK_H__
#define __NCLINK_H__

#define RESERVED_PARAM_NUM 20
extern float param_value[RESERVED_PARAM_NUM];


#define BYTE0(dwTemp)  (*((char *)(&dwTemp)))
#define BYTE1(dwTemp)  (*((char *)(&dwTemp)+1))
#define BYTE2(dwTemp)  (*((char *)(&dwTemp)+2))
#define BYTE3(dwTemp)  (*((char *)(&dwTemp)+3))
	
#define NCLINK_STATUS         0x01//发送飞控状态数据，功能字节
#define NCLINK_SENSOR         0x02//发送传感器原始数据，功能字节
#define NCLINK_RCDATA         0x03//发送遥控器解析数据，功能字节
#define NCLINK_GPS 		        0x04//发送GPS经纬度、海拔数据，功能字节
#define NCLINK_OBS_NE         0x05//发送NE方向观测数据，功能字节
#define NCLINK_OBS_UOP        0x06//发送U方向观测数据，功能字节
#define NCLINK_FUS_U          0x07//发送U方向融合数据，功能字节
#define NCLINK_FUS_NE         0x08//发送NE方向融合数据，功能字节
#define NCLINK_USER           0x09//发送用户数据，功能字节

#define NCLINK_SEND_PID1_3    0x0A//PID01-03数据，功能字节+应答字节
#define NCLINK_SEND_PID4_6    0x0B//PID04-06数据，功能字节+应答字节
#define NCLINK_SEND_PID7_9    0x0C//PID07-09数据，功能字节+应答字节
#define NCLINK_SEND_PID10_12  0x0D//PID10-12数据，功能字节+应答字节
#define NCLINK_SEND_PID13_15  0x0E//PID13-15数据，功能字节+应答字节
#define NCLINK_SEND_PID16_18  0x0F//PID16-18数据，功能字节+应答字节

#define NCLINK_SEND_PARA      0x10//飞控发送其它参数，功能字节+应答字节
#define NCLINK_SEND_CAL_RAW1  0x11//发送校准原始数据1，功能字节
#define NCLINK_SEND_CAL_RAW2  0x12//发送校准原始数据2，功能字节
#define NCLINK_SEND_CAL_PARA1 0x13//发送校准结果数据1，功能字节
#define NCLINK_SEND_CAL_PARA2 0x14//发送校准结果数据2，功能字节
#define NCLINK_SEND_CAL_PARA3 0x15//发送校准结果数据3，功能字节

#define NCLINK_SEND_PARA_RESERVED		0x16//飞控发送预留参数，功能字节+应答字节
#define NCLINK_SEND_3D_TRACK				0x17//飞控3D位姿数据发送参数



#define NCLINK_SEND_CHECK     					0xF0//发送应答数据，功能字节
//应答数据
#define NCLINK_SEND_RC        					0xF1//飞控解析遥控器控制指令，应答字节
#define NCLINK_SEND_DIS       					0xF2//飞控解析位移控制指令，应答字节
#define NCLINK_SEND_CAL       					0xF3//飞控传感器校准完毕，应答字节
#define NCLINK_SEND_CAL_READ  					0xF4//读取校准参数成功，应答字节
#define NCLINK_SEND_FACTORY   					0xF5//恢复出厂设置成功，应答字节
#define NCLINK_SEND_NAV_CTRL  					0xF6//飞控解析导航控制指令，应答字节
#define NCLINK_SEND_NAV_CTRL_FINISH     0xF7//飞控导航控制完毕，应答字节
#define NCLINK_SEND_SLAM_SYSTEM_RESET   0xF8//SLAM导航复位完毕，控制字节
#define NCLINK_SEND_SLAM_STOP_MOTOR     0xF9//SLAM控制电机停止，控制字节
#define NCLINK_SEND_SLAM_START_MOTOR    0xFA//SLAM控制电机开始，控制字节
//数据结构声明
typedef enum
{
	SDK_FRONT = 0x00,
	SDK_BEHIND,
	SDK_LEFT,
	SDK_RIGHT,
	SDK_UP,
	SDK_DOWN
}SDK_MODE;

typedef struct
{
  bool sdk_front_flag;
	bool sdk_behind_flag;
	bool sdk_left_flag;
	bool sdk_right_flag;
	bool sdk_up_flag;
	bool sdk_down_flag;
}sdk_mode_flag;


typedef struct
{
  uint8_t move_mode;//SDK移动标志位
  uint8_t mode_order;//SDK移动顺序
  uint16_t move_distance;//SDK移动距离
	bool update_flag;
	sdk_mode_flag move_flag;
	float f_distance;
}ngs_sdk_control;




void NCLink_SEND_StateMachine(void);
void NCLink_Data_Prase_Prepare_Lite(uint8_t data);


void bluetooth_app_send(float user1,float user2,float user3,float user4,
												float user5,float user6,float user7,float user8);
void bluetooth_app_prase(uint8_t byte);

extern nav_ctrl ngs_nav_ctrl;
extern uint16_t NCLINK_PPM_Databuf[10];
extern uint8_t rc_update_flag;
extern uint8_t unlock_flag,takeoff_flag;
extern uint16_t bluetooth_ppm[8];
extern uint8_t bt_update_flag;

#endif

