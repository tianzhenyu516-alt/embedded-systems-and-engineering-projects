/***************************************************************************
  工程名称：汕头大学可穿戴式心电仪
	完成功能：信号采集与数据处理
	
****************************************************************************/

#include "stm32f10x.h"
#include "usart1.h"
#include "adc.h"
#include "math.h"
#include "change.h"


extern __IO u16 BUF1[100];  //缓冲1区
extern __IO u16 BUF2[100];  //缓冲2区


/**********************************DMA标志位******************************/
#define BUF_Entrance 5
#define BUF1_store_Finish 0
#define BUF1_filter_Finish 1
#define BUF2_store_Finish 2
#define BUF2_filter_Finish 3

extern __IO u8 Data_flag;
extern __IO u8 DMA_flag;     

#define L 100
#define N 11
#define M 5

__IO u16 i=0,j;

/*********************************滤波器数组*******************************/
__IO float buf_N[N]={0};                   //SG平滑滤波数组
__IO float IIR_Filter_Data[100];           //缓存数组，储存滤波之后的时域信号 float类型
__IO float SG_Filter_Data[100];            //SG平滑之后数据
__IO int   Send_int_Data[100];             //转换为int类型数据
__IO char  Send_char_Data[5];              //发送数组


__IO float w0[3]={0};
__IO float w1[3]={0};

__IO float x0=0,x1=0;
__IO float y0=0,y1=0;



/*******************************SG_Filter*****************************/
//N=11 D=2
const float B[N][N]={
  {  0.580420,  0.377622,  0.209790,  0.076923, -0.020979, -0.083916, -0.111888, -0.104895, -0.062937,  0.013986,  0.125874},
	{  0.377622,  0.278322,  0.193007,  0.121678,  0.064336,  0.020979, -0.008392, -0.023776, -0.025175, -0.012587,  0.013986},
	{  0.209790,  0.193007,  0.173893,  0.152448,  0.128671,  0.102564,  0.074126,  0.043357,  0.010256, -0.025175, -0.062937},
	{  0.076923,  0.121678,  0.152448,  0.169231,  0.172028,  0.160839,  0.135664,  0.096503,  0.043357, -0.023776, -0.104895},
	{ -0.020979,  0.064336,  0.128671,  0.172028,  0.194406,  0.195804,  0.176224,  0.135664,  0.074126, -0.008392, -0.111888},
	{ -0.083916,  0.020979,  0.102564,  0.160839,  0.195804,  0.207459,  0.195804,  0.160839,  0.102564,  0.020979, -0.083916},
	{ -0.111888, -0.008392,  0.074126,  0.135664,  0.176224,  0.195804,  0.194406,  0.172028,  0.128671,  0.064336, -0.020979},
	{ -0.104895, -0.023776,  0.043357,  0.096503,  0.135664,  0.160839,  0.172028,  0.169231,  0.152448,  0.121678,  0.076923},
	{ -0.062937, -0.025175,  0.010256,  0.043357,  0.074126,  0.102564,  0.128671,  0.152448,  0.173893,  0.193007,  0.209790},
	{  0.013986, -0.012587, -0.025175, -0.023776, -0.008392,  0.020979,  0.064336,  0.121678,  0.193007,  0.278322,  0.377622},
	{  0.125874,  0.013986, -0.062937, -0.104895, -0.111888, -0.083916, -0.020979,  0.076923,  0.209790,  0.377622,  0.580420}
};



/******************************50hz_IIR_Fnotch_Filter**************************/
const float IIR_50Notch_B[3] = {
    0.9023977442,
	 -0.5577124773,
	  0.9023977442
};

const float IIR_50Notch_A[3] = {
	  1,
	 -0.5577124773,
	  0.8047954884
};



/*****************************0.3Hz_IIR__High_Filter****************************/
const float Gain=0.99468273;
const float IIR_High_B[3]={
         1,
        -2,
         1   
};

const float IIR_High_A[3]={
         1,
        -1.9833718117,
         0.9839372834
};



void IIR_Reset()
{
   for(i=0;i<3;i--)
 	 {
     w0[i]=0;
		 w1[i]=0;
   }
	  x0=0;
	  y0=0;
	  x1=0;
	  y1=0;	 
}



void DelayMs(unsigned int ms)
{
	unsigned int i;
	while(ms--)
	{
		for(i=0;i<7200;i++);
	}
}


void First_filter_buf1(void)
{
	 for(i=0;i<100;i++)
	 {
			x0=(float)BUF1[i]/4096*3.3-1.23;   // 读取转换的AD值	
			x0=-x0;   //电压数值翻转
		 
			w0[0]=IIR_50Notch_A[0]*x0-IIR_50Notch_A[1]*w0[1]-IIR_50Notch_A[2]*w0[2];
			y0=IIR_50Notch_B[0]*w0[0]+IIR_50Notch_B[1]*w0[1]+IIR_50Notch_B[2]*w0[2];
			 
			w1[0]=IIR_High_A[0]*y0-IIR_High_A[1]*w1[1]-IIR_High_A[2]*w1[2];
			y1=Gain*(IIR_High_B[0]*w1[0]+IIR_High_B[1]*w1[1]+IIR_High_B[2]*w1[2]);
			 
			IIR_Filter_Data[i]=y1;         //缓存数组储存滤波之后的信号 
			 
			w0[2]=w0[1];
			w0[1]=w0[0];
			w1[2]=w1[1];
			w1[1]=w1[0];             
	}
	for(i=0;i<=M;i++)            //第0到M，一共M+1个点
  {
		for(j=0;j<N;j++)
		{
      SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][i]*IIR_Filter_Data[j];
		}
  }
	for(i=0;i<N;i++)            //将数据放入缓存数组中
	{
     buf_N[0]=buf_N[1];
		 buf_N[1]=buf_N[2];
		 buf_N[2]=buf_N[3];
		 buf_N[3]=buf_N[4];
		 buf_N[4]=buf_N[5];
		 buf_N[5]=buf_N[6];
		 buf_N[6]=buf_N[7];
		 buf_N[7]=buf_N[8];
		 buf_N[8]=buf_N[9];      //数据移位
		 buf_N[9]=buf_N[10];
	   buf_N[10]=IIR_Filter_Data[i];	
  }
	for(i=M+1;i<L-M;i++)            //第M+1到L-1，一共L-M-1个点
  {
		
    for(j=0;j<N;j++)
		{
      SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][M]*buf_N[j];
		}
		buf_N[0]=buf_N[1];
		buf_N[1]=buf_N[2];
		buf_N[2]=buf_N[3];
		buf_N[3]=buf_N[4];
		buf_N[4]=buf_N[5];
		buf_N[5]=buf_N[6];
		buf_N[6]=buf_N[7];
		buf_N[7]=buf_N[8];
		buf_N[8]=buf_N[9];     //数据移位
		buf_N[9]=buf_N[10];
		buf_N[10]=IIR_Filter_Data[i+M]; 
	}
}	


void Else_filter_buf1(void)
{
	  for(i=0;i<100;i++)
	 {
			x0=(float)BUF1[i]/4096*3.3-1.23;   // 读取转换的AD值	
			x0=-x0;   //电压数值翻转
			 
			w0[0]=IIR_50Notch_A[0]*x0-IIR_50Notch_A[1]*w0[1]-IIR_50Notch_A[2]*w0[2];
			y0=IIR_50Notch_B[0]*w0[0]+IIR_50Notch_B[1]*w0[1]+IIR_50Notch_B[2]*w0[2];
			 
			w1[0]=IIR_High_A[0]*y0-IIR_High_A[1]*w1[1]-IIR_High_A[2]*w1[2];
			y1=Gain*(IIR_High_B[0]*w1[0]+IIR_High_B[1]*w1[1]+IIR_High_B[2]*w1[2]);
			 
			IIR_Filter_Data[i]=y1;         //缓存数组储存滤波之后的信号 
			 
			w0[2]=w0[1];
			w0[1]=w0[0];
			w1[2]=w1[1];
			w1[1]=w1[0];             
	 }
	for(i=0;i<L;i++)            //第0到M，一共M+1个点
  {
		  buf_N[0]=buf_N[1];
		  buf_N[1]=buf_N[2];
		  buf_N[2]=buf_N[3];
		  buf_N[3]=buf_N[4];
		  buf_N[4]=buf_N[5];
		  buf_N[5]=buf_N[6];
		  buf_N[6]=buf_N[7];
		  buf_N[7]=buf_N[8];
		  buf_N[8]=buf_N[9];    //数据移位
		  buf_N[9]=buf_N[10];
	    buf_N[10]=IIR_Filter_Data[i];	
      for(j=0;j<N;j++)
		  {
        SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][M]*buf_N[j];
		  } 
	}
}	

void First_filter_buf2(void)
{
	 for(i=0;i<100;i++)
	 {
			x0=(float)BUF2[i]/4096*3.3-1.23;   // 读取转换的AD值	
			x0=-x0;   //电压数值翻转
		 
			w0[0]=IIR_50Notch_A[0]*x0-IIR_50Notch_A[1]*w0[1]-IIR_50Notch_A[2]*w0[2];
			y0=IIR_50Notch_B[0]*w0[0]+IIR_50Notch_B[1]*w0[1]+IIR_50Notch_B[2]*w0[2];
			 
			w1[0]=IIR_High_A[0]*y0-IIR_High_A[1]*w1[1]-IIR_High_A[2]*w1[2];
			y1=Gain*(IIR_High_B[0]*w1[0]+IIR_High_B[1]*w1[1]+IIR_High_B[2]*w1[2]);
			 
			IIR_Filter_Data[i]=y1;         //缓存数组储存滤波之后的信号 
			 
			w0[2]=w0[1];
			w0[1]=w0[0];
			w1[2]=w1[1];
			w1[1]=w1[0];             
	}
	for(i=0;i<=M;i++)            //第0到M，一共M+1个点
  {
		for(j=0;j<N;j++)
		{
      SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][i]*IIR_Filter_Data[j];
		}
  }
	for(i=0;i<N;i++)            //将数据放入缓存数组中
	{
     buf_N[0]=buf_N[1];
		 buf_N[1]=buf_N[2];
		 buf_N[2]=buf_N[3];
		 buf_N[3]=buf_N[4];
		 buf_N[4]=buf_N[5];
		 buf_N[5]=buf_N[6];
		 buf_N[6]=buf_N[7];
		 buf_N[7]=buf_N[8];
		 buf_N[8]=buf_N[9];      //数据移位
		 buf_N[9]=buf_N[10];
	   buf_N[10]=IIR_Filter_Data[i];	
  }
	for(i=M+1;i<L-M;i++)            //第M+1到L-1，一共L-M-1个点
  {
		
    for(j=0;j<N;j++)
		{
      SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][M]*buf_N[j];
		}
		buf_N[0]=buf_N[1];
		buf_N[1]=buf_N[2];
		buf_N[2]=buf_N[3];
		buf_N[3]=buf_N[4];
		buf_N[4]=buf_N[5];
		buf_N[5]=buf_N[6];
		buf_N[6]=buf_N[7];
		buf_N[7]=buf_N[8];
		buf_N[8]=buf_N[9];     //数据移位
		buf_N[9]=buf_N[10];
		buf_N[10]=IIR_Filter_Data[i+M]; 
	}
}	


void Else_filter_buf2(void)
{
	  for(i=0;i<100;i++)
	 {
			x0=(float)BUF2[i]/4096*3.3-1.23;   // 读取转换的AD值	
			x0=-x0;   //电压数值翻转
			 
			w0[0]=IIR_50Notch_A[0]*x0-IIR_50Notch_A[1]*w0[1]-IIR_50Notch_A[2]*w0[2];
			y0=IIR_50Notch_B[0]*w0[0]+IIR_50Notch_B[1]*w0[1]+IIR_50Notch_B[2]*w0[2];
			 
			w1[0]=IIR_High_A[0]*y0-IIR_High_A[1]*w1[1]-IIR_High_A[2]*w1[2];
			y1=Gain*(IIR_High_B[0]*w1[0]+IIR_High_B[1]*w1[1]+IIR_High_B[2]*w1[2]);
			 
			IIR_Filter_Data[i]=y1;         //缓存数组储存滤波之后的信号 
			 
			w0[2]=w0[1];
			w0[1]=w0[0];
			w1[2]=w1[1];
			w1[1]=w1[0];             
	 }
	for(i=0;i<L;i++)            //第0到M，一共M+1个点
  {
		  buf_N[0]=buf_N[1];
		  buf_N[1]=buf_N[2];
		  buf_N[2]=buf_N[3];
		  buf_N[3]=buf_N[4];
		  buf_N[4]=buf_N[5];
		  buf_N[5]=buf_N[6];
		  buf_N[6]=buf_N[7];
		  buf_N[7]=buf_N[8];
		  buf_N[8]=buf_N[9];    //数据移位
		  buf_N[9]=buf_N[10];
	    buf_N[10]=IIR_Filter_Data[i];	
      for(j=0;j<N;j++)
		  {
        SG_Filter_Data[i]=SG_Filter_Data[i]+B[j][M]*buf_N[j];
		  } 
	}
}	
void send_data(unsigned char ascii_code)
{
  USART_SendData(USART1,ascii_code);
  while(USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET){}								
}


int main(void)
{	
	u8 ID=1;
	Data_flag=0;
	USART1_Config();
	ADC1_Init();
	DMA_flag=BUF_Entrance;    //初始化DMA缓冲区切换标识位
	IIR_Reset();
	while(1)
	{
		/****************获取标志位，1管道储存完成，处理管道1数据******************/
		if(DMA_flag==BUF1_store_Finish)	    
	  {
			 if(ID==1)
			 {
				 
		     First_filter_buf1();       //处理缓冲区1的数据
         send_data('@');				 
	       for(i=0;i<L-M;i++)
         {
					  Send_int_Data[i]=(int)(SG_Filter_Data[i]*1000);
					  int_to_char(Send_int_Data[i],Send_char_Data);
					  for(j=0;j<5;j++)
            {
              send_data(Send_char_Data[j]);  				
            }
				    send_data('|');   			 
         }
			   send_data('$');			 			 
    	   for(i=10;i<100;i++)           //清零操作
			   {
				   IIR_Filter_Data[i]=0;
           SG_Filter_Data[i]=0;
         }
			   DMA_flag=BUF1_filter_Finish;
				 ID++;
	    }
			else
			{
				 Else_filter_buf1();       //处理缓冲区1的数据	
         send_data('@');				
	       for(i=0;i<L;i++)
         {	
					 Send_int_Data[i]=(int)(SG_Filter_Data[i]*1000);
					 int_to_char(Send_int_Data[i],Send_char_Data);	
           for(j=0;j<5;j++)
           {
            send_data(Send_char_Data[j]);  				
           }
				   send_data('|');         					 
         }
				 send_data('$');		   
    	   for(i=0;i<L;i++)      //清零操作
			   {
				  IIR_Filter_Data[i]=0;
          SG_Filter_Data[i]=0;
         }
			   DMA_flag=BUF1_filter_Finish;
				 ID++;    
      }
	 }
   /****************获取标志位，2管道储存完成，处理管道2数据******************/	 
	 if(DMA_flag==BUF2_store_Finish)        //缓冲区2存储满
	 {
			 if(ID==1)
			 {
         First_filter_buf2();                //处理缓冲区2的数据			 
				 send_data('@');				
	       for(i=0;i<L;i++)
         {	
					 Send_int_Data[i]=(int)(SG_Filter_Data[i]*1000);
					 int_to_char(Send_int_Data[i],Send_char_Data);	
					 for(j=0;j<5;j++)
					 {
						 send_data(Send_char_Data[j]);  				
					 }
					 send_data('|');         					 
        }
				send_data('$'); 			 
    	  for(i=0;i<L;i++)      //清零操作
			  {
				  IIR_Filter_Data[i]=0;
          SG_Filter_Data[i]=0;
        }
     	  DMA_flag=BUF2_filter_Finish;	
				ID++;
       }
		   else
		   {
			   Else_filter_buf2();                //处理缓冲区2的数						 
				 send_data('@');			 
				 for(i=0;i<100;i++)
				 {	
					 Send_int_Data[i]=(int)(SG_Filter_Data[i]*1000);
					 int_to_char(Send_int_Data[i],Send_char_Data);	
					 for(j=0;j<5;j++)
					 {
						 send_data(Send_char_Data[j]);  				
					 }
					 send_data('|');         					 
				 }
				 send_data('$');						
    	  for(i=0;i<100;i++)      //清零操作
			  {
				  IIR_Filter_Data[i]=0;
          SG_Filter_Data[i]=0;
        }
     	  DMA_flag=BUF2_filter_Finish;	
				ID++;
      }		
	  }
 } 
}



