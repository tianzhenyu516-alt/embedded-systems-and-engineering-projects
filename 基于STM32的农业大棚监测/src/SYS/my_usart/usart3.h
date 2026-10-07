#ifndef __USART3_H
#define __USART3_H
#include "stdio.h"
#include "sys.h"

#define USART3_MAX_RECV_LEN		400					//最大接收缓存字节数
#define USART3_MAX_SEND_LEN		400					//最大发送缓存字节数
#define USART3_RX_EN 			1					//0,不接收;1,接收.
// 接收数组大小
extern u8  USART3_RX_BUF[USART3_MAX_RECV_LEN]; 		//接收缓冲,最大USART3_MAX_RECV_LEN字节
extern u8  USART3_TX_BUF[USART3_MAX_SEND_LEN]; 		//发送缓冲,最大USART3_MAX_SEND_LEN字节
extern vu16 USART3_RX_STA;   						//接收数据状态
extern float WindVelocity;//风速
void Usart3_Init(unsigned int baud);
void Usart_SendByte( USART_TypeDef * pUSARTx, uint8_t ch);
void Usart_SendBytes( USART_TypeDef * pUSARTx, uint8_t *Buffer, uint8_t Length);
void Usart_SendString( USART_TypeDef * pUSARTx, char *str);
uint16_t Crc16(uint8_t *ptr, uint32_t len);
void SnowRx_Handel(void);
void u3_printf(char* fmt,...);
void WindRx_Handel(void);
#endif


