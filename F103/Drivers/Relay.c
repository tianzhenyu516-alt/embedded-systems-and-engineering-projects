#include "Relay.h"

static uint8_t relay_status = 0;

/**
  * 函    数：继电器初始化
  * 参    数：无
  * 返 回 值：无
  * 说    明：配置PA0为推挽输出，控制5V继电器模块
  *         继电器模块：VCC-5V, GND-GND, IN-PA0
  *         高电平触发：高电平吸合，低电平断开
  */
void Relay_Init(void)
{
	// 使能GPIOA时钟
	RCC_APB2PeriphClockCmd(RELAY_GPIO_CLK, ENABLE);
	
	// 配置PA0为推挽输出
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStructure.GPIO_Pin = RELAY_GPIO_PIN;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(RELAY_GPIO_PORT, &GPIO_InitStructure);
	
	// 初始状态：继电器吸合（高电平），电机立即转动
	GPIO_SetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN);
	relay_status = 1;
}

/**
  * 函    数：继电器吸合
  * 参    数：无
  * 返 回 值：无
  * 说    明：输出高电平，继电器吸合
  */
void Relay_On(void)
{
	GPIO_SetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN);
	relay_status = 1;
}

/**
  * 函    数：继电器断开
  * 参    数：无
  * 返 回 值：无
  * 说    明：输出低电平，继电器断开
  */
void Relay_Off(void)
{
	GPIO_ResetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN);
	relay_status = 0;
}

/**
  * 函    数：继电器状态翻转
  * 参    数：无
  * 返 回 值：无
  * 说    明：当前吸合则断开，当前断开则吸合
  */
void Relay_Toggle(void)
{
	if (relay_status) {
		Relay_Off();
	} else {
		Relay_On();
	}
}

/**
  * 函    数：获取继电器状态
  * 参    数：无
  * 返 回 值：0-断开，1-吸合
  */
uint8_t Relay_GetStatus(void)
{
	return relay_status;
}
