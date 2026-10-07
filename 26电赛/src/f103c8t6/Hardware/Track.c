#include "stm32f10x.h"                  // Device header
#include "Track.h"

/*
 * 8路灰度传感器：每路独立IO直连（非串行模块）
 *   PA0 = 传感器1（最内侧） ... PA7 = 传感器8（最外侧）
 * 返回值：bit0=传感器1 ... bit7=传感器8，位=1表示检到黑线
 * 注意：TCRT5000+LM393模块 OUT 低电平有效（检黑=0），故读回后取反
 * 传感器需5V供电，与单片机共地
 */

void Track_Init(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);

	GPIO_InitTypeDef GPIOStructure;
	GPIOStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING;
	GPIOStructure.GPIO_Pin = GPIO_Pin_0 | GPIO_Pin_1 | GPIO_Pin_2 | GPIO_Pin_3 |
	                         GPIO_Pin_4 | GPIO_Pin_5 | GPIO_Pin_6 | GPIO_Pin_7;
	GPIOStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIOStructure);
}

void Read_Track_DATA(uint8_t* arr)
{
	*arr = (uint8_t)(~(GPIOA->IDR) & 0xFF);
}
