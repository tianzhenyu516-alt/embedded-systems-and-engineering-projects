#ifndef __CODE_H__
#define __CODE_H__
#include "stm32f4xx.h"                  // Device header


extern u8 Code_RxPacket[];
extern u8 Code_TxPacket[];
extern u8 Code_RxFlag;
extern u8 ckbz;
u8 Code_GetRxFlag(void);
void Code_Init(void);
void Code_SendArray(u8 *Array, s16 Length);
void USART2_IRQHandler(void);
void Code_Packet_Init(void);
void Code_SendPacket(void);
void Code_SendByte(u8 Byte);
void Over_Grab(void);
void Red_Column(void);
void Green_Column(void);
void Blue_Column(void);
void Red_Ring(void);
void Green_Ring(void);
void Blue_Ring(void);
void Identifysend(int x);

#endif


