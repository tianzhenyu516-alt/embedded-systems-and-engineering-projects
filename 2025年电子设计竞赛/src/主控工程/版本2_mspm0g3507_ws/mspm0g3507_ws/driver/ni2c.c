#include "ti_msp_dl_config.h"
#include "stdbool.h"
#include "system.h"
#include "ni2c.h"




////************I2C write register **********************
//void I2C_WriteReg(uint8_t DevAddr,uint8_t reg_addr, uint8_t *reg_data, uint8_t count)
//{
//    unsigned char I2Ctxbuff[8] = {0x00};
//    I2Ctxbuff[0] = reg_addr;
//    unsigned char i, j = 1;
//    for (i = 0; i < count; i++) {
//        I2Ctxbuff[j] = reg_data[i];
//        j++;
//    }
//    //DL_I2C_flushControllerTXFIFO(I2C_0_INST);
//    DL_I2C_fillControllerTXFIFO(I2C_0_INST, &I2Ctxbuff[0], count + 1);
//    /* Wait for I2C to be Idle */
//    while (!(DL_I2C_getControllerStatus(I2C_0_INST) & DL_I2C_CONTROLLER_STATUS_IDLE));
//    DL_I2C_startControllerTransfer(I2C_0_INST, DevAddr,DL_I2C_CONTROLLER_DIRECTION_TX, count + 1);
//    while (DL_I2C_getControllerStatus(I2C_0_INST) & DL_I2C_CONTROLLER_STATUS_BUSY_BUS);
//    /* Wait for I2C to be Idle */
//    while (!(DL_I2C_getControllerStatus(I2C_0_INST) & DL_I2C_CONTROLLER_STATUS_IDLE));
//    DL_I2C_flushControllerTXFIFO(I2C_0_INST);
//}

////************I2C read register **********************
//void I2C_ReadReg(uint8_t DevAddr,uint8_t reg_addr, uint8_t *reg_data, uint8_t count)
//{
//    DL_I2C_fillControllerTXFIFO(I2C_0_INST, &reg_addr, count);
//    /* Wait for I2C to be Idle */
//    while (!(DL_I2C_getControllerStatus(I2C_0_INST) & DL_I2C_CONTROLLER_STATUS_IDLE));
//    DL_I2C_startControllerTransfer(I2C_0_INST, DevAddr, DL_I2C_CONTROLLER_DIRECTION_TX, 1);
//    while (DL_I2C_getControllerStatus(I2C_0_INST) & DL_I2C_CONTROLLER_STATUS_BUSY_BUS);
//    /* Wait for I2C to be Idle */
//    while (!(DL_I2C_getControllerStatus(I2C_0_INST) &DL_I2C_CONTROLLER_STATUS_IDLE));
//    DL_I2C_flushControllerTXFIFO(I2C_0_INST);
//    /* Send a read request to Target */
//    DL_I2C_startControllerTransfer(I2C_0_INST, DevAddr, DL_I2C_CONTROLLER_DIRECTION_RX, count);
//    for (uint8_t i = 0; i < count; i++) {
//        while (DL_I2C_isControllerRXFIFOEmpty(I2C_0_INST));
//        reg_data[i] = DL_I2C_receiveControllerData(I2C_0_INST);
//    }
//}











/**********************************************************************/
void single_writei2c(unsigned char SlaveAddress,unsigned char REG_Address,unsigned char REG_data)
{
	//I2C_WriteReg(SlaveAddress,REG_Address,&REG_data,1);
}

unsigned char single_readi2c(unsigned char SlaveAddress,unsigned char REG_Address)
{
	uint8 data=0;
	//I2C_ReadReg(SlaveAddress,REG_Address,&data,1);
	return data;
}

void i2creadnbyte(uint8_t addr, uint8_t regAddr, uint8_t *data, uint8_t length)
{
 // I2C_ReadReg(addr, regAddr,data,length);
}






