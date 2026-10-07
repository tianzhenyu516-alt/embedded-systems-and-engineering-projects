#ifndef __MY_USART2_H__
#define __MY_USART2_H__

#include "sys.h"
#define USART2_GPIO_PIN_TX   GPIO_Pin_2
#define USART2_GPIO_PIN_RX   GPIO_Pin_3

extern u16 USART2_RxCounter;      

extern char USART2_RxBuff[1024];
extern void u2_TxData(unsigned char *data);
void My_USART2(void);
void u2_printf(char* fmt,...);

#endif

