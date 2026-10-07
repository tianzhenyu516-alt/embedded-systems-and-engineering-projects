#include "sys.h" 


//	u8 temp;
//	u8 temper0; 
//	u8 temper1;	
//	u8 humi0;
//u8 humi1;
// int LightSensor1 = 0;
//  	int Smog_ppm = 0;
// int Turang = 0;
//float Yudi;
//void oled_show();
//void oled_display();

////初始化
//void Sensors_Init(void)
//{ 
//		if(wifi_)
//				Ali_MsessageInit();
//    if(ds18b20)
//       DS18B20_Init();
//    if(mq2)
//       MQ2_Init();
//    if(LightSensor)
//       	Light_Init(); 		
//		 if(turang)
//       	TuRang_Init(); 
//		if(dht11)
//       	DHT11_Init(); 
//     if(yudi)
//			 //yudi_Init();
//		   DO_Init();
//       //   gpio_read();
//}

////判断是否是否用wifi上网
//void push(){

//if(wifi_){
// mqtt_Content();

//}else{
// oled_display();
//}

//}

////直接显示数据
//void oled_display()
//{
//	//oled_show();//显示内容
//    
//        if(dht11){
//          //  DHT11_Read_Data(&dht11_temp,&dht11_humi);
//					temp=DHT11_Read_Data(&temper0,&temper1,&humi0,&humi1);
//				oled_ShowNum(16*3,2*0,temper0,2,16);
//				oled_ShowString(16*4,2*0,(u8 *)".",16);
//				oled_ShowNum(16*5,2*0,temper1,1,16);
//				}			
//				
//        if(ds18b20){
//				BEEP_OFF;
//				}
//           
//		
//         if(LightSensor){
//					
//							LightSensor1 =100-(Get_Guangzhao()/100*2.5);  
//					 
//					// u1_printf("LightSensor1 %d \r\n",  Get_Guangzhao());
//							oled_ShowNum(16*3-8,2*1,LightSensor1,4,16);
//							oled_ShowString(16*5-8,2*1,(u8 *)"%",16);  
//				 }					 
//         if(mq2){					 		
//									Smog_ppm =(Get_Adc2_mq()-1500)/20;
//									oled_ShowNum(16*3,2*2,Smog_ppm,6,16);
//								}
//				 if(turang){
//					 		
//						  Turang =100-(Get_Turang()/100*2);
//						//	u1_printf("Smog_ppm %d \r\n",  Turang);
//							oled_ShowNum(16*3,2*0, Turang,6,16);
//					 }
//				 if(yudi){
//					 // Yudi=(float)(Get_yudi()*(3.3/4096));
//					 	//	u1_printf("雨水 %f \r\n",  Yudi);
//           // oled_ShowNum(16*1,2*0,Yudi,6,16);
//            if(gpio_read())
//					  {
//							//oled_Clear();
//						oled_ShowString(16*1,2*1,"noty",16);	
//						}		
//						else
//							//oled_Clear();
//							oled_ShowString(16*1,2*1,"hava",16);
//				 }
// }

////直接显示数据
//void mqtt_display(){

//	oled_show();//显示内容
//    
//        if(dht11){
//          //  DHT11_Read_Data(&dht11_temp,&dht11_humi);
//				temp=DHT11_Read_Data(&temper0,&temper1,&humi0,&humi1);
//				oled_ShowNum(16*3,2*1,temper0,2,16);
//				oled_ShowString(16*4,2*1,(u8 *)".",16);
//				oled_ShowNum(16*5,2*1,temper1,1,16);

//					}

//    }


////显示函数
//	void oled_show()
//{
//	
//				//
////				oled_ShowCHinese(16*1,2*0,0);
////				oled_ShowCHinese(16*2,2*0,1);
////				oled_ShowCHinese(16*3,2*0,2);
////				oled_ShowCHinese(16*4,2*0,3);
//				//湿度 第一行
//				oled_ShowCHinese(16*0,2*0,4);
//				oled_ShowCHinese(16*1,2*0,5);
//				oled_ShowString(16*2,2*0,(u8 *)":",16);
//				//光照 第二行
//				oled_ShowCHinese(16*0,2*1,6);
//				oled_ShowCHinese(16*1,2*1,7);
//				oled_ShowString(16*2,2*1,(u8 *)":",16);
//				//CO2 第三行
//				oled_ShowString(16*0,2*2,(u8 *)"C02",16);
//				//oled_ShowCHinese(16*1,2*2,7);
//				oled_ShowString(16*2,2*2,(u8 *)":",16);
//}
uint16_t t=0;
float m;

//发送数据到上位机
void mqtt_sub(void)
	{
char tempxx[256];
			
		if(t>=65535){
		t=0;
		}
		m=t/655.35;
	sprintf(tempxx,"{\"sensor1\":%.1f}",m);  
	
		
						
								mqtt_PublishQs0(P_TOPIC_NAME,tempxx,strlen(tempxx));


}
