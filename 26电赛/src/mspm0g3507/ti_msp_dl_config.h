/*
 * Copyright (c) 2023, Texas Instruments Incorporated - http://www.ti.com
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 *  ============ ti_msp_dl_config.h =============
 *  Configured MSPM0 DriverLib module declarations
 *
 *  DO NOT EDIT - This file is generated for the MSPM0G350X
 *  by the SysConfig tool.
 */
#ifndef ti_msp_dl_config_h
#define ti_msp_dl_config_h

#define CONFIG_MSPM0G350X

#if defined(__ti_version__) || defined(__TI_COMPILER_VERSION__)
#define SYSCONFIG_WEAK __attribute__((weak))
#elif defined(__IAR_SYSTEMS_ICC__)
#define SYSCONFIG_WEAK __weak
#elif defined(__GNUC__)
#define SYSCONFIG_WEAK __attribute__((weak))
#endif

#include <ti/devices/msp/msp.h>
#include <ti/driverlib/driverlib.h>
#include <ti/driverlib/m0p/dl_core.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 *  ======== SYSCFG_DL_init ========
 *  Perform all required MSP DL initialization
 *
 *  This function should be called once at a point before any use of
 *  MSP DL.
 */


/* clang-format off */

#define POWER_STARTUP_DELAY                                                (16)


#define GPIO_HFXT_PORT                                                     GPIOA
#define GPIO_HFXIN_PIN                                             DL_GPIO_PIN_5
#define GPIO_HFXIN_IOMUX                                         (IOMUX_PINCM10)
#define GPIO_HFXOUT_PIN                                            DL_GPIO_PIN_6
#define GPIO_HFXOUT_IOMUX                                        (IOMUX_PINCM11)
#define CPUCLK_FREQ                                                     80000000



/* Defines for PWM_0 */
#define PWM_0_INST                                                         TIMA0
#define PWM_0_INST_IRQHandler                                   TIMA0_IRQHandler
#define PWM_0_INST_INT_IRQN                                     (TIMA0_INT_IRQn)
#define PWM_0_INST_CLK_FREQ                                              1000000
/* GPIO defines for channel 0 */
#define GPIO_PWM_0_C0_PORT                                                 GPIOB
#define GPIO_PWM_0_C0_PIN                                         DL_GPIO_PIN_14
#define GPIO_PWM_0_C0_IOMUX                                      (IOMUX_PINCM31)
#define GPIO_PWM_0_C0_IOMUX_FUNC                     IOMUX_PINCM31_PF_TIMA0_CCP0
#define GPIO_PWM_0_C0_IDX                                    DL_TIMER_CC_0_INDEX
/* GPIO defines for channel 1 */
#define GPIO_PWM_0_C1_PORT                                                 GPIOB
#define GPIO_PWM_0_C1_PIN                                         DL_GPIO_PIN_12
#define GPIO_PWM_0_C1_IOMUX                                      (IOMUX_PINCM29)
#define GPIO_PWM_0_C1_IOMUX_FUNC                     IOMUX_PINCM29_PF_TIMA0_CCP1
#define GPIO_PWM_0_C1_IDX                                    DL_TIMER_CC_1_INDEX
/* GPIO defines for channel 2 */
#define GPIO_PWM_0_C2_PORT                                                 GPIOA
#define GPIO_PWM_0_C2_PIN                                          DL_GPIO_PIN_7
#define GPIO_PWM_0_C2_IOMUX                                      (IOMUX_PINCM14)
#define GPIO_PWM_0_C2_IOMUX_FUNC                     IOMUX_PINCM14_PF_TIMA0_CCP2
#define GPIO_PWM_0_C2_IDX                                    DL_TIMER_CC_2_INDEX
/* GPIO defines for channel 3 */
#define GPIO_PWM_0_C3_PORT                                                 GPIOA
#define GPIO_PWM_0_C3_PIN                                         DL_GPIO_PIN_17
#define GPIO_PWM_0_C3_IOMUX                                      (IOMUX_PINCM39)
#define GPIO_PWM_0_C3_IOMUX_FUNC                     IOMUX_PINCM39_PF_TIMA0_CCP3
#define GPIO_PWM_0_C3_IDX                                    DL_TIMER_CC_3_INDEX

/* Defines for PWM_1 */
#define PWM_1_INST                                                         TIMA1
#define PWM_1_INST_IRQHandler                                   TIMA1_IRQHandler
#define PWM_1_INST_INT_IRQN                                     (TIMA1_INT_IRQn)
#define PWM_1_INST_CLK_FREQ                                              2000000
/* GPIO defines for channel 0 */
#define GPIO_PWM_1_C0_PORT                                                 GPIOA
#define GPIO_PWM_1_C0_PIN                                         DL_GPIO_PIN_15
#define GPIO_PWM_1_C0_IOMUX                                      (IOMUX_PINCM37)
#define GPIO_PWM_1_C0_IOMUX_FUNC                     IOMUX_PINCM37_PF_TIMA1_CCP0
#define GPIO_PWM_1_C0_IDX                                    DL_TIMER_CC_0_INDEX
/* GPIO defines for channel 1 */
#define GPIO_PWM_1_C1_PORT                                                 GPIOB
#define GPIO_PWM_1_C1_PIN                                          DL_GPIO_PIN_1
#define GPIO_PWM_1_C1_IOMUX                                      (IOMUX_PINCM13)
#define GPIO_PWM_1_C1_IOMUX_FUNC                     IOMUX_PINCM13_PF_TIMA1_CCP1
#define GPIO_PWM_1_C1_IDX                                    DL_TIMER_CC_1_INDEX

/* Defines for PWM_2 */
#define PWM_2_INST                                                         TIMG7
#define PWM_2_INST_IRQHandler                                   TIMG7_IRQHandler
#define PWM_2_INST_INT_IRQN                                     (TIMG7_INT_IRQn)
#define PWM_2_INST_CLK_FREQ                                              1000000
/* GPIO defines for channel 0 */
#define GPIO_PWM_2_C0_PORT                                                 GPIOA
#define GPIO_PWM_2_C0_PIN                                         DL_GPIO_PIN_23
#define GPIO_PWM_2_C0_IOMUX                                      (IOMUX_PINCM53)
#define GPIO_PWM_2_C0_IOMUX_FUNC                     IOMUX_PINCM53_PF_TIMG7_CCP0
#define GPIO_PWM_2_C0_IDX                                    DL_TIMER_CC_0_INDEX
/* GPIO defines for channel 1 */
#define GPIO_PWM_2_C1_PORT                                                 GPIOA
#define GPIO_PWM_2_C1_PIN                                          DL_GPIO_PIN_2
#define GPIO_PWM_2_C1_IOMUX                                       (IOMUX_PINCM7)
#define GPIO_PWM_2_C1_IOMUX_FUNC                      IOMUX_PINCM7_PF_TIMG7_CCP1
#define GPIO_PWM_2_C1_IDX                                    DL_TIMER_CC_1_INDEX



/* Defines for TIMER_1 */
#define TIMER_1_INST                                                     (TIMG0)
#define TIMER_1_INST_IRQHandler                                 TIMG0_IRQHandler
#define TIMER_1_INST_INT_IRQN                                   (TIMG0_INT_IRQn)
#define TIMER_1_INST_LOAD_VALUE                                         (19999U)
/* Defines for TIMER_2 */
#define TIMER_2_INST                                                     (TIMG6)
#define TIMER_2_INST_IRQHandler                                 TIMG6_IRQHandler
#define TIMER_2_INST_INT_IRQN                                   (TIMG6_INT_IRQn)
#define TIMER_2_INST_LOAD_VALUE                                         (19999U)
/* Defines for TIMER_G8 */
#define TIMER_G8_INST                                                    (TIMG8)
#define TIMER_G8_INST_IRQHandler                                TIMG8_IRQHandler
#define TIMER_G8_INST_INT_IRQN                                  (TIMG8_INT_IRQn)
#define TIMER_G8_INST_LOAD_VALUE                                        (49999U)
/* Defines for TIMER_G12 */
#define TIMER_G12_INST                                                  (TIMG12)
#define TIMER_G12_INST_IRQHandler                              TIMG12_IRQHandler
#define TIMER_G12_INST_INT_IRQN                                (TIMG12_INT_IRQn)
#define TIMER_G12_INST_LOAD_VALUE                                        (9999U)



/* Defines for UART_0 */
#define UART_0_INST                                                        UART0
#define UART_0_INST_IRQHandler                                  UART0_IRQHandler
#define UART_0_INST_INT_IRQN                                      UART0_INT_IRQn
#define GPIO_UART_0_RX_PORT                                                GPIOA
#define GPIO_UART_0_TX_PORT                                                GPIOA
#define GPIO_UART_0_RX_PIN                                        DL_GPIO_PIN_11
#define GPIO_UART_0_TX_PIN                                        DL_GPIO_PIN_10
#define GPIO_UART_0_IOMUX_RX                                     (IOMUX_PINCM22)
#define GPIO_UART_0_IOMUX_TX                                     (IOMUX_PINCM21)
#define GPIO_UART_0_IOMUX_RX_FUNC                      IOMUX_PINCM22_PF_UART0_RX
#define GPIO_UART_0_IOMUX_TX_FUNC                      IOMUX_PINCM21_PF_UART0_TX
#define UART_0_BAUD_RATE                                                (460800)
#define UART_0_IBRD_40_MHZ_460800_BAUD                                       (5)
#define UART_0_FBRD_40_MHZ_460800_BAUD                                      (27)
/* Defines for UART_1 */
#define UART_1_INST                                                        UART1
#define UART_1_INST_IRQHandler                                  UART1_IRQHandler
#define UART_1_INST_INT_IRQN                                      UART1_INT_IRQn
#define GPIO_UART_1_RX_PORT                                                GPIOA
#define GPIO_UART_1_TX_PORT                                                GPIOA
#define GPIO_UART_1_RX_PIN                                         DL_GPIO_PIN_9
#define GPIO_UART_1_TX_PIN                                         DL_GPIO_PIN_8
#define GPIO_UART_1_IOMUX_RX                                     (IOMUX_PINCM20)
#define GPIO_UART_1_IOMUX_TX                                     (IOMUX_PINCM19)
#define GPIO_UART_1_IOMUX_RX_FUNC                      IOMUX_PINCM20_PF_UART1_RX
#define GPIO_UART_1_IOMUX_TX_FUNC                      IOMUX_PINCM19_PF_UART1_TX
#define UART_1_BAUD_RATE                                                (256000)
#define UART_1_IBRD_40_MHZ_256000_BAUD                                       (9)
#define UART_1_FBRD_40_MHZ_256000_BAUD                                      (49)
/* Defines for UART_2 */
#define UART_2_INST                                                        UART2
#define UART_2_INST_IRQHandler                                  UART2_IRQHandler
#define UART_2_INST_INT_IRQN                                      UART2_INT_IRQn
#define GPIO_UART_2_RX_PORT                                                GPIOA
#define GPIO_UART_2_TX_PORT                                                GPIOA
#define GPIO_UART_2_RX_PIN                                        DL_GPIO_PIN_22
#define GPIO_UART_2_TX_PIN                                        DL_GPIO_PIN_21
#define GPIO_UART_2_IOMUX_RX                                     (IOMUX_PINCM47)
#define GPIO_UART_2_IOMUX_TX                                     (IOMUX_PINCM46)
#define GPIO_UART_2_IOMUX_RX_FUNC                      IOMUX_PINCM47_PF_UART2_RX
#define GPIO_UART_2_IOMUX_TX_FUNC                      IOMUX_PINCM46_PF_UART2_TX
#define UART_2_BAUD_RATE                                                  (9600)
#define UART_2_IBRD_40_MHZ_9600_BAUD                                       (260)
#define UART_2_FBRD_40_MHZ_9600_BAUD                                        (27)
/* Defines for UART_3 */
#define UART_3_INST                                                        UART3
#define UART_3_INST_IRQHandler                                  UART3_IRQHandler
#define UART_3_INST_INT_IRQN                                      UART3_INT_IRQn
#define GPIO_UART_3_RX_PORT                                                GPIOB
#define GPIO_UART_3_TX_PORT                                                GPIOB
#define GPIO_UART_3_RX_PIN                                         DL_GPIO_PIN_3
#define GPIO_UART_3_TX_PIN                                         DL_GPIO_PIN_2
#define GPIO_UART_3_IOMUX_RX                                     (IOMUX_PINCM16)
#define GPIO_UART_3_IOMUX_TX                                     (IOMUX_PINCM15)
#define GPIO_UART_3_IOMUX_RX_FUNC                      IOMUX_PINCM16_PF_UART3_RX
#define GPIO_UART_3_IOMUX_TX_FUNC                      IOMUX_PINCM15_PF_UART3_TX
#define UART_3_BAUD_RATE                                                  (9600)
#define UART_3_IBRD_80_MHZ_9600_BAUD                                       (520)
#define UART_3_FBRD_80_MHZ_9600_BAUD                                        (53)




/* Defines for SPI_0 */
#define SPI_0_INST                                                         SPI0
#define SPI_0_INST_IRQHandler                                   SPI0_IRQHandler
#define SPI_0_INST_INT_IRQN                                       SPI0_INT_IRQn
#define GPIO_SPI_0_PICO_PORT                                              GPIOA
#define GPIO_SPI_0_PICO_PIN                                      DL_GPIO_PIN_14
#define GPIO_SPI_0_IOMUX_PICO                                   (IOMUX_PINCM36)
#define GPIO_SPI_0_IOMUX_PICO_FUNC                   IOMUX_PINCM36_PF_SPI0_PICO
#define GPIO_SPI_0_POCI_PORT                                              GPIOA
#define GPIO_SPI_0_POCI_PIN                                      DL_GPIO_PIN_13
#define GPIO_SPI_0_IOMUX_POCI                                   (IOMUX_PINCM35)
#define GPIO_SPI_0_IOMUX_POCI_FUNC                   IOMUX_PINCM35_PF_SPI0_POCI
/* GPIO configuration for SPI_0 */
#define GPIO_SPI_0_SCLK_PORT                                              GPIOA
#define GPIO_SPI_0_SCLK_PIN                                      DL_GPIO_PIN_12
#define GPIO_SPI_0_IOMUX_SCLK                                   (IOMUX_PINCM34)
#define GPIO_SPI_0_IOMUX_SCLK_FUNC                   IOMUX_PINCM34_PF_SPI0_SCLK



/* Defines for ADC12_0 */
#define ADC12_0_INST                                                        ADC0
#define ADC12_0_INST_IRQHandler                                  ADC0_IRQHandler
#define ADC12_0_INST_INT_IRQN                                    (ADC0_INT_IRQn)
#define ADC12_0_ADCMEM_1                                      DL_ADC12_MEM_IDX_1
#define ADC12_0_ADCMEM_1_REF                     DL_ADC12_REFERENCE_VOLTAGE_VDDA
#define ADC12_0_ADCMEM_1_REF_VOLTAGE_V                                       3.3
#define GPIO_ADC12_0_C1_PORT                                               GPIOA
#define GPIO_ADC12_0_C1_PIN                                       DL_GPIO_PIN_26



/* Defines for DMA_CH0 */
#define DMA_CH0_CHAN_ID                                                      (0)
#define UART_2_INST_DMA_TRIGGER                              (DMA_UART2_TX_TRIG)



/* Port definition for Pin Group KEYA */
#define KEYA_PORT                                                        (GPIOA)

/* Defines for S2: GPIOA.18 with pinCMx 40 on package pin 11 */
#define KEYA_S2_PIN                                             (DL_GPIO_PIN_18)
#define KEYA_S2_IOMUX                                            (IOMUX_PINCM40)
/* Port definition for Pin Group KEYB */
#define KEYB_PORT                                                        (GPIOB)

/* Defines for S3: GPIOB.21 with pinCMx 49 on package pin 20 */
#define KEYB_S3_PIN                                             (DL_GPIO_PIN_21)
#define KEYB_S3_IOMUX                                            (IOMUX_PINCM49)
/* Port definition for Pin Group GPIO_RGB */
#define GPIO_RGB_PORT                                                    (GPIOB)

/* Defines for RED: GPIOB.26 with pinCMx 57 on package pin 28 */
#define GPIO_RGB_RED_PIN                                        (DL_GPIO_PIN_26)
#define GPIO_RGB_RED_IOMUX                                       (IOMUX_PINCM57)
/* Defines for GREEN: GPIOB.27 with pinCMx 58 on package pin 29 */
#define GPIO_RGB_GREEN_PIN                                      (DL_GPIO_PIN_27)
#define GPIO_RGB_GREEN_IOMUX                                     (IOMUX_PINCM58)
/* Defines for BLUE: GPIOB.22 with pinCMx 50 on package pin 21 */
#define GPIO_RGB_BLUE_PIN                                       (DL_GPIO_PIN_22)
#define GPIO_RGB_BLUE_IOMUX                                      (IOMUX_PINCM50)
/* Port definition for Pin Group PORTA */
#define PORTA_PORT                                                       (GPIOA)

/* Defines for beep: GPIOA.27 with pinCMx 60 on package pin 31 */
#define PORTA_beep_PIN                                          (DL_GPIO_PIN_27)
#define PORTA_beep_IOMUX                                         (IOMUX_PINCM60)
/* Defines for GRAY_BIT0: GPIOA.30 with pinCMx 5 on package pin 37 */
#define PORTA_GRAY_BIT0_PIN                                     (DL_GPIO_PIN_30)
#define PORTA_GRAY_BIT0_IOMUX                                     (IOMUX_PINCM5)
/* Defines for GRAY_BIT1: GPIOA.28 with pinCMx 3 on package pin 35 */
#define PORTA_GRAY_BIT1_PIN                                     (DL_GPIO_PIN_28)
#define PORTA_GRAY_BIT1_IOMUX                                     (IOMUX_PINCM3)
/* Defines for GRAY_BIT2: GPIOA.1 with pinCMx 2 on package pin 34 */
#define PORTA_GRAY_BIT2_PIN                                      (DL_GPIO_PIN_1)
#define PORTA_GRAY_BIT2_IOMUX                                     (IOMUX_PINCM2)
/* Defines for GRAY_BIT3: GPIOA.0 with pinCMx 1 on package pin 33 */
#define PORTA_GRAY_BIT3_PIN                                      (DL_GPIO_PIN_0)
#define PORTA_GRAY_BIT3_IOMUX                                     (IOMUX_PINCM1)
/* Defines for GRAY_BIT4: GPIOA.25 with pinCMx 55 on package pin 26 */
#define PORTA_GRAY_BIT4_PIN                                     (DL_GPIO_PIN_25)
#define PORTA_GRAY_BIT4_IOMUX                                    (IOMUX_PINCM55)
/* Defines for GRAY_BIT5: GPIOA.24 with pinCMx 54 on package pin 25 */
#define PORTA_GRAY_BIT5_PIN                                     (DL_GPIO_PIN_24)
#define PORTA_GRAY_BIT5_IOMUX                                    (IOMUX_PINCM54)
/* Defines for GRAY_BIT10: GPIOA.16 with pinCMx 38 on package pin 9 */
#define PORTA_GRAY_BIT10_PIN                                    (DL_GPIO_PIN_16)
#define PORTA_GRAY_BIT10_IOMUX                                   (IOMUX_PINCM38)
/* Port definition for Pin Group PORTB */
#define PORTB_PORT                                                       (GPIOB)

/* Defines for LCD_SDA: GPIOB.8 with pinCMx 25 on package pin 60 */
#define PORTB_LCD_SDA_PIN                                        (DL_GPIO_PIN_8)
#define PORTB_LCD_SDA_IOMUX                                      (IOMUX_PINCM25)
/* Defines for D3_3: GPIOB.10 with pinCMx 27 on package pin 62 */
#define PORTB_D3_3_PIN                                          (DL_GPIO_PIN_10)
#define PORTB_D3_3_IOMUX                                         (IOMUX_PINCM27)
/* Defines for D3_4: GPIOB.11 with pinCMx 28 on package pin 63 */
#define PORTB_D3_4_PIN                                          (DL_GPIO_PIN_11)
#define PORTB_D3_4_IOMUX                                         (IOMUX_PINCM28)
/* Defines for W25Q64_CS: GPIOB.25 with pinCMx 56 on package pin 27 */
#define PORTB_W25Q64_CS_PIN                                     (DL_GPIO_PIN_25)
#define PORTB_W25Q64_CS_IOMUX                                    (IOMUX_PINCM56)
/* Defines for RIGHT_PULSE: GPIOB.4 with pinCMx 17 on package pin 52 */
// pins affected by this interrupt request:["RIGHT_PULSE","LEFT_PULSE"]
#define PORTB_INT_IRQN                                          (GPIOB_INT_IRQn)
#define PORTB_INT_IIDX                          (DL_INTERRUPT_GROUP1_IIDX_GPIOB)
#define PORTB_RIGHT_PULSE_IIDX                               (DL_GPIO_IIDX_DIO4)
#define PORTB_RIGHT_PULSE_PIN                                    (DL_GPIO_PIN_4)
#define PORTB_RIGHT_PULSE_IOMUX                                  (IOMUX_PINCM17)
/* Defines for LEFT_PULSE: GPIOB.5 with pinCMx 18 on package pin 53 */
#define PORTB_LEFT_PULSE_IIDX                                (DL_GPIO_IIDX_DIO5)
#define PORTB_LEFT_PULSE_PIN                                     (DL_GPIO_PIN_5)
#define PORTB_LEFT_PULSE_IOMUX                                   (IOMUX_PINCM18)
/* Defines for RIGHT_DIR: GPIOB.6 with pinCMx 23 on package pin 58 */
#define PORTB_RIGHT_DIR_PIN                                      (DL_GPIO_PIN_6)
#define PORTB_RIGHT_DIR_IOMUX                                    (IOMUX_PINCM23)
/* Defines for LEFT_DIR: GPIOB.7 with pinCMx 24 on package pin 59 */
#define PORTB_LEFT_DIR_PIN                                       (DL_GPIO_PIN_7)
#define PORTB_LEFT_DIR_IOMUX                                     (IOMUX_PINCM24)
/* Defines for LCD_RST: GPIOB.16 with pinCMx 33 on package pin 4 */
#define PORTB_LCD_RST_PIN                                       (DL_GPIO_PIN_16)
#define PORTB_LCD_RST_IOMUX                                      (IOMUX_PINCM33)
/* Defines for LCD_DC: GPIOB.17 with pinCMx 43 on package pin 14 */
#define PORTB_LCD_DC_PIN                                        (DL_GPIO_PIN_17)
#define PORTB_LCD_DC_IOMUX                                       (IOMUX_PINCM43)
/* Defines for LCD_CS: GPIOB.20 with pinCMx 48 on package pin 19 */
#define PORTB_LCD_CS_PIN                                        (DL_GPIO_PIN_20)
#define PORTB_LCD_CS_IOMUX                                       (IOMUX_PINCM48)
/* Defines for GRAY_BIT6: GPIOB.24 with pinCMx 52 on package pin 23 */
#define PORTB_GRAY_BIT6_PIN                                     (DL_GPIO_PIN_24)
#define PORTB_GRAY_BIT6_IOMUX                                    (IOMUX_PINCM52)
/* Defines for GRAY_BIT7: GPIOB.23 with pinCMx 51 on package pin 22 */
#define PORTB_GRAY_BIT7_PIN                                     (DL_GPIO_PIN_23)
#define PORTB_GRAY_BIT7_IOMUX                                    (IOMUX_PINCM51)
/* Defines for GRAY_BIT8: GPIOB.19 with pinCMx 45 on package pin 16 */
#define PORTB_GRAY_BIT8_PIN                                     (DL_GPIO_PIN_19)
#define PORTB_GRAY_BIT8_IOMUX                                    (IOMUX_PINCM45)
/* Defines for GRAY_BIT9: GPIOB.18 with pinCMx 44 on package pin 15 */
#define PORTB_GRAY_BIT9_PIN                                     (DL_GPIO_PIN_18)
#define PORTB_GRAY_BIT9_IOMUX                                    (IOMUX_PINCM44)
/* Defines for GRAY_BIT11: GPIOB.13 with pinCMx 30 on package pin 1 */
#define PORTB_GRAY_BIT11_PIN                                    (DL_GPIO_PIN_13)
#define PORTB_GRAY_BIT11_IOMUX                                   (IOMUX_PINCM30)
/* Defines for HEATER: GPIOB.0 with pinCMx 12 on package pin 47 */
#define PORTB_HEATER_PIN                                         (DL_GPIO_PIN_0)
#define PORTB_HEATER_IOMUX                                       (IOMUX_PINCM12)
/* Defines for LCD_SCL: GPIOB.9 with pinCMx 26 on package pin 61 */
#define PORTB_LCD_SCL_PIN                                        (DL_GPIO_PIN_9)
#define PORTB_LCD_SCL_IOMUX                                      (IOMUX_PINCM26)



/* clang-format on */

void SYSCFG_DL_init(void);
void SYSCFG_DL_initPower(void);
void SYSCFG_DL_GPIO_init(void);
void SYSCFG_DL_SYSCTL_init(void);
void SYSCFG_DL_SYSCTL_CLK_init(void);
void SYSCFG_DL_PWM_0_init(void);
void SYSCFG_DL_PWM_1_init(void);
void SYSCFG_DL_PWM_2_init(void);
void SYSCFG_DL_TIMER_1_init(void);
void SYSCFG_DL_TIMER_2_init(void);
void SYSCFG_DL_TIMER_G8_init(void);
void SYSCFG_DL_TIMER_G12_init(void);
void SYSCFG_DL_UART_0_init(void);
void SYSCFG_DL_UART_1_init(void);
void SYSCFG_DL_UART_2_init(void);
void SYSCFG_DL_UART_3_init(void);
void SYSCFG_DL_SPI_0_init(void);
void SYSCFG_DL_ADC12_0_init(void);
void SYSCFG_DL_DMA_init(void);

void SYSCFG_DL_SYSTICK_init(void);

bool SYSCFG_DL_saveConfiguration(void);
bool SYSCFG_DL_restoreConfiguration(void);

#ifdef __cplusplus
}
#endif

#endif /* ti_msp_dl_config_h */
