#ifndef __RELAY_H
#define __RELAY_H

#include "stm32f10x.h"

// 继电器控制引脚定义 - PA0
// 继电器用于控制外部电机模块的电源通断
// 接线说明：
//   继电器VCC -> 5V
//   继电器GND -> GND  
//   继电器IN  -> PA0 (STM32控制信号)
//   继电器COM -> 外部电机电源+
//   继电器NO  -> 外部电机正极 (常开模式，高电平吸合)
#define RELAY_GPIO_PORT		GPIOA
#define RELAY_GPIO_PIN		GPIO_Pin_0     
#define RELAY_GPIO_CLK		RCC_APB2Periph_GPIOA

void Relay_Init(void);
void Relay_On(void);   // 继电器吸合，电机通电运转
void Relay_Off(void);  // 继电器断开，电机断电停止
void Relay_Toggle(void);
uint8_t Relay_GetStatus(void);

#endif
