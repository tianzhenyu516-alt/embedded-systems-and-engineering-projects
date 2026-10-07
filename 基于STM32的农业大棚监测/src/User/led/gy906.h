#ifndef __GY906_H
#define __GY906_H

#include "sys.h"



#define ACK           0 //应答信号
#define NACK          1 //否定应答
#define SA            0x00 //从设备地址
#define RAM_ACCESS    0x00 //内存访问命令
#define EEPROM_ACCESS 0x20 //EEPROM接入命令
#define RAM_TOBJ1     0x07 //eeprom中的To1地址
 
 
#define SDA_L     GPIO_ResetBits(GPIOB, GPIO_Pin_10)
#define SDA_H     GPIO_SetBits(GPIOB, GPIO_Pin_10)  
#define SCL_H     GPIO_SetBits(GPIOB, GPIO_Pin_11)
#define SCL_L     GPIO_ResetBits(GPIOB, GPIO_Pin_11)
 
 
#define SMBUS_SDA_PIN    GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_10) 
 
void SMBus_StartBit(void);
void SMBus_StopBit(void);
void SMBus_SendBit(u8);
u8 SMBus_SendByte(u8);
u8 SMBus_ReceiveBit(void);
u8 SMBus_ReceiveByte(u8);
void SMBus_Delay(u16);
void SMBus_Init(void);
u16 SMBus_ReadMemory(u8, u8);
u8 PEC_Calculation(u8*);
void SMBus_ReadTemp(void); 
void Mlx96014_Configuration(void);


#endif

