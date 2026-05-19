#include "Key.h"
#include "Delay.h"

/**
  * 函    数：按键初始化
  * 参    数：无
  * 返 回 值：无
  * 说    明：配置PA2为上拉输入模式
  */
void Key_Init(void)
{
	// 使能GPIOA时钟
	RCC_APB2PeriphClockCmd(KEY_GPIO_CLK, ENABLE);
	
	// 配置PA2为上拉输入
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IPU;
	GPIO_InitStructure.GPIO_Pin = KEY_GPIO_PIN;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(KEY_GPIO_PORT, &GPIO_InitStructure);
}

/**
  * 函    数：获取按键当前状态
  * 参    数：无
  * 返 回 值：0-未按下，1-已按下
  * 说    明：上拉输入，按下时为低电平
  */
uint8_t Key_GetState(void)
{
	// 读取PA2电平，低电平表示按键按下
	return GPIO_ReadInputDataBit(KEY_GPIO_PORT, KEY_GPIO_PIN) == Bit_RESET ? 1 : 0;
}

/**
  * 函    数：按键扫描（带消抖）
  * 参    数：无
  * 返 回 值：0-无按键事件，1-按键按下
  * 说    明：检测按键按下并消抖，松手后返回
  */
uint8_t Key_Scan(void)
{
	static uint8_t key_flag = 0;
	
	if (Key_GetState() == 1) {
		// 检测到按键按下
		Delay_ms(20); // 消抖延时
		if (Key_GetState() == 1 && key_flag == 0) {
			key_flag = 1; // 标记已按下
			return 1; // 返回按键按下事件
		}
	} else {
		// 按键松开
		key_flag = 0;
	}
	
	return 0;
}
