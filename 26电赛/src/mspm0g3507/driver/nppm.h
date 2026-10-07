#ifndef __NPPM_H
#define __NPPM_H




void PPM_Init(void);


extern mppm ppm_rc;

#endif



//	switch (DL_Interrupt_getPendingGroup(DL_INTERRUPT_GROUP_1)) 
//	{
//		case PORTB_INT_IIDX:
//		{			
//			if(DL_GPIO_getEnabledInterruptStatus(PORTB_PORT, PORTB_RIGHT_PULSE_PIN))
//			{
//				QEI0_IRQHandler();
//				DL_GPIO_clearInterruptStatus(PORTB_PORT, PORTB_RIGHT_PULSE_PIN);
//			}		
//			
//			if(DL_GPIO_getEnabledInterruptStatus(PORTB_PORT, PORTB_LEFT_PULSE_PIN))
//			{
//				QEI1_IRQHandler();
//				DL_GPIO_clearInterruptStatus(PORTB_PORT, PORTB_LEFT_PULSE_PIN);
//			}	
//		}
//		break;
//		case PORTA_INT_IIDX:
//		{			
//			if(DL_GPIO_getEnabledInterruptStatus(PORTA_PORT, PORTA_PPM_PIN))
//			{
//				nPPM_Handler();
//				DL_GPIO_clearInterruptStatus(PORTA_PORT, PORTA_PPM_PIN);
//			}			
//		}
//		break;
//	}


