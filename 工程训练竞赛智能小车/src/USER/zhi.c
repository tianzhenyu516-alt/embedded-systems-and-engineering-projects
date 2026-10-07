#include "zhi.h"
#include "oled.h"
#include "openmv.h"
#include "control.h"

uint16_t yaw = 0;


int act[10];//移动步数数组

//第一轮靶子颜色位置 从右往左
int R1 = 1;
int G1 = 2;
int B1 = 3;

/**
* @brief 第一轮靶子顺序
 * 
 * 该函数用于记录第一轮放置靶子的颜色顺序。
 * 
 * @param index 二维码扫到的值
 * @param index 顺序，从右往左
 * @return null
 */
void bazi1(u8 index,u8 i)
{
	if(index == 0x31) act[i] = R1;
	if(index == 0x32) act[i] = G1;
	if(index == 0x33) act[i] = B1;
}

//第二轮靶子颜色位置 从右往左
int R2 = 1;
int G2 = 2;
int B2 = 3;

/**
* @brief 第二轮靶子顺序
 * 
 * 该函数用于记录第二轮放置靶子的颜色顺序。
 * 
 * @param index 二维码扫到的值
 * @param index 顺序，从右往左
 * 
 */
void bazi2(u8 index,u8 i)
{
	if(index == 0x31) act[i] = R2;
	if(index == 0x32) act[i] = G2;
	if(index == 0x33) act[i] = B2;
}

/**
* @brief 车子平行校正
 * 
 * 该函数用于执行平行校正，确保车子走歪了仍然与赛道保持平行
 * 
 */
void pingxing(void)
{
  int m = 1;
  while(m)
	{
		int ck=PXING,ek=0;
		
		//计算误差
		ek=ck - (v831_y[1] - v831_y[0]);
		
		
		//LCD_ShowNumber(280, 5, v831_y[0], 24, MAGENTA);
    //LCD_ShowNumber(280, 25, v831_y[1], 24, MAGENTA);
    //LCD_ShowNumber(280, 45, ek, 24, MAGENTA);
		
		//限幅
		if(ek>5)	{ek=5;}
    if(ek<-5)	{ek=-5;}
		if(ek<0)
		{
			ek=-ek;
			turn_left(6400*ek*0.0001,2000*ek,1,8000*ek);while(motor_sta!= STOP);
		}
		else if(ek>0)
		{
			turn_right(6400*ek*0.0001,2000*ek,1,8000*ek);while(motor_sta!= STOP);
		}
		if(ek==0)
			m=0;
	}
}


/**
 * @brief 车子平行前后校正
 * 
 * 该函数用于执行平行校正，确保车子走歪了仍然与赛道保持平行
 * 此外，矫正车子侧边的前后位置，保证车子在赛道中间
 * （内部注释同上函数）
 */
void duixian(void)
{
	int m = 1;int n = 1;
	
	//平行校正
	while(m)
	{		
		int ck=DXIAN,ek=0;
		
		ek=ck - (v831_y[1] - v831_y[0]);
		
		//LCD_ShowNumber(280, 5, v831_y[0], 24, MAGENTA);
		//LCD_ShowNumber(280, 25, v831_y[1], 24, MAGENTA);
		//LCD_ShowNumber(280, 45, ek, 24, MAGENTA);
		
		if(ek>5)	{ek=5;}
    if(ek<-5)	{ek=-5;}
		
		if(ek<0)
		{
			ek=-ek;
			turn_left(6400*ek*0.001,4000*ek,1,10000*ek);while(motor_sta!= STOP);
		}
		else if(ek>0)
		{
			turn_right(6400*ek*0.001,4000*ek,1,10000*ek);while(motor_sta!= STOP);
		}
		if(ek==0)
			m=0;
			
	}
	
  delay_ms(200);
	
	//前后校正
	while(n)
	{
		int cy=JULI,ey=0;
		
		ey=cy - ((v831_y[1] + v831_y[0])/2);
		
		//LCD_ShowNumber(280, 5, v831_y[0], 24, MAGENTA);
		//LCD_ShowNumber(280, 25, v831_y[1], 24, MAGENTA);
		//LCD_ShowNumber(280, 65, ey, 24, MAGENTA);
		
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(6400*ey*0.001,4000*ey,1,10000*ey);while(motor_sta!= STOP);
			
		}
		else if(ey<0)
		{
			ey=-ey;
			left(6400*ey*0.001,4000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		if(ey==0)
			n=0;
		
	}
}


/**
 * @brief 夹地板的物块
 * 
 * 夹地板的物块，放到对应物料盘位置
 * 
 * @param i 物块的颜色
 *
 */
int y=1;  
void jiaqu2(int i)
{
	//红色
	if(i==0x31)
	{
		ZhuanPan(HONG);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(1500);
		YunTai(IN);
		delay_ms(1000);
		down(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);  
		delay_ms(600);
	}			

	//绿色
	if(i==0x32)
	{
		ZhuanPan(LV);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta == STOP);
		YunTai(IN);
		delay_ms(1000);
		down(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(600);
	}
	
	//蓝色
	if(i==0x33)
	{
		ZhuanPan(LAN);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*1.35, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		YunTai(IN);
		delay_ms(1000);
		down(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.5, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(600);
	}
		
	//前两次，回正靶子识别状态
//	if(y<3)
//	{
//		YunTai(OUT);
//		ZhuaZi(OPEN);
//		delay_ms(2000);
//		down(6400*1.1, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
//					
//	}
//	else//结束
//	{
//		y=0;
//		ZhuaZi(OPEN);
//	}
//	y++;
}
void jiaqu4(int i)
{

	//红色
	if(i==0x31)
	{
		YunTai(OUT);
		ZhuaZi(OPEN);
		ZhuanPan(HONG);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*0.73, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		YunTai(IN);
		delay_ms(800);
		down(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);  
		delay_ms(500);

	}			

	//绿色
	if(i==0x32)
	{
		YunTai(OUT);
		ZhuaZi(OPEN);
		ZhuanPan(LV);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*0.73, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta == STOP);
		YunTai(IN);
		delay_ms(800);
		down(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
	}
	
	//蓝色
	if(i==0x33)
	{
		YunTai(OUT);
		ZhuaZi(OPEN);
		//delay_ms(800);
		ZhuanPan(LAN);
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(800);
		rise(6400*0.73, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		YunTai(IN);
		delay_ms(800);
		down(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(700);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(100);
		rise(6400*0.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
	}
	
}
/**
 * @brief 夹转盘上的物块
 * 
 * 夹转盘上对应颜色的物块，放到对应物料盘
 * 
 * @param i 物块的颜色
 *
 */
int C=1;
void jiaqu(int i)
{
//	LCD_ShowNumber(230, 110, C, 24, BLUE);
	if(i==0x31)
	{
		ZhuanPan(HONG+7);//红色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN-2);
		delay_ms(500);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(200);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		delay_ms(100);
	}			
	
	if(i==0x32)
	{
		ZhuanPan(LV+5);//绿色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN-2);
		delay_ms(500);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(200);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		delay_ms(100);
	}

	if(i==0x33)
	{
		ZhuanPan(LAN+7);//蓝色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN-2);
		delay_ms(500);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(200);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		delay_ms(100);
		
	}
	
	if(C<3)
	{
		YunTai(OUT);
		ZhuaZi(OPEN);
		delay_ms(500);
		down(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	}
	else
	{
		C=0;
		ZhuaZi(OPEN);
	}
	C++;
}

/**
 * @brief 把物料放到地面上
 * 
 * 
 * 
 * @param i 对应颜色的物料
 * 
 */
void fangzhi(int i)
{
	//int y=1;
	
	//rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	
	if(i==0x31)
	{		
		ZhuanPan(HONG);
		ZhuaZi(DROP);
	
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
		

	}
	
	if(i==0x32)
	{
		ZhuanPan(LV);
		ZhuaZi(DROP);
	
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
	
	
	}
	
	if(i==0x33)
	{   
		ZhuanPan(LAN);
		ZhuaZi(DROP);
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*1.36, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
	

	}
}
void fangzhi7(int i)
{
	//int y=1;
	
	//rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	
	if(i==0x31)
	{		
		ZhuanPan(HONG);
		ZhuaZi(DROP);
	
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
		ZhuaZi(DROP);
		delay_ms(100);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	}
	
	if(i==0x32)
	{
		ZhuanPan(LV);
		ZhuaZi(DROP);
	
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
	ZhuaZi(DROP);
		delay_ms(100);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	}
	
	if(i==0x33)
	{   
		ZhuanPan(LAN);
		ZhuaZi(DROP);
		YunTai(IN);
		delay_ms(1100);
		down(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(500);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		delay_ms(200);
		rise(3400, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		//delay_ms(300);
		YunTai(OUT);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
		delay_ms(1000);
		//ZhuaZi(OPEN);
	ZhuaZi(DROP);
		delay_ms(100);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta== STOP);
	}
}
/**
 * @brief 将物料码垛放置
 * 
 * @param i 对应颜色物料
 *
 */
void fangzhi2(int i)
{
	//int y=1;
	rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	if(i==0x31)
	{		
		ZhuanPan(HONG);
		ZhuaZi(DROP);
		delay_ms(400);
		YunTai(IN+2);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(OUT);
		delay_ms(400);
		down(6400*2, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		//ZhuaZi(OPEN);
		zhuazi(GRAB,OPEN);
		delay_ms(200);
		rise(6400*0.3, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	}
	if(i==0x32)
	{		
		ZhuanPan(LV);
		ZhuaZi(DROP);
		delay_ms(400);
		YunTai(IN+2);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(OUT);
		delay_ms(400);
		down(6400*2, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		//ZhuaZi(OPEN);
		zhuazi(GRAB,OPEN);
		delay_ms(200);
		rise(6400*0.3, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	}
	if(i==0x33)
	{		
		ZhuanPan(LAN);
		ZhuaZi(DROP);
		delay_ms(600);
		YunTai(IN+2);
		delay_ms(1000);
		down(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(GRAB);
		//zhuazi(DROP,GRAB);
		rise(6400*0.8, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(OUT);
		delay_ms(400);
		down(6400*2, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		//ZhuaZi(OPEN);
		zhuazi(GRAB,OPEN);
		delay_ms(200);
		rise(6400*0.3, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
	}
}



/**
 * @brief 判断夹取物料
 * 
 * 判断转盘上面的物料颜色是否是我们需要的物料
 * 根据OPENMV的传回来的物料数值，判断是否是我们需要的颜色的物料
 * 
 * @param i 需要的物料的颜色
 * 
 */
void PanDuan(u8 i)
{
	int j=1;
	if(i==0x31)
	{
		Code_SendByte(0x01);Code_SendByte(0x01);Code_SendByte(0x01);
	}
	if(i==0x32)
	{
		Code_SendByte(0x02);Code_SendByte(0x02);Code_SendByte(0x02);
	}
	
	if(i==0x33)
	{
		Code_SendByte(0x03);Code_SendByte(0x03);Code_SendByte(0x03);
	}
	while(j)
	{

			jiaqu4(i);
			j=0;
	}
}


/**
 * @brief 判断靶子的
 * 
 * 判断靶子中心，让车子对正中心
 * 根据OPENMV的传回来的靶心数值，调整车子的位置，让车子对中靶心
 * 
 * @param i 对应靶子颜色
 * 
 */
void PanDuan2(u8 i)
{
  int m=1,n=1;
	if(i==0x31)
	{
		Code_SendByte(0x04);Code_SendByte(0x04);Code_SendByte(0x04);
	}
	if(i==0x32)
	{
		Code_SendByte(0x05);Code_SendByte(0x05);Code_SendByte(0x05);
	}
	if(i==0x33)
	{
		Code_SendByte(0x06);Code_SendByte(0x06);Code_SendByte(0x06);
	}

	delay_ms(200);
	//调整前后（车子的前后）
	while(m)
	{
		int cx=CX2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 45, ex, 24, RED);
		
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	
	//调整左右（横移）
	while(n)
	{
		int cy=CY2,ey=0;
		
		ey=cy-(Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3]);
		
    //LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 65, ey, 24, RED);
		
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
  //再调整左右横移
	while(m)
	{
		int cx=CX2,ex=0;
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 45, ex, 24, RED);
		
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
    {
      Code_SendByte(0x09);Code_SendByte(0x09);
			fangzhi(i);
      m=0;
    } 
	}
}//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
//嘿嘿你肯定发现了，我调整了前后，然后继续调整左右，又继续调整了一次前后
//为什么后面要再调整一次前后呢，因为我用的是麦轮，我发现他横移了之后
//前后的位置会变动一点点，所以我就再调整了一下前后，大家可以看看我的视频
//前后调节两次，横移会歪，就调节一次，这样稳一点嘿嘿，可能是我的麦轮不行
//其实仿用了一下pid的比例P，这里必须加上while(motor_sta!= STOP);
//不然加减速的计算没有那么快，会跟不上这个，所以得等等加减速计算完
//只要视觉那边的中心点坐标准，这边放的也很准哦，细微误差可以接受啦
//下面也一样的原理，不多说啦

/**
 * @brief 判断靶子+第一层物块的中心
 * 
 * 需要码垛，判断靶子+第一次物料中心，让车子对正中心
 * 根据OPENMV的传回来的靶心数值，调整车子的位置，让车子对中靶心
 * 
 * @param i 对应靶子颜色
 * 
 */
void PanDuan3(u8 i)
{
  int m=1,n=1;
	
	if(i==0x31)
	{
		Code_SendByte(0x04);Code_SendByte(0x04);Code_SendByte(0x04);

	}
	if(i==0x32)
	{
		Code_SendByte(0x05);Code_SendByte(0x05);Code_SendByte(0x05);
	}

	if(i==0x33)
	{
		Code_SendByte(0x06);Code_SendByte(0x06);Code_SendByte(0x06);
	}

	delay_ms(200);

	while(m)
	{
		int cx=CX3,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
	  //LCD_ShowNumber(230, 45, ex, 24, RED);
		
		if(ex>5)	{ex=5;}
		if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
    
	while(n)
	{
		int cy=CY3,ey=0;
		
		ey=cy-(Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3]);
		
    //LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 65, ey, 24, RED);
		
    if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
		if(ey>0)
		{
			right(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
    
	while(m)
	{
		int cx=CX3,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
   // LCD_ShowNumber(230, 45, ex, 24, RED);
		
		if(ex>5)	{ex=5;}
		if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
			
		}
		else if(ex>0)
		{
			
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
			
		}
		if(ex==0)
		{
			Code_SendByte(0x09);Code_SendByte(0x09);
			fangzhi2(i);
			m=0;
		}
            
	}
	
}

/**
 * @brief 车子移动
 * 
 * 车子从当前位置移动到目标位置
 * 
 * @param mubiao  目标位置
 * @param xianzai 当前位置
 * @return null
 */
void move(int mubiao,int xianzai)
{
	acr=mubiao-xianzai;
	if(acr>=0)
	{
		go(6400*acr*0.6,step_accel,step_decel,set_speed);while(motor_sta!= STOP);
	}
	if(acr<0)
	{
		acr=-acr;
		back(6400*acr*0.6,step_accel,step_decel,set_speed);while(motor_sta!= STOP);
	}

}



/**
 * @brief 二维码找不到再次识别
 * 
 * 第一次到那个二维码那里偶尔会因为定位误差
 * 导致扫不到二维码，这个函数扫不到二维码的
* 话，会前后轻轻移动，直到扫到二维码为止。
 * 
 * @return null
 */
void code_again(void)
{
	int u = 1;float t = 0.1;
	while(u)
	{
		if(Code_RxFlag==1)
		{
			//LCD_ShowTitle(1,38,64,Code_RxPacket[0],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,38,64,Code_RxPacket[1],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(127,38,64,Code_RxPacket[2],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,106,64,Code_RxPacket[3],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(1,175,64,Code_RxPacket[4],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,175,64,Code_RxPacket[5],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(127,175,64,Code_RxPacket[6],POINT_COLOR,BACK_COLOR);
			u = 0;t=0;
		}
		else
		{
			go(6400*t,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			back(6400*t*2,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			go(6400*t,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			t=t+0.1f;
		}
	}
}


/*************************************************返程***************************************************************/
/**
 * 这下面是提前预判决赛写的，我估计他会跟去年一样，考逆向运行，故把返程的动作写好，
 * 其实他们很多跟上面顺着运行相识的，可以写在一起，但是怕决赛紧张搞混代码，所以单
 * 单独写返程的，防止出错！
 * 
 * 真的是逆向运行！！！猜题真的很重要，为决赛节省了很多时间！
 ***/

/**
 * @brief 反向运行的二维码找不到再次识别
 * 
 * 第一次到那个二维码那里偶尔会因为定位误差
 * 导致扫不到二维码，这个函数扫不到二维码的
* 话，会前后轻轻移动，直到扫到二维码为止。
 * 
 * @return null
 */
void code_again_back(void)
{
	int u = 1;float t = 0.1;
	while(u)
	{
		if(Code_RxFlag==1)
		{
			//LCD_ShowTitle(1,38,64,Code_RxPacket[0],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,38,64,Code_RxPacket[1],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(127,38,64,Code_RxPacket[2],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,106,64,Code_RxPacket[3],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(1,175,64,Code_RxPacket[4],POINT_COLOR,BACK_COLOR);
			//LCD_ShowTitle(64,175,64,Code_RxPacket[5],POINT_COLOR,BACK_COLOR);
		//LCD_ShowTitle(127,175,64,Code_RxPacket[6],POINT_COLOR,BACK_COLOR);
			u = 0;t=0;
		}
		else
		{
			back(6400*t,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			go(6400*t*2,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			back(6400*t,step_accel,step_decel,set_speed);
			while(motor_sta!= STOP);
			t=t+0.1f;
		}
	}
}

/**
 * @brief 从码垛上面夹取物料
 * 
 * 夹取码垛上第二层的物料，放到对应的转盘。
 * 
 * @param i 对应物料的颜色
 * @return null
 */
void jiaqu_maduo(int i)
{
	if(i==0x31)
	{
		ZhuanPan(HONG);//红色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN);
		delay_ms(1000);
		down(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(200);
		rise(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		delay_ms(100);
	}			
	
	if(i==0x32)
	{
		ZhuanPan(LV);//绿色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN);
		delay_ms(1000);
					down(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
					delay_ms(200);
		rise(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
					delay_ms(100);
	}

	if(i==0x33)
	{
		ZhuanPan(LAN);//蓝色
		YunTai(OUT);
		ZhuaZi(GRAB);//150guan
		//zhuazi(OPEN,GRAB);
		delay_ms(300);
		rise(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		YunTai(IN);
		delay_ms(1000);
		down(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		ZhuaZi(DROP);
		//zhuazi(GRAB,DROP);
		delay_ms(200);
		rise(6400*0.4, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);
		delay_ms(100);
		
	}
	
	if(C<3)
	{
		YunTai(OUT);
		ZhuaZi(OPEN);
		delay_ms(500);
		down(6400*1.7, sigan_speed, sigan_accel, sigan_decel);while(sigan_sta!= STOP);	
	}
	else
	{
		C=0;
		ZhuaZi(OPEN);
	}
	C++;
}

/**
 * @brief 返程的判断靶心
 * 
 * 根据OPENMV的传回来的靶心数值，调整车子的位置，让车子对中靶心
 * 
 * @param 
 * @param 
 * @return null
 */
void PanDuan2_fancheng(u8 i)
{
  int m=1,n=1;
	
	if(i==0x31)
	{
		Code_SendByte(0x04);Code_SendByte(0x04);Code_SendByte(0x04);
	}
	if(i==0x32)
	{
		Code_SendByte(0x05);Code_SendByte(0x05);Code_SendByte(0x05);
	}
	if(i==0x33)
	{
		Code_SendByte(0x06);Code_SendByte(0x06);Code_SendByte(0x06);
	}

	delay_ms(200);
	
	while(m)
	{
		int cx=CX2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 45, ex, 24, RED);
		
		if(ex>5)	{ex=5;}
		if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
			m=0;
	}
	
  m=1;
	
	while(n)
	{
		int cy=CY2,ey=0;
		
		ey=cy-(Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3]);
		
    //LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 65, ey, 24, RED);
		
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
    
	while(m)
	{
		int cx=CX2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 45, ex, 24, RED);
		
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
		{
			Code_SendByte(0x09);Code_SendByte(0x09);
			jiaqu_maduo(i);
			m=0;
		}
            
	}
    
}

/**
 * @brief 判断底层物料的
 * 
 * dcwl就是底层物料哈哈哈哈，实在不会起名字啦
 * 判断靶子跟底层物料的中心
 * 根据OPENMV的传回来的数值，调整车子的位置，让车子对正底层物料中心
 * 
 * @param i 对应的颜色
 * @return null
 */
void PanDuan2_dcwl(u8 i)
{
  int m=1,n=1;
	if(i==0x31)
	{
		Code_SendByte(0x04);Code_SendByte(0x04);Code_SendByte(0x04);
	}
	if(i==0x32)
	{
		Code_SendByte(0x05);Code_SendByte(0x05);Code_SendByte(0x05);
	}
	if(i==0x33)
	{
		Code_SendByte(0x06);Code_SendByte(0x06);Code_SendByte(0x06);
	}

	delay_ms(200);
	
	while(m)
	{
		int cx=CX2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
		//LCD_ShowNumber(230, 45, ex, 24, RED);
		
		if(ex>5)	{ex=5;}
		if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	
	while(n)
	{
		int cy=CY2,ey=0;
		
		ey=cy-(Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3]);
		
    //LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
   // LCD_ShowNumber(230, 65, ey, 24, RED);
		
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(6400*ey*0.0008,3000*ey,1,10000*ey);while(motor_sta!= STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
    
	while(m)
	{
		int cx=CX2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1]);
		
		//LCD_ShowNumber(230, 5, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, RED);
		//LCD_ShowNumber(230, 25, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, RED);
    //LCD_ShowNumber(230, 45, ex, 24, RED);
		
		if(ex>5)	{ex=5;}
		if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		else if(ex>0)
		{
			go(6400*ex*0.0008,3000*ex,1,10000*ex);while(motor_sta!= STOP);
		}
		if(ex==0)
    {
      Code_SendByte(0x09);Code_SendByte(0x09);
			down(6400*1.5, sigan_accel,sigan_decel, sigan_speed);while(sigan_sta!= STOP);
      m=0;
    } 
	}
}
void jiaozhun1(uint16_t Targetx1,uint16_t Targety1) //物块矫正 建议 x=156 y=86
{
  int m=1,n=1;
	delay_ms(200);
	//调整前后（车子的前后）
	while(m)
	{
		int cx=Targetx1,ex=0; 
		
		ex=cx-(Openmv_Column_RxPacket[0]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		else if(ex>0)
		{
			go(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	
	//调整左右（横移）
	while(n)
	{
		int cy=Targety1,ey=0;
		
		
		
		ey=cy-(Openmv_Column_RxPacket[1]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(3200*ey*0.0008,150*ey,1,50*ey);while(motor_sta== STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(3200*ey*0.0008,150*ey,1,50*ey);while(motor_sta== STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
  //再调整左右横移
	while(m)
	{
		int cx=Targetx1,ex=0;
		
		ex=cx-(Openmv_Column_RxPacket[0]);
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		else if(ex>0)
		{
			go(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		if(ex==0)
    {
      m=0;
    } 
	}
}//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
void jiaozhun2(uint16_t Targetx2,uint16_t Targety2) //圆环矫正 建议 x=124 y=137
{
  int m=1,n=0;
	delay_ms(200);
	//调整前后（车子的前后）
	while(m)
	{
		int cx=Targetx2,ex=0;
		
		ex=cx-(Openmv_Annular_RxPacket[0]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Annular_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Annular_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.0008,150*ex,1,50*ex);
		}
		else if(ex>0)
		{
			go(3200*ex*0.0008,150*ex,1,50*ex);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	n=1;
	
	//调整左右（横移）
	while(n)
	{
		int cy=Targety2,ey=0;
		
		ey=cy-(Openmv_Annular_RxPacket[1]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Annular_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Annular_RxPacket[1],3,16);
		OLED_Refresh();
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(3200*ey*0.0008,150*ey,1,50*ey);
		}                                               
		else if(ey<0)
		{
			ey=-ey;
			left(3200*ey*0.0008,150*ey,1,50*ey);
		}
		if(ey==0)
		{
			n=0;
		}
	}
  //再调整左右横移
	while(m)
	{
		int cx=Targetx2,ex=0;
		ex=cx-(Openmv_Annular_RxPacket[0]);
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Annular_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Annular_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.0008,150*ex,1,50*ex);
		}
		else if(ex>0)
		{
			go(3200*ex*0.0008,150*ex,1,50*ex);
		}
		if(ex==0)
    {
      m=0;
    } 
	}
}//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
void jiaozhun3(uint16_t Targetx1,uint16_t Targety1) //物块矫正 建议 x=156 y=86
{
  int m=1,n=1;
	delay_ms(200);
	//调整前后（车子的前后）
	while(m)
	{
		int cx=Targetx1,ex=0; 
		
		ex=cx-(Openmv_Column_RxPacket[0]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		else if(ex>0)
		{
			go(3200*ex*0.0008,150*ex,1,50*ex);while(motor_sta== STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	
	//调整左右（横移）
	while(n)
	{
		int cy=Targety1,ey=0;
		
		
		
		ey=cy-(Openmv_Column_RxPacket[1]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(3200*ey*0.0008,150*ey,1,50*ey);while(motor_sta== STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(3200*ey*0.0008,150*ey,1,50*ey);while(motor_sta== STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
}


void jiaozhun5(uint16_t Targetx1,uint16_t Targety1) //物块矫正 建议 x=156 y=86
{
  int m=1,n=1;
	delay_ms(200);
	//调整前后（车子的前后）
	while(m)
	{
		int cx=Targetx1,ex=0; 
		
		ex=cx-(Openmv_Column_RxPacket[0]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
    if(ex>5)	{ex=5;}
    if(ex<-5)	{ex=-5;}
		
		if(ex<0)
		{
			ex=-ex;
			back(3200*ex*0.00064,1300*ex,1,100*ex);while(motor_sta== STOP);
		}
		else if(ex>0)
		{
			go(3200*ex*0.00064,1300*ex,1,100*ex);while(motor_sta== STOP);
		}
		if(ex==0)
			m=0;
	}
    
  m=1;
	
	//调整左右（横移）
	while(n)
	{
		int cy=Targety1,ey=0;
		
		
		
		ey=cy-(Openmv_Column_RxPacket[1]);
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();
		if(ey>5)	{ey=5;}
    if(ey<-5)	{ey=-5;}
		
    if(ey>0)
		{
			right(3200*ey*0.0006,1300*ey,1,100*ey);while(motor_sta== STOP);
		}
		else if(ey<0)
		{
			ey=-ey;
			left(3200*ey*0.0006,1300*ey,1,100*ey);while(motor_sta== STOP);
		}
		if(ey==0)
		{
			n=0;
		}
	}
}

