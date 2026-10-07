#ifndef _sg_filt_h_
#define _sg_filt_h_

#include "stm32f10x.h"

void filter_data(__IO float B[]);    //得到滤波矩阵
void SG_filter(__IO float mit[],__IO float y[]);

#define N 11      //滤波器的长度
#define D 3       //滤波器的阶数
#define M 5       //滤波器半长

#endif
