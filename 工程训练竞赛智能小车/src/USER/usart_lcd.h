#ifndef __USART_LCD_H
#define __USART_LCD_H

void HMI_send_string(char* name, char* showdata);
void HMI_send_number(char* name, int num);
void HMI_send_float(char* name, float num);
void HMI_send(void);
void usar_lcd_init(void);

#endif

