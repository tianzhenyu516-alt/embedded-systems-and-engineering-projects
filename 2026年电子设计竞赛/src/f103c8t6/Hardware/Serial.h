#ifndef __SERIAL_H__
#define __SERIAL_H__

extern char RXDat_Pack[200];
void Init_Serial(void);
void Serial_SendByte(uint8_t Byte);
void Serial_SendShuzu(uint8_t *Shuzu,uint8_t Length);
void Sreial_SendString(char *String);
void Sreial_SendNum(uint16_t Num,uint8_t Length);
uint8_t Serial_GetRxDat(void);
void Serial_SendPack(uint8_t *Shuzu);
float Get_Data(void);
#endif
