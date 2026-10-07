#include "control.h"
#include "usart_lcd.h"
#include "openmv.h"
#include "oled.h"
#include "zhi.h"
int p=1;
u8 anny[2]={0,0};
int j = 1;
u8 zz=0;
int tt=0;
u8 task[1]={99};
int yaw1=0;
uint32_t TaskNum = 0;
int acr=0;
int yzh=0;
int aa;
int b;
//车子前进加减速设置
uint32_t set_speed  = 50;    // 最大速度设置 单位为0.1rad/sec  // 240
uint32_t step_accel = 11;     // 加速度 单位为0.1rad/sec^2      // 40
uint32_t step_decel = 11;     // 减速度 单位为0.1rad/sec^2      // 30
//车子横移加减速设置
uint32_t heny_speed = 50;    // 最大速度设置 单位为0.1rad/sec  // 240
uint32_t heny_accel = 11;     // 加速度 单位为0.1rad/sec^2      // 40
uint32_t heny_decel = 11;     // 减速度 单位为0.1rad/sec^2      // 30
//丝杆升降加减速设置
uint32_t sigan_speed = 240;   // 最大速度设置 单位为0.1rad/sec
uint32_t sigan_accel = 50;   // 加速度 单位为0.1rad/sec^2
uint32_t sigan_decel = 50;   // 减速度 单位为0.1rad/sec^2

/**
 * @brief 比赛逻辑控制函数
 * 
 * while(motor_sta!= STOP);等待中断标志位，
 * 是阻塞是等待，等待中断里面的加减速计算
 * 并完成动作再执行下一句，保证车子流畅丝滑
 * 我这里粗定位是写死大概的，到那个点了再开启摄像头微调，非常的准
 * 车子走的不是很直但是后面微调回来可以接受这个误差
 * 
 * @return null
 */
 
 
 /***
 //90度的步长相当于4170脉冲 4170/90=46.33 一度=46.33脉冲 
 //Target yaw = 46.33 x  ,
 //current yaw = 46.33*yaw ,
 //差值=Target yaw-46.33*yaw
 //带MCU转弯，没有闭环了，写的不是很好，参考就行
*/

void turn_left_90(uint16_t jd)
{
	
	
		OLED_ShowString(0,0,"angle",16);
		OLED_ShowNum(80,0,yaw,3,16);
		OLED_Refresh();

	
	yaw=(float)(hwt101[18]<<8|hwt101[17])/32768*180;
	yaw1=jd-yaw;
if(yaw1>0){
		if(yaw1>0&&yaw1<180){
	turn_left(46.33*yaw1,5,5,10);
	}
		else if(yaw1>180){
	turn_right(46.33*(360-yaw1),5,5,10);
	}
		}
else {
		if(yaw1<0&&yaw1>-180){
	turn_right(-46.33*yaw1,5,5,10);
	}
		else if(yaw1<-180){
	turn_left(46.33*(360+yaw1),5,5,10);
	}
		}
}
//一个坐标对应11.66脉冲 先调左右再调前后


void control(void)
{
			
	/**************************启动************************/
		OLED_ShowString(0,0,"angle",16);
		OLED_ShowNum(80,0,yaw,3,16);
		OLED_Refresh();
	V831_SendArray(hwt, 5);
		switch(TaskNum)
	{

		case 0:
			
			left(3000, heny_accel, heny_decel, heny_speed);//左移 11cm  1400/11 /脉冲 横向距离 4cm 590
			delay_ms(1200);
			go(6400*1.2, step_accel, step_decel, set_speed);//前进到二维码 //65/6400*1.3 纵向距离
			delay_ms(1800);
		   HMI_send();
		YunTai(OUT);
		delay_ms(800);
		ZhuaZi(OPEN);
		//ZhuanPan(LAN);
//		delay_ms(900);
//		ZhuanPan(HONG);
//		delay_ms(800);
//		ZhuaZi(GRAB );
		TaskNum=1;
		case 1:
		go(6400*1.77, step_accel, step_decel, set_speed); //前进到物料台
		delay_ms(2400);
		right(1350, heny_accel, heny_decel, heny_speed);
		delay_ms(1200);
		down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
		delay_ms(800);
		HMI_send();
		//jiaozhun1(131,109);
		TaskNum=2;
		case 2:
				/*******************第一个抓的物料*******************/
						if(Code_RxPacket[0]==0x31)
			{
				int k = 1;
				while(k)
				{
 					Openmv_SendByte(1);
					delay_ms(200);					
					if(Code_RxPacket[0]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;						
					}
					
				}
			}
			if(Code_RxPacket[0]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					
					if(Code_RxPacket[0]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;

					}
					
				}
			}
			if(Code_RxPacket[0]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);
					
					if(Code_RxPacket[0]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k=0;
					}
					
				}
			}
TaskNum=3;			
				/*******************第二个抓的物料*******************/
		case 3:
		down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
		delay_ms(800);			
if(Code_RxPacket[1]==0x31)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(1);
					delay_ms(200);
					
					if(Code_RxPacket[1]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[1]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					
					if(Code_RxPacket[1]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[1]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);
					
					if(Code_RxPacket[1]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			
TaskNum=4;			
				/*******************第三个抓的物料*******************/	
		case 4:		
		down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
		delay_ms(800);						
if(Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(1);
					delay_ms(200);
					
					if(Code_RxPacket[2]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[2]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					
					if(Code_RxPacket[2]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[2]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);
					
					if(Code_RxPacket[2]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
						task[0]=0;
						k--;
					}
					
				}
			}
		YunTai(IN);
		ZhuaZi(OPEN);
		ZhuanPan(40);
			delay_ms(300);
		//抓取完毕
		TaskNum=5;
		case 5:		
/*****************第一次离开转盘*******************/
		left(500, heny_accel, heny_decel, heny_speed);
		delay_ms(800);
		back(6400*0.8, step_accel, step_decel, set_speed);
		delay_ms(1700);
		turn_right(4170, heny_accel, heny_decel, heny_speed);
		delay_ms(1500);
    go(6400*3.5, 10, 10, 50);
		delay_ms(3500);
		turn_right(4170, heny_accel, heny_decel, heny_speed); //多转 比赛调试时可能需要改动的地方
		delay_ms(1500);
		right(1250, heny_accel, heny_decel, heny_speed);	
		delay_ms(1000);
		//到达物料区
		TaskNum=6;
/********************第一次放靶************************/
		case 6:
			
		ZhuaZi(ZKAI);
		YunTai(OUT);
		delay_ms(500);
		down(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
		delay_ms(500);
		Openmv_SendByte(5);//发送指令进行中间的定位
		delay_ms(300);
		//先定位中间的
		//放置物料
/********************第一个放靶************************/		
		if(Code_RxPacket[0]==0x33)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33)
					{
						
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[0]==0x32)
			{
				int k = 1;
				while(k)
				{
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32)
					{
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[0]==0x31)
			{
				int k = 1;
				while(k)
				{
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31)
					{
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x31);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
		delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	TaskNum=7;		
/********************第二个放靶************************/	
		case 7:			
	if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32)
					{
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33)
					{
						
						go(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(800);
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
		delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
			TaskNum=8;
/********************第三个放靶************************/		//123 132 213 231 312 321
case 8:
if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(800);
						fangzhi(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
					{
						
						go(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32)
					{
						
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						k--;
					}
					
				}
			}			
TaskNum=9;
/********************拿：抓放下去的物料************************/
case 9:
/********************6种情况************************/		//123 132 213 231 312 321
if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);	
							YunTai(OUT);
							delay_ms(1500);
							jiaqu2(0x31);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x31);
							go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);		
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
					{		
							ZhuaZi(ZKAI);
							delay_ms(400);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(1500);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x32);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
							go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							delay_ms(1500);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x32);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x33);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1500);
							jiaqu2(0x33);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
						k--;
					}
					
				}
			}			
TaskNum=12;
case 12:
	/********************前进到精加工区************************/	
	if(Code_RxPacket[2]==0x31)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*1.35, step_accel, step_decel, set_speed);//需要变动left(600,20,20,100);
		delay_ms(2200);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*1.7, step_accel, step_decel, set_speed);
		delay_ms(2300);
	}
	
	else if(Code_RxPacket[2]==0x32)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*1.65, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2400);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*1.7, step_accel, step_decel, set_speed);
		delay_ms(2300);
	}
	else if(Code_RxPacket[2]==0x33)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*1.95, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2800);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*1.7, step_accel, step_decel, set_speed);
		delay_ms(2300);

	}
	
	TaskNum=13;
	
case 13:
		/********************放置物料，和之前的流程一样************************/	
/********************第一个放靶************************/	
		//delay_ms(2000);
		right(1100, heny_accel, heny_decel, heny_speed);
		ZhuaZi(ZKAI);
		YunTai(OUT);
		delay_ms(1000);
		delay_ms(500);
		down(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
		delay_ms(1700);
		Openmv_SendByte(5);//发送指令进行中间的定位
		delay_ms(500);
		//先定位中间的
		//放置物料
/********************第一个放靶************************/		
		if(Code_RxPacket[0]==0x33)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33)
					{
						
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[0]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32)
					{
						
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[0]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31)
					{
						rise(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	TaskNum=14;		
/********************第二个放靶************************/	
		case 14:			
	if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32)
					{
						
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33)
					{
						
						go(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
						
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
			delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
			TaskNum=15;
/********************第三个放靶************************/		//123 132 213 231 312 321
case 15:
if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x31 && Code_RxPacket[1]==0x33  && Code_RxPacket[2]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(1300);
						fangzhi(0x32);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x33)
					{
						
						go(6400*0.62, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x33);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x32 && Code_RxPacket[1]==0x33 && Code_RxPacket[2]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x31 && Code_RxPacket[2]==0x32)
					{
						
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[0]==0x33 && Code_RxPacket[1]==0x32 && Code_RxPacket[2]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
							delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);	
						delay_ms(1000);
						k--;
					}
					
				}
			}	

TaskNum=19;
case 19:
	/**********************前进至物料区**********************/	
	if(Code_RxPacket[2]==0x31)
	{
		
		left(800,heny_accel, heny_decel, heny_speed);
		delay_ms(800);
	 	back(6400*1.4, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2200);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*0.85, step_accel, step_decel, set_speed);
		delay_ms(1600);
		right(1350, heny_accel, heny_decel, heny_speed);
		delay_ms(950);
	}
	
	else if(Code_RxPacket[2]==0x32)
	{
		left(800, heny_accel, heny_decel, heny_speed);
		delay_ms(800);
	 	back(6400*1.7, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2400);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*0.85, step_accel, step_decel, set_speed);
		delay_ms(1600);
		right(1350, heny_accel, heny_decel, heny_speed);
		delay_ms(950);
	}
	else if(Code_RxPacket[2]==0x33)
	{
		left(800, heny_accel, heny_decel, heny_speed);
		delay_ms(800);
	 	back(6400*2, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2800);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*0.85, step_accel, step_decel, set_speed);
		delay_ms(1600);
		right(1350, heny_accel, heny_decel, heny_speed);
		delay_ms(950);
	}
	TaskNum=20;
case 20:
		/**********************抓取第二轮物料**********************/		
		/*******************第一个抓的物料*******************/
		ZhuaZi(OPEN);
		YunTai(OUT);
		Openmv_SendByte(9);	
		while(j)
		{
			delay_ms(100);
			if(Openmv_Column_RxPacket[2]==9)
			{
			//Openmv_SendByte(tt);//发送指令进行中间的定位
			//delay_ms(200);
			anny[0]=0x04;
			anny[1]=Openmv_Column_RxPacket[3];
			Openmv_SendArray(anny,2);
		while(p)	
		{
			if(Openmv_Column_RxPacket[2]==4)
			{
			jiaozhun5(113,105);//先定位物料
			delay_ms(200);
			down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
			delay_ms(800);
			TaskNum=21;		
				j--;
			p--;
			}
		}
			}
		
		}
case 21:
				/*******************第一个抓的物料*******************/
						if(Code_RxPacket[4]==0x31)
			{
				int k = 1;
				while(k)
				{
 					Openmv_SendByte(1);
					delay_ms(200);					
					if(Code_RxPacket[4]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;						
					}
					
				}
			}
			if(Code_RxPacket[4]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					if(Code_RxPacket[4]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;

					}
					
				}
			}
			if(Code_RxPacket[4]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);			
					if(Code_RxPacket[4]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
						ZhuaZi(OPEN);
						YunTai(OUT);
						delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
TaskNum=22;			
				/*******************第二个抓的物料*******************/
		case 22:		
down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
		delay_ms(800);				
if(Code_RxPacket[5]==0x31)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(1);
					delay_ms(200);
					
					if(Code_RxPacket[5]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[5]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					
					if(Code_RxPacket[5]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[5]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);
					
					if(Code_RxPacket[5]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
								ZhuaZi(OPEN);
		YunTai(OUT);
		delay_ms(800);
						task[0]=0;
						k--;
					}
					
				}
			}
			
TaskNum=23;			
				/*******************第三个抓的物料*******************/	
		case 23:			
down(6400*0.73, sigan_speed, sigan_accel, sigan_decel);
		delay_ms(800);				
if(Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(1);
					delay_ms(200);
					
					if(Code_RxPacket[6]==0x31 && task[0]==1)
					{
						PanDuan(0x31);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[6]==0x32)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(2);
					delay_ms(200);
					
					if(Code_RxPacket[6]==0x32 && task[0]==2)
					{
						PanDuan(0x32);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[6]==0x33)
			{
				int k = 1;
				while(k)
				{
					Openmv_SendByte(3);
					delay_ms(200);
					
					if(Code_RxPacket[6]==0x33 && task[0]==3)
					{
						PanDuan(0x33);
						task[0]=0;
						k--;
					}
					
				}
			}
		YunTai(IN);
		ZhuaZi(OPEN);
		ZhuanPan(40);
			delay_ms(300);
		//抓取完毕
		TaskNum=24;
		case 24:		
/*****************第二次离开转盘*******************/
		left(500, heny_accel, heny_decel, heny_speed);
		delay_ms(800);
		back(6400*0.9, step_accel, step_decel, set_speed);
		delay_ms(2000);
		turn_right(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1500);
    go(6400*3.6, 10, 10, 50);
		delay_ms(3500);
		
		delay_ms(1500);
		right(600, heny_accel, heny_decel, heny_speed);	
		delay_ms(800);
		//到达物料区
		TaskNum=25;
/********************第一次放靶************************/
		case 25:
			
		ZhuaZi(ZKAI);
		YunTai(OUT);
		delay_ms(500);
		down(6400*1.35, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
		delay_ms(2000);
		Openmv_SendByte(5);//发送指令进行中间的定位
		delay_ms(400);
		//先定位中间的
		//放置物料
/********************第一个放靶************************/		
		if(Code_RxPacket[4]==0x33)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33)
					{
						
						rise(6400*1.36, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[4]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32)
					{
						
						rise(6400*1.36, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[4]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31)
					{
						rise(6400*1.36, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
			delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	TaskNum=26;		
/********************第二个放靶************************/	
		case 26:			
	if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32)
					{
						
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x32);
						ZhuaZi(DROP);
						task[0]=0;
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33)
					{
						
						go(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x33);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x31);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						ZhuaZi(DROP);
						k--;
					}
					
				}
			}
			delay_ms(100);
		rise(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
			TaskNum=27;
/********************第三个放靶************************/		//123 132 213 231 312 321
case 27:
if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(1300);
						fangzhi(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
					{
						
						go(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
					{
						
						back(6400*0.61, step_accel, step_decel, set_speed);
						delay_ms(1300);
						
						fangzhi(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32)
					{
						
						go(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
					{
						
						back(6400*0.31, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi(0x31);
						k--;
					}
					
				}
			}			
TaskNum=28;
/********************拿：抓放下去的物料************************/
case 28:
/********************6种情况************************/		//123 132 213 231 312 321
if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);	
							YunTai(OUT);
							delay_ms(1500);
							jiaqu2(0x31);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x31);
							go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);		
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
					{		
							ZhuaZi(ZKAI);
							delay_ms(400);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(1500);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x32);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
							go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							delay_ms(1500);
							YunTai(OUT);
							ZhuaZi(ZKAI);
						delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x32);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x33);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1000);
							jiaqu2(0x33);
							back(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1500);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
							go(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							//delay_ms(2000);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					//delay_ms(100);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
					{
							ZhuaZi(ZKAI);
							delay_ms(400);
						  go(6400*0.6, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							delay_ms(1500);
							jiaqu2(0x33);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x32);
							back(6400*0.3, step_accel, step_decel, set_speed);while(motor_sta== STOP);
							YunTai(OUT);
							ZhuaZi(ZKAI);
							delay_ms(1000);
							down(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
							delay_ms(800);
							jiaqu2(0x31);
						k--;
					}
					
				}
			}			
TaskNum=29;
case 29:
	/********************前进到精加工区************************/	
	if(Code_RxPacket[6]==0x31)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*1.38, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2200);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*1.65, step_accel, step_decel, set_speed);
		delay_ms(2200);
		delay_ms(200);
				right(1150, heny_accel, heny_decel, heny_speed);
		delay_ms(1200);
		
	}
	
	else if(Code_RxPacket[6]==0x32)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*1.7, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2400);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*1.65, step_accel, step_decel, set_speed);
		delay_ms(2200);
		delay_ms(200);
				right(1150, heny_accel, heny_decel, heny_speed);
		delay_ms(1200);
		
	}
	else if(Code_RxPacket[6]==0x33)
	{
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(750);
	 	back(6400*2, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2800);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);;
		back(6400*1.65, step_accel, step_decel, set_speed);
		delay_ms(2200);
		delay_ms(200);
		right(1150,heny_accel, heny_decel, heny_speed);
		delay_ms(1200);

	}
	
	TaskNum=30;
	
case 30:
		/********************放置物料，和之前的流程一样************************/	
/********************第一个放靶************************/	
		
		//delay_ms(2000);
		ZhuaZi(ZKAI);
		YunTai(OUT);
		delay_ms(700);
//		right(1000, heny_accel, heny_decel, heny_speed);
//		delay_ms(1500);
		down(6400*0.5, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
		delay_ms(1000);
		Openmv_SendByte(7);//发送指令进行中间的定位
		delay_ms(300);
		//先定位中间的
		//放置物料
/********************第一个放靶************************/		
		if(Code_RxPacket[4]==0x33)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33)
					{
						
						rise(6400*0.5, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi7(0x33);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[4]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32)
					{
						
						rise(6400*0.5, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						fangzhi7(0x32);
						task[0]=0;
						k--;
					}
					
				}
			}
			if(Code_RxPacket[4]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31)
					{
						rise(6400*0.5, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta== STOP);
						delay_ms(1200);
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x31);
						task[0]=0;
						k--;
					}
					
				}
			}
	TaskNum=31;		
/********************第二个放靶************************/	
		case 31:			
	if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32)
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi7(0x32);
						task[0]=0;
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33)
					{
						
						go(6400*0.6, step_accel, step_decel, set_speed);
						delay_ms(800);
						fangzhi7(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x33);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31)
					{
						
						back(6400*0.6, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi7(0x31);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x32);
						k--;
					}
					
				}
			}
			TaskNum=32;
/********************第三个放靶************************/		//123 132 213 231 312 321
case 32:
if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33) 
			{
				
				int k = 1;
				while(k)
				{
					

					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x33)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi7(0x33);
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x31 && Code_RxPacket[5]==0x33  && Code_RxPacket[6]==0x32)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						fangzhi7(0x32);
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x33)
					{
						
						go(6400*0.6, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi7(0x33);
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x32 && Code_RxPacket[5]==0x33 && Code_RxPacket[6]==0x31)
					{
						
						back(6400*0.6, step_accel, step_decel, set_speed);
						delay_ms(800);
						
						fangzhi7(0x31);
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32 )
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x31 && Code_RxPacket[6]==0x32)
					{
						
						go(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x32);
						delay_ms(1000);
						k--;
					}
					
				}
			}
/********************************************/				
			if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
			{
				int k = 1;
				while(k)
				{
					
					delay_ms(800);
					
					if(Code_RxPacket[4]==0x33 && Code_RxPacket[5]==0x32 && Code_RxPacket[6]==0x31)
					{
						
						back(6400*0.3, step_accel, step_decel, set_speed);
						delay_ms(400);
						
						fangzhi7(0x31);
						delay_ms(1000);
						k--;
					}
					
				}
			}			
TaskNum=33;
case 33:
	/**********************回到起点**********************/	
	if(Code_RxPacket[6]==0x31)
	{
		YunTai(IN);
		ZhuanPan(40);
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(700);
	 	back(6400*1.4, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2200);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*3.8, 10, 10, 50);//需要变动
		delay_ms(3600);
		right(3400, heny_accel, heny_decel, heny_speed);
	}
	
	else if(Code_RxPacket[6]==0x32)
	{
		YunTai(IN);
		ZhuanPan(40);
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(700);
	 	back(6400*1.7, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2400);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*3.8, 10, 10, 50);//需要变动
		delay_ms(3600);
		right(3400, heny_accel, heny_decel, heny_speed);
	}
	else if(Code_RxPacket[6]==0x33)
	{
		YunTai(IN);
		ZhuanPan(40);
		left(600, heny_accel, heny_decel, heny_speed);
		delay_ms(700);
	 	back(6400*2, step_accel, step_decel, set_speed);//需要变动
		delay_ms(2800);
		turn_left(4170, heny_accel, heny_decel, heny_speed);
		
		delay_ms(1400);
		back(6400*3.8, 10, 10, 50);//需要变动
		delay_ms(3600);
		right(3400, heny_accel, heny_decel, heny_speed);
	}
		  break;
	}
}


