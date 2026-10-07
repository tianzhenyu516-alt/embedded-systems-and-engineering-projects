/*
 * Copyright (c) 2025 北京感为科技
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 */
 
#ifndef __GW_GRAY_SERIAL_H__
#define __GW_GRAY_SERIAL_H__

#include <stdint.h>
#include <stm32f10x_gpio.h>

uint8_t gw_gray_serial_read(GPIO_TypeDef *GPIOx, uint16_t gpio_clk, uint16_t gpio_dat);


#endif //__GW_GRAY_SERIAL_H__
