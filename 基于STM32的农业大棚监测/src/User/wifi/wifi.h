#ifndef __WIFI_H__
#define __WIFI_H__

#include "sys.h"
#define WiFi_RxCounter    USART2_RxCounter    
#define WiFi_RX_BUF       USART2_RxBuff 

//#define ID   "wlkj"                     
//#define PASSWORD   "12345678"  

#define ID   "wlkj"                     
#define PASSWORD   "66666666" 

char WIFI_Config0(int time);
char WIFI_Config(int time,char*cmd,char*response);
char WIFI_Router(int time);
char WIFI_ConnectTCP(int time);
char WIFI_Connect(void);

#endif

