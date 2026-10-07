#ifndef _GPS_H//预编译
#define _GPS_H
#include "sys.h" 

__packed typedef struct  
{										    

	u32 latitude;				//纬度 分扩大100000倍,实际要除以100000
	u8 nshemi;					//北纬/南纬,N:北纬;S:南纬				  
	u32 longitude;			    //经度 分扩大100000倍,实际要除以100000
	u8 ewhemi;					//东经/西经,E:东经;W:西经
}nmea_msg;
 

typedef struct Data
{
	
	float latitude;//纬度
	char N_S;//南北
	float longitude;//经度
	char E_W;//东西

}Data;

    
void NMEA_GNRMC_Analysis(nmea_msg *gpsx,u8 *buf);

void get_gps();




#endif
