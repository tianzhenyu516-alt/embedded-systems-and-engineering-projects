#ifndef __OPENMV_H__
#define __OPENMV_H__

extern u8 Openmv_Column_RxPacket[];
extern u8 Openmv_Column_TxPacket[];
extern u8 Openmv_Annular_RxPacket[];
extern u8 Openmv_Annular_TxPacket[];
u8 Column_GetRxFlag(void);
u8 Annular_GetRxFlag(void);

void Openmv_Init(void);
void Openmv_SendByte(u8 Byte);
void Openmv_SendArray(u8 *Array, s16 Length);
void Openmv_Annular_SendPacket(void);
void Openmv_Column_SendPacket(void);
void Packet_Column_Init(void);
void Packet_Annular_Init(void);

void Receive_Send(void);//Ω” ‹∑¢ÀÕ



#endif


