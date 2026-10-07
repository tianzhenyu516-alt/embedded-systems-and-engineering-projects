#ifndef __ZHI_H__
#define __ZHI_H__
#include "stm32f4xx.h"           // Device header
#include "key.h"
#include "lcd.h"
#include "code.h"
#include "ziku.h"
#include "text.h"
#include "jy62.h"
#include "duoji.h"
#include "openmv.h"
#include "delay.h"
#include "motor.h"
#include "motor_init.h"

/*//云台  外面  里面
增大偏向外面
减小偏向转盘
*/
#define  OUT    775
#define  IN    1990
/*//转盘  蓝 红 绿  
增大逆时针  减小顺时针
*/
#define  LV     2170//0//259
#define  HONG    1500//90//141
#define  LAN     830//22
/*//爪子  开 放 抓   
增大 收紧
减小 松开
*/
#define  ZKAI      10//靶子阴影
#define  OPEN      796//70
#define  DROP      796
#define  GRAB      1574


/*
//DXIAN为平行的左转右转
//JULI为横向距离
*/
#define  DXIAN      -1
#define  JULI       88
/*平行的左转右转*/
#define  PXING      -1
/*
左 增大
右 减小
上 增大
下 减小
*/
//判断2 纯放靶子的  目标值
#define  CX2      63//60
#define  CY2      72//74
//判断3 即放码垛的  目标值
#define  CX3      63//65
#define  CY3      71//69

void duixian(void);
void control(void);
void jiaqu(int i);
void jiaqu2(int i);
void jiaqu4(int i);
void fangzhi(int i);
void fangzhi2(int i);
void fangzhi7(int i);
void PanDuan2(u8 i);
void PanDuan(u8 i);
void PanDuan3(u8 i);
void jiaozhun2(uint16_t Targetx2,uint16_t Targety2); //圆环矫正 建议 x=124 y=137
void jiaozhun1(uint16_t Targetx1,uint16_t Targety1); //物块矫正 建议 x=156 y=86	
void jiaozhun3(uint16_t Targetx1,uint16_t Targety1); 
void jiaozhun5(uint16_t Targetx1,uint16_t Targety1);
void bazi1(u8 index,u8 i);
void bazi2(u8 index,u8 i);

void move(int mubiao,int xianzai);
void pingxing(void);

void code_again(void);
extern uint16_t yaw;
extern uint32_t set_speed;          // 最大速度设置 单位为0.1rad/sec
extern uint32_t step_accel;         // 加速度 单位为0.1rad/sec^2
extern uint32_t step_decel;         // 减速度 单位为0.1rad/sec^2
extern int acr;

extern uint32_t sigan_speed;         // 最大速度设置 单位为0.1rad/sec
extern uint32_t sigan_accel;         // 加速度 单位为0.1rad/sec^2
extern uint32_t sigan_decel;         // 减速度 单位为0.1rad/sec^2

/**********************************返程****************************************************/

void code_again_back(void);
void PanDuan2_fancheng(u8 i);
void jiaqu_maduo(int i);
void PanDuan2_dcwl(u8 i);
#endif





