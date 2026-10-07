#include "stm32f10x.h"                  // Device header
#include "Key.h"

/* 按键接PB6，上拉输入。静止电平开机自动校准（兼容按下=高/低两种接法） */
static uint8_t key_rest = 1;	/* 静止电平，默认高（上拉） */

void Key_Init(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB,ENABLE);

	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IPU;	//上拉输入
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_6;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOB,&GPIO_InitStructure);
}

/* 开机延时期间（手离开按键后）调用一次，采样静止电平，防止开机误触发 */
void Key_Calibrate(void)
{
	key_rest = GPIO_ReadInputDataBit(GPIOB,GPIO_Pin_6);
}

/* 返回值：0=无事件，1=一次有效按下（5ms消抖，按下触发一次，松开复位） */
uint8_t Key_GetNum(void)
{
	static uint8_t pressed = 0;
	static uint8_t cnt = 0;
	uint8_t now = GPIO_ReadInputDataBit(GPIOB,GPIO_Pin_6);
	uint8_t ret = 0;

	if(pressed == 0)
	{
		if(now != key_rest)	/* 偏离静止电平 = 可能按下 */
		{
			if(++cnt >= 5) { pressed = 1; cnt = 0; ret = 1; }
		}
		else cnt = 0;
	}
	else
	{
		if(now == key_rest)	/* 回到静止电平 = 松开 */
		{
			if(++cnt >= 5) { pressed = 0; cnt = 0; }
		}
		else cnt = 0;
	}
	return ret;
}
