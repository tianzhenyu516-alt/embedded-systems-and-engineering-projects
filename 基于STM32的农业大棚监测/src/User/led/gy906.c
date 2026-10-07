#include "sys.h"

extern float tempx;
/*******************************************************************************
* Function Name  : Mlx90614_Configuration
* Description    : Mlx90614_Configuration
* Input          : None
* Output         : None
* Return         : None
*******************************************************************************/
void Mlx96014_Configuration(void)
{
    GPIO_InitTypeDef  GPIO_InitStructure;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB,ENABLE);

    GPIO_InitStructure.GPIO_Pin =  GPIO_Pin_10;//SCL
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_OD;
    GPIO_Init(GPIOB,&GPIO_InitStructure);

    GPIO_InitStructure.GPIO_Pin =  GPIO_Pin_11;//SDA
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_OD;
    GPIO_Init(GPIOB,&GPIO_InitStructure);
    SDA_H;
    SCL_H;
}


/*******************************************************************************
* Function Name  : SMBus_StartBit
* Description    : 在SMBus上生成START条件
* Input          : None
* Output         : None
* Return         : None
*******************************************************************************/
void SMBus_StartBit(void)
{
    SDA_H;               // Set SDA line
    SMBus_Delay(1);      // Wait a few microseconds
    SCL_H;               // Set SCK line
    SMBus_Delay(5);      // Generate bus free time between Stop
    SDA_L;               // Clear SDA line
    SMBus_Delay(10);     // Hold time after (Repeated) Start
       SMBus_Delay(2);      // Wait a few microseconds
 // Condition. After this period, the first clock is generated.
    //(Thd:sta=4.0us min)
    SCL_L;               // Clear SCK line
}
/*******************************************************************************
* Function Name  : SMBus_StopBit
* Description    : Generate STOP condition on SMBus
* Input          : None
* Output         : None
* Return         : None
*******************************************************************************/

void SMBus_StopBit(void)
{
    SCL_L;                // Clear SCK line
    SMBus_Delay(5);       // Wait a few microseconds
    SDA_L;                // Clear SDA line
    SMBus_Delay(5);       // Wait a few microseconds
    SCL_H;                // Set SCK line
    SMBus_Delay(10);      // Stop condition setup time(Tsu:sto=4.0us min)
    SDA_H;                // Set SDA line
}

/*******************************************************************************
* Function Name  : SMBus_SendByte
* Description    : 在SMBus上发送一个字节
* Input          : Tx_buffer
* Output         : None
* Return         : None
*******************************************************************************/
u8 SMBus_SendByte(u8 Tx_buffer)
{
    u8        Bit_counter;
    u8        Ack_bit;
    u8        bit_out;


    for(Bit_counter=8; Bit_counter; Bit_counter--)
    {
        if (Tx_buffer&0x80)
        {
            bit_out=1;       // If the current bit of Tx_buffer is 1 set bit_out
        }
        else
        {
            bit_out=0;      // else clear bit_out
        }
        SMBus_SendBit(bit_out);           // Send the current bit on SDA
        Tx_buffer<<=1;                    // Get next bit for checking
    }
    Ack_bit=SMBus_ReceiveBit();           // Get acknowledgment bit
    return        Ack_bit;
}

/*******************************************************************************
* Function Name  : SMBus_SendBit
* Description    : Send a bit on SMBus
* Input          : bit_out
* Output         : None
* Return         : None
*******************************************************************************/
void SMBus_SendBit(u8 bit_out)
{
    if(bit_out==0)
    {
        SDA_L;
    }
    else
    {
        SDA_H;
    }
    SMBus_Delay(2);                            // Tsu:dat = 250ns minimum
    SCL_H;                                     // Set SCK line
    SMBus_Delay(10);                           // High Level of Clock Pulse
    SCL_L;                                     // Clear SCK line
    SMBus_Delay(10);                           // Low Level of Clock Pulse
//        SMBUS_SDA_H();                       // Master release SDA line ,
    return;
}
/*******************************************************************************
* Function Name  : SMBus_ReceiveBit
* Description    : 在SMBus上接收一位
* Input          : None
* Output         : None
* Return         : Ack_bit
*******************************************************************************/
u8 SMBus_ReceiveBit(void)
{
    u8 Ack_bit;


    SDA_H;             //?????????,????
    SCL_H;             // Set SCL line
    SMBus_Delay(2);    // High Level of Clock Pulse
    if (SMBUS_SDA_PIN)
    {
        Ack_bit=1;
    }
    else
    {
        Ack_bit=0;
    }
    SCL_L;                    // Clear SCL line
    SMBus_Delay(4);           // Low Level of Clock Pulse
    return   Ack_bit;
}
/*******************************************************************************
* Function Name  : SMBus_ReceiveByte
* Description    : 在SMBus上接收一个字节
* Input          : ack_nack
* Output         : None
* Return         : RX_buffer
*******************************************************************************/
u8 SMBus_ReceiveByte(u8 ack_nack)
{
    u8        RX_buffer;
    u8        Bit_Counter;
    for(Bit_Counter=8; Bit_Counter; Bit_Counter--)
    {
        if(SMBus_ReceiveBit())         // Get a bit from the SDA line
        {
            RX_buffer <<= 1;           // If the bit is HIGH save 1  in RX_buffer
            RX_buffer |=0x01;
        }
        else
        {
            RX_buffer <<= 1;           // If the bit is LOW save 0 in RX_buffer
            RX_buffer &=0xfe;
        }
    }
    SMBus_SendBit(ack_nack);           // Sends acknowledgment bit
    return RX_buffer;
}


/*******************************************************************************
* Function Name  : SMBus_Delay
* Description    : 1us
* Input          : time
* Output         : None
* Return         : None
*******************************************************************************/
void SMBus_Delay(u16 time)
{
    u16 i, j;
    for (i=0; i<4; i++)
    {
        for (j=0; j<time; j++);
    }
}

/*******************************************************************************
 * Function Name  : SMBus_ReadMemory
 * Description    : 从RAM/EEPROM读取数据
 * Input          : slaveAddress, command
 * Output         : None
 * Return         : Data
*******************************************************************************/
u16 SMBus_ReadMemory(u8 slaveAddress, u8 command)
{
    u16 data;               // Data storage (DataH:DataL)
    u8 Pec;                 // PEC byte storage
    u8 DataL=0;             // Low data byte storage
    u8 DataH=0;             // High data byte storage
    u8 arr[6];              // Buffer for the sent bytes
    u8 PecReg;              // Calculated PEC byte storage
    u8 ErrorCounter;        // Defines the number of the attempts for communication with MLX90614


    ErrorCounter=0x00;                                // Initialising of ErrorCounter
    slaveAddress <<= 1;        //2-7???????

    do
    {
repeat:
        SMBus_StopBit();                //If slave send NACK stop comunication
        --ErrorCounter;                 //Pre-decrement ErrorCounter
        if(!ErrorCounter)               //ErrorCounter=0?
        {
            break;                      //Yes,go out from do-while{}
        }

        SMBus_StartBit();               //Start condition
        if(SMBus_SendByte(slaveAddress))//Send SlaveAddress ???Wr=0????????
        {
            goto  repeat;               //Repeat comunication again
        }
        if(SMBus_SendByte(command))     //Send command
        {
            goto    repeat;             //Repeat comunication again
        }

        SMBus_StartBit();                //Repeated Start condition
        if(SMBus_SendByte(slaveAddress+1))  //Send SlaveAddress ???Rd=1????????
        {
            goto        repeat;           //Repeat comunication again
        }

        DataL = SMBus_ReceiveByte(ACK);   //Read low data,master must send ACK
        DataH = SMBus_ReceiveByte(ACK);   //Read high data,master must send ACK
        Pec = SMBus_ReceiveByte(NACK);    //Read PEC byte, master must send NACK
        SMBus_StopBit();                  //Stop condition

        arr[5] = slaveAddress;
        arr[4] = command;
        arr[3] = slaveAddress+1;         //Load array arr
        arr[2] = DataL;
        arr[1] = DataH;
        arr[0] = 0;
        PecReg=PEC_Calculation(arr);     //Calculate CRC
    }
    while(PecReg != Pec);                //If received and calculated CRC are equal go out from do-while{}
    data = (DataH<<8) | DataL;       //data=DataH:DataL
    return data;
}

/*******************************************************************************
* Function Name  : PEC_calculation
* Description    : 计算接收字节的PEC
* Input          : pec[]
* Output         : None
* Return         : pec[0]-this byte contains calculated crc value
*******************************************************************************/
u8 PEC_Calculation(u8 pec[])
{
    u8 crc[6];
    u8 BitPosition=47;
    u8 shift;
    u8 i;
    u8 j;
    u8 temp;
    do
    {
        /*Load pattern value 0x000000000107*/
        crc[5]=0;
        crc[4]=0;
        crc[3]=0;
        crc[2]=0;
        crc[1]=0x01;
        crc[0]=0x07;
        /*Set maximum bit position at 47 ( six bytes byte5...byte0,MSbit=47)*/
        BitPosition=47;
        /*Set shift position at 0*/
        shift=0;
        /*Find first "1" in the transmited message beginning from the MSByte byte5*/
        i=5;
        j=0;
        while((pec[i]&(0x80>>j))==0 && i>0)
        {
            BitPosition--;
            if(j<7)
            {
                j++;
            }
            else
            {
                j=0x00;
                i--;
            }
        }/*End of while */


        /*Get shift value for pattern value*/
        shift=BitPosition-8;
        /*Shift pattern value */
        while(shift)
        {
            for(i=5; i<0xFF; i--)
            {
                if((crc[i-1]&0x80) && (i>0))
                {
                    temp=1;
                }
                else
                {
                    temp=0;
                }
                crc[i]<<=1;
                crc[i]+=temp;
            }/*End of for*/
            shift--;
        }/*End of while*/
        /*Exclusive OR between pec and crc*/
        for(i=0; i<=5; i++)
        {
            pec[i] ^=crc[i];
        }/*End of for*/
    }
    while(BitPosition>8); /*End of do-while*/

    return pec[0];
}

/*******************************************************************************
* Function Name  : SMBus_ReadTemp
* Description    : 计算并返回温度
* Input          : None
* Output         : None
* Return         : SMBus_ReadMemory(0x00, 0x07)*0.02-273.15
*******************************************************************************/
void SMBus_ReadTemp(void)
{
   
	//tempx=SMBus_ReadMemory(SA, RAM_ACCESS|RAM_TOBJ1)*0.02-273.15;
//	if(tag==1){
//			
//		
//			if(tempx>sensor1Max){
//					
//						LED2_ON;		
//			}else{
//						
//						LED2_OFF;
//			}
//			
//			
//				}
	//oled_ShowNum(16*3-8,2*1,(int)tempx,2,16); 

}




/*********************************END OF FILE*********************************/
