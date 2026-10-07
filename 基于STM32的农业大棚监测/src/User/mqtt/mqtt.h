#ifndef __MQTT_H__
#define __MQTT_H__

#include "sys.h"
//mqtt

#define  DEVICENAME      "" 
#define  PRODUCTKEY      ""
#define  DEVICESECRE     "" 
#define  BAD     		"" 

//#define  DEVICESECRE_LEN      strlen(DEVICESECRE)

//#define  SUBSCRIBE_TOPIC         ""      
//#define  P_TOPIC_NAME            "/SmartWaterGlasses0329/Pub"    //需要发布的主题   
//阿里云
//#define  DEVICENAME      "" 
//#define  PRODUCTKEY      ""
//#define  DEVICESECRE     "" 
//#define  BAD     		 "" 

#define  DEVICESECRE_LEN      strlen(DEVICESECRE)

#define  SUBSCRIBE_TOPIC         ""    
#define  P_TOPIC_NAME            "SmarthomePub123"    //需要发布的主题  



#define  mqtt_TxData(x)       u2_TxData(x) 

extern char ServerIP[128];                                  
extern int  ServerPort;

extern unsigned char  mqtt_TxBuf[7][400];           
extern unsigned char *mqtt_TxInPtr;                            
extern unsigned char *mqtt_TxOutPtr;                           
extern unsigned char *mqtt_TxEndPtr;

extern unsigned char  mqtt_RxBuf[7][400];           
extern unsigned char *mqtt_RxInPtr;                            
extern unsigned char *mqtt_RxOutPtr;                           
extern unsigned char *mqtt_RxEndPtr;

extern unsigned char  mqtt_CMDBuf[7][400];              
extern unsigned char *mqtt_CMDInPtr;                               
extern unsigned char *mqtt_CMDOutPtr;                              
extern unsigned char *mqtt_CMDEndPtr; 

extern u8 Connect_flag;
extern u8 ConnectPack_flag; 
extern u8 SubscribePack_flag;
extern u8 Ping_flag;

void Mqtt_ConnectMessege(void);
void Ali_MsessageInit(void);
void MQTT_Buff_Init(void);
void mqtt_Ping(void);
void mqtt_PublishQs0(char *topic, char *data, int data_len);
void mqtt_Dealsetdata_Qs0(unsigned char *redata);
void mqtt_Content (void);




#endif

