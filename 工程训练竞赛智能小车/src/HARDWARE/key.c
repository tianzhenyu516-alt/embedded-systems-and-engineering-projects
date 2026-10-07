#include "stm32f4xx.h"                  // Device header
#include "delay.h"  
//这里是按键的初始化代码

void Key_Init(void)
{
	GPIO_InitTypeDef GPIO_InitStructure; //定义结构体变量
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOE,ENABLE); //开启时钟
	
	/*
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
	GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_5;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);
	*/
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_7;         //PE7
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOE, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9;         //PE9
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOE, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_10;         //PE10
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOE, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN;
	GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_13;         //PE13
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOE, &GPIO_InitStructure);
	
	
}

uint8_t Key_GetNum(void)  //按键获取键码
{
	uint8_t KeyNum = 0;		//定义变量，默认键码值为0
	
	if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_7) == 0)			
	{
		delay_ms(20);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_7) == 0);	//等待按键松手
		delay_ms(20);											//延时消抖
		KeyNum = 1;												//置键码为1
	}
	
	if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_9) == 0)			
	{
		delay_ms(100);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_9) == 0);	//等待按键松手
		delay_ms(100);											//延时消抖
		KeyNum = 2;												//置键码为2
	}
	
		if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_10) == 0)			
	{
		delay_ms(20);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_10) == 0);	//等待按键松手
		delay_ms(20);											//延时消抖
		KeyNum = 3;												//置键码为2
	}
	
	if (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_13) == 0)			
	{
		delay_ms(20);											//延时消抖
		while (GPIO_ReadInputDataBit(GPIOE, GPIO_Pin_13) == 0);	//等待按键松手
		delay_ms(20);											//延时消抖
		KeyNum = 4;												//置键码为2
	}
	return KeyNum;			//返回键码值，如果没有按键按下，所有if都不成立，则键码为默认值0
}

