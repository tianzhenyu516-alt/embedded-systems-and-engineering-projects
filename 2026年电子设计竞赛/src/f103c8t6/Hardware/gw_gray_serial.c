/*
 * Copyright (c) 2025 北京感为科技
 * 修改：延时改为Delay_us(5)适配72MHz主频
 */

#include "gw_gray_serial.h"
#include "Delay.h"

uint8_t gw_gray_serial_read(GPIO_TypeDef *GPIOx, uint16_t gpio_clk, uint16_t gpio_dat)
{
	uint8_t ret = 0;
	uint8_t i;

	for (i = 0; i < 8; ++i) {
		GPIO_ResetBits(GPIOx, gpio_clk);
		Delay_us(5);
		ret |= GPIO_ReadInputDataBit(GPIOx, gpio_dat) << i;
		GPIO_SetBits(GPIOx, gpio_clk);
		Delay_us(5);
	}

	return ret;
}
