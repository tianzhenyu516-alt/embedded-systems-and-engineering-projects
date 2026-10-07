#include "stm32f10x.h"                  // Device header
#include "Motor.h"

/*
 * 原 OpenMV/PyBoard 耗材代码用的是 100Hz PWM（Timer3）。
 * 该驱动板对高频 PWM（10kHz）不敏感，会被输入滤波平均成低压，导致速度慢。
 * 这里用 TIM1 的 PA8/PA9/PA10/PA11 复刻同一套 100Hz 双通道反相驱动：
 *   PA8  = TIM1_CH1 → 左轮 AIN1
 *   PA9  = TIM1_CH2 → 左轮 AIN2
 *   PA10 = TIM1_CH3 → 右轮 BIN1
 *   PA11 = TIM1_CH4 → 右轮 BIN2
 *
 * 每电机两通道反相驱动：
 *   左正转：AIN1=0    AIN2=PWM     左反转：AIN1=PWM  AIN2=0
 *   右正转：BIN1=PWM  BIN2=0（镜像）右反转：BIN1=0   BIN2=PWM
 *   停止：两通道都是0
 * Motor_Set范围 -999 ~ 999
 */

void Motor_Init(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_TIM1 | RCC_APB2Periph_GPIOA, ENABLE);

	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_8 | GPIO_Pin_9 | GPIO_Pin_10 | GPIO_Pin_11;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);

	/* TIM1时基：72MHz / (719+1) = 100kHz, / (999+1) = 100Hz PWM */
	TIM_TimeBaseInitTypeDef TIM_TimeBaseStructure;
	TIM_TimeBaseStructure.TIM_ClockDivision = TIM_CKD_DIV1;
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseStructure.TIM_Period = 1000 - 1;		//ARR=999
	TIM_TimeBaseStructure.TIM_Prescaler = 720 - 1;		//PSC=719 → 100Hz
	TIM_TimeBaseStructure.TIM_RepetitionCounter = 0;
	TIM_TimeBaseInit(TIM1, &TIM_TimeBaseStructure);

	TIM_OCInitTypeDef TIM_OCInitStructure;
	TIM_OCStructInit(&TIM_OCInitStructure);
	TIM_OCInitStructure.TIM_OCMode = TIM_OCMode_PWM1;
	TIM_OCInitStructure.TIM_OutputState = TIM_OutputState_Enable;
	TIM_OCInitStructure.TIM_OCPolarity = TIM_OCPolarity_High;
	TIM_OCInitStructure.TIM_Pulse = 0;
	TIM_OC1Init(TIM1, &TIM_OCInitStructure);
	TIM_OC2Init(TIM1, &TIM_OCInitStructure);
	TIM_OC3Init(TIM1, &TIM_OCInitStructure);
	TIM_OC4Init(TIM1, &TIM_OCInitStructure);
	TIM_OC1PreloadConfig(TIM1, TIM_OCPreload_Enable);
	TIM_OC2PreloadConfig(TIM1, TIM_OCPreload_Enable);
	TIM_OC3PreloadConfig(TIM1, TIM_OCPreload_Enable);
	TIM_OC4PreloadConfig(TIM1, TIM_OCPreload_Enable);

	TIM_CtrlPWMOutputs(TIM1, ENABLE);
	TIM_Cmd(TIM1, ENABLE);
}

void Motor_Set(int16_t left, int16_t right)
{
	uint16_t dl, dr;

	if(left > 999) left = 999;
	if(left < -999) left = -999;
	if(right > 999) right = 999;
	if(right < -999) right = -999;

	dl = (uint16_t)(left < 0 ? -left : left);	/* 0~999 直接对应 0~100% */
	dr = (uint16_t)(right < 0 ? -right : right);

	/* 左轮：PA8=AIN1(CH1) PA9=AIN2(CH2) */
	if(left > 0)       { TIM_SetCompare1(TIM1, 0);  TIM_SetCompare2(TIM1, dl); }
	else if(left < 0)  { TIM_SetCompare1(TIM1, dl); TIM_SetCompare2(TIM1, 0);  }
	else               { TIM_SetCompare1(TIM1, 0);  TIM_SetCompare2(TIM1, 0);  }

	/* 右轮：PA10=BIN1(CH3) PA11=BIN2(CH4) */
	if(right > 0)      { TIM_SetCompare3(TIM1, dr); TIM_SetCompare4(TIM1, 0);  }
	else if(right < 0) { TIM_SetCompare3(TIM1, 0);  TIM_SetCompare4(TIM1, dr); }
	else               { TIM_SetCompare3(TIM1, 0);  TIM_SetCompare4(TIM1, 0);  }
}
