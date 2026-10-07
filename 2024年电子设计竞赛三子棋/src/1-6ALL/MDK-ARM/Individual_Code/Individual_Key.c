#include "stm32f1xx_hal.h"

uint8_t Key_Num;

uint8_t Key_GetState(void)
{
	if(HAL_GPIO_ReadPin(GPIOB,GPIO_PIN_0)==0)
	{
		return 1;
	}
	else if(HAL_GPIO_ReadPin(GPIOB,GPIO_PIN_10)==0)
	{
		return 2;
	}
	else if(HAL_GPIO_ReadPin(GPIOA,GPIO_PIN_6)==0)
	{
		return 3;
	}
	else if(HAL_GPIO_ReadPin(GPIOC,GPIO_PIN_15)==0)
	{
		return 4;
	}
	else
	{
		return 0;
	}
}

void Key_Tick(void)//放入中断函数的子函数。每当位于main.c的中断函数执行一次，该函数就也执行一次，有利于模块的封装
{
	static uint8_t Count;
	static uint8_t CurrState,PrevState;
	static uint16_t Temp;
	Count++;
	if(Count>=15)
	{
		Count=0;
		PrevState=CurrState;
		CurrState=Key_GetState();
		
//		if(CurrState==0 && PrevState==0)Temp_Key=0;
		
		if(CurrState==0 && PrevState!=0)
		{
			Key_Num=PrevState;
			Temp=0;
		}
		else if(CurrState==3&&PrevState==3)//如果3一直被按下，计数值累加，并记录当前状态
		{
			Temp+=15;
			if(Temp>=2000)
			{
				Key_Num=5;
				Temp=0;
			}
		}
		

//		else if(CurrState==2&&PrevState==2)//如果2一直被按下，计数值累加，并记录当前状态
//		{
//			Temp+=15;
//			if(Temp>=2000)
//			{
//				Key_Num=5;
//				Temp=0;
//				Temp_Key=1;
//			}
//		}
//		else if(CurrState==2&&PrevState==2)//如果2一直被按下，计数值累加，并记录当前状态
//		{
//			Temp+=15;
//			if(Temp>=2000)
//			{
//				Key_Num=6;
//				Temp=0;
//				Temp_Key=1;
//			}
//		}
	}
	
}

uint8_t Key_GetNum(void)
{
	uint8_t Temp;
	if(Key_Num)
	{
		Temp=Key_Num;
		Key_Num=0;
		return Temp;
	}
	return 0;
}
