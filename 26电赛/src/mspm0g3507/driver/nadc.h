#ifndef __NADC_H
#define __NADC_H

void nADC_Init(void);
void adc_statemachine(void);

float get_battery_voltage(void);
void battery_voltage_detection(void);

extern low_voltage vbat;


#endif




