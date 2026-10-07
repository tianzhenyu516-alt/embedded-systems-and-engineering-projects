oled_ShowNum(16*3,2*0,tempMax,2,16);	
keyNum=KEY_Scan(1);	//µÃµ½¼üÖµ
	
	   	if(keyNum)
		{						   
			switch(keyNum)
			{				 
				
				case KEY0_PRES:	
				//	LED1_ON;
				tempMax++;
				
					break;
				case KEY1_PRES:	
				tempMax--;
					break;
			case KEY2_PRES:	
					LED3_ON;
				oled_ShowNum(16*3,2*2,2,keyNum,16);
					break;
			}
		}
		else delay_ms(10);
		

			}