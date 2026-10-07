#ifndef __NQEI_H
#define __NQEI_H

#define quadrature_decoder_enable 1//正交解码使能

void QEI0_IRQHandler(void);
void QEI1_IRQHandler(void);

void Encoder_Init(void);
float get_left_motor_speed(void);
float get_right_motor_speed(void);

extern encoder NEncoder;

#endif




