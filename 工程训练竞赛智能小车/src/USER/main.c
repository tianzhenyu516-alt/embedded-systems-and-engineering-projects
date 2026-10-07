#include "stm32f4xx.h"
#include "key.h"
#include "zhi.h"
#include "jy62.h"
#include "code.h"
#include "ziku.h"
#include "text.h"
#include "duoji.h"
#include "delay.h"
#include "motor.h"
#include "openmv.h"
#include "control.h"
#include "motor_init.h"
#include "usart_lcd.h"
#include "oled.h"
#include "sys.h"


int abb=9;
int z;
uint16_t num=0;
uint16_t KeyNum=0;
int speed=0;
u8 a[]="123";
extern int acr;


int main(void)
{ 	


	delay_init(168);
	OLED_Init();
	Key_Init();
	TIM4_Config();
	jy62_init();
	Code_Init();
	ZhuaZi_Init();
	YunTai_Init();
	Openmv_Init();
	ZhuanPan_Init();
	SIGAN_TIM_Init();
	MOTOR_TIM_Init();
	SIGAN_GPIO_Init();
	MOTOR_GPIO_Init();
	usar_lcd_init();
	OLED_Clear();
		OLED_ShowChinese(0,0,0,16);//顺
		OLED_ShowChinese(18,0,1,16);//风
		OLED_ShowChinese(36,0,2,16);//没
		OLED_ShowChinese(54,0,3,16);//我
		OLED_ShowChinese(72,0,4,16);//快
		OLED_Refresh();  // 刷新屏幕，确保显示内容生效
	while(1)
	{
	  HMI_send();//串口屏发送代码
		yaw=(float)(hwt101[18]<<8|hwt101[17])/32768*180;//陀螺仪角度获取
		OLED_ShowChar(15,50,'x',16);
		OLED_ShowNum(30,50,Openmv_Annular_RxPacket[0],3,16);
		OLED_ShowChar(60,50,'y',16);
		OLED_ShowNum(70,50,Openmv_Annular_RxPacket[1],3,16);	
		
		OLED_ShowChar(15,30,'x',16);
		OLED_ShowNum(30,30,Openmv_Column_RxPacket[0],3,16);
		OLED_ShowChar(60,30,'y',16);
		OLED_ShowNum(70,30,Openmv_Column_RxPacket[1],3,16);
		OLED_Refresh();

	switch(KeyNum)
		{
		case 1:	
			KeyNum=0;
case 2:		
control();
		KeyNum=0;
		break;
		case 3:
		KeyNum=0;
		break;
		case 4:
		KeyNum=0;
		break;
		
	}
		
	/////////////////////////按键//////////////////////////////////////////////
		if(GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_7) == 0){
			delay_ms(50);		
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_7) == 0);
			delay_ms(50);		
			KeyNum = 1;				
	
		}
		if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_9) == 0)			
	{
		delay_ms(50);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_9) == 0);	//等待按键松手
		delay_ms(50);											//延时消抖
		KeyNum = 2;												
	}
	
		if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_10) == 0)			
	{
		delay_ms(50);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_10) == 0);	//等待按键松手
		delay_ms(50);											//延时消抖
		KeyNum = 3;					

	}
	
	if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_13) == 0)			
	{
		delay_ms(50);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_13) == 0);	//等待按键松手
		delay_ms(50);											//延时消抖
		KeyNum = 4;		
		///////////////////////////////////////////////////////////////////////////////////////////////////
	}
		
	}

}

//此代码架构参考B站 轻风雨的代码修改完善而来
//以下是根据他的代码做的修改的接线图 使用的是正点原子的STM32F407ZGT6
//引脚接线  
/**
*串口屏: TX:B7  RX:B6  
*二维码: TX:A2  RX:A3
*openmv: TX:B10 RX:B11
*陀螺仪：TX:G14 RX:G9
***舵机：爪子TIMER13_CH1:A6 | 云台TIMER14_CH1:A7 | 转盘TIMER2_CH2:F6 |PCB板的从左到右
//EN:B3 | STEP:C6.C7.C8.C9 | DIR:D12.D13.C10.C12 小车底盘轮子电机
//EN:C0 | STEP:A1,DIR:C2 // 升降台步进电机
//二维码TX--A3 | A2--openmv RX | openmv TX--B11 |
如果嫌麻烦可以下单工房的PCB就不用考虑接线了
*/

