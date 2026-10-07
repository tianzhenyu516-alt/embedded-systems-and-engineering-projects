#include "sys.h"

static uint8_t InterFace =
    0; //页面显示标志位  自动模式下，一页显示不完所有信息，所以分两页显示，0显示第一页，1显示第二页
uint8_t OperateMode = 0; //运行模式标志位
/******************
功能：模式选择及控制界面
参数：无
返回值：无
******************/
void Mode_Decide(void)//模式判定
{
    //按键判定
    if (isKey1) { //若按键1按下
        isKey1 = isKey2 = isKey3 = isKey4 = 0; //清除按键按下标志
        oled_Clear();
        OperateMode++;
    } else if (isKey2 && (!OperateMode)) { //若按键2按下,且当前模式为自动模式
        isKey1 = isKey2 = isKey3 = isKey4 = 0; //清除按键按下标志
        oled_Clear();
        InterFace = !InterFace;
    }

    //标志位限制
    if (OperateMode >= 3) {
        OperateMode = 0;
    }

    if (System.ClearFlag) {
        oled_Clear();
        System.ClearFlag = 0;
    }

    /**根据模式选择显示界面**/
    switch (OperateMode) {
    case 0:
        Inform_Show();//显示信息
        AutoContrl();//自动控制
        break;

    case 1:
        Manual_Contrl();//手动模式
        break;

    case 2:
        ThresholdSet();//阈值设置1
        break;
    }
}

/******************
功能：显示界面
参数：无
返回值：无
******************/
void Inform_Show(void)
{
    if (!InterFace) { //自动模式页面1
        oled_ShowCHinese(16, 0, 14);
        oled_ShowCHinese(32, 0, 15);
        oled_ShowCHinese(48, 0, 16);
        oled_ShowCHinese(64, 0, 17);
        oled_ShowCHinese(80, 0, 18);
        oled_ShowCHinese(96, 0, 19); //大棚环境监测
        oled_ShowCHinese(0, 2, 0);
        oled_ShowCHinese(16, 2, 2);
        OLED_ShowChar(32, 2, ':', 16);//温度
        oled_ShowCHinese(0, 4, 1);
        oled_ShowCHinese(16, 4, 2);
        OLED_ShowChar(32, 4, ':', 16); //湿度
        oled_ShowCHinese(0, 6, 8);
        oled_ShowCHinese(16, 6, 9);
        OLED_ShowChar(32, 6, ':', 16); //烟雾
        oled_ShowNum(48, 2, dht11Data.temp_int, 2, 16);
        oled_ShowNum(48, 4, dht11Data.humi_int, 2, 16);
        oled_ShowNum(48, 6, SensorData.SmogVal, 2, 16);
        oled_ShowString(80, 2, "%", 16);
        oled_ShowString(80, 4, "%", 16);
        oled_ShowString(80, 6, "ppm", 16);
    } else { //自动模式页面2
        oled_ShowCHinese(0, 0, 6);
        oled_ShowCHinese(16, 0, 7);
        OLED_ShowChar(32, 0, ':', 16); //光照
        oled_ShowString(0, 2, "CO2", 16);
        OLED_ShowChar(32, 2, ':', 16);
        oled_ShowNum(48, 0, 100 - SensorData.LightVal, 2, 16);
        SGP30_Write(0x20, 0x08);
        SensorData.sgp30_dat = SGP30_Read();//读取SGP30的值
        SensorData.CO2Data = ((SensorData.sgp30_dat & 0xffff0000) >> 16);//取出CO2浓度值
        SensorData.TVOCData = SensorData.sgp30_dat & 0x0000ffff;       //取出TVOC值
        oled_ShowNum(48, 2, SensorData.CO2Data, 5, 16);
        oled_ShowString(80, 0, "%", 16);
    }
}


/******************
功能：自动控制界面
参数：无
返回值：无
******************/

void AutoContrl(void)
{
    if (dht11Data.temp_int >= Threshold.TempMax) {
        RELAY_ON;
    } else {
        RELAY_OFF;
    }

    if (dht11Data.humi_int <= Threshold.HumiMin) {
        RELAY1_ON;
    } else {
        RELAY1_OFF;
    }

    if (SensorData.SmogVal >= Threshold.SmogMax) {
        BEEP_ON;
    } else {
        BEEP_OFF;
    }

    if (100 - SensorData.LightVal <= Threshold.LightMin) {
        LED1_ON;
    } else {
        LED1_OFF;
    }

    if (SensorData.CO2Data >= Threshold.SGP30Max) {
        RELAY2_ON;
    } else {
        RELAY2_OFF;
    }
}

/******************
功能：手动控制界面
参数：无
返回值：无
******************/
void Manual_Contrl(void)
{
    static uint8_t IndexFlag = 1; //选项索引
    static uint8_t CursorFlag = 1; //光标索引
    //手动模式
    oled_ShowCHinese(32, 0, 20);
    oled_ShowCHinese(48, 0, 21);
    oled_ShowCHinese(64, 0, 22);
    oled_ShowCHinese(80, 0, 23);

    /*按键检测*/
    if (isKey2) {
        IndexFlag++;

        if (IndexFlag == 6) {
            IndexFlag = 1;    //选项个数限制
        }

        if (IndexFlag == 1 || IndexFlag == 4) {
            CursorFlag = 1;
            oled_Clear();
        } else if (IndexFlag == 2 || IndexFlag == 5) {
            CursorFlag = 2;
        } else if (IndexFlag == 3 || IndexFlag == 6) {
            CursorFlag = 3;
        }

        isKey2 = 0;
    }

    if (isKey3) {
        if (IndexFlag == 1) {
            System.Switch1 = !System.Switch1;
        } else if (IndexFlag == 2) {
            System.Switch2 = !System.Switch2;
        } else if (IndexFlag == 3) {
            System.Switch3 = !System.Switch3;
        } else if (IndexFlag == 4) {
            System.Switch4 = !System.Switch4;
        } else if (IndexFlag == 5) {
            System.Switch5 = !System.Switch5;
        } else if (IndexFlag == 6) {
            System.Switch6 = !System.Switch6;
        }

        isKey3 = 0;
    }

    if (IndexFlag <= 3) { //第一页
        //空调
        oled_ShowCHinese(16, 2, 10);
        oled_ShowCHinese(32, 2, 11);
        OLED_ShowChar(48, 2, ':', 16);
        //加湿
        oled_ShowCHinese(16, 4, 12);
        oled_ShowCHinese(32, 4, 13);
        OLED_ShowChar(48, 4, ':', 16);
        //排风
        oled_ShowCHinese(16, 6, 28);
        oled_ShowCHinese(32, 6, 29);
        OLED_ShowChar(48, 6, ':', 16);

        if (System.Switch1) {
            oled_ShowString(72, 2, "ON ", 16);
        } else {
            oled_ShowString(72, 2, "OFF", 16);
        }

        if (System.Switch2) {
            oled_ShowString(72, 4, "ON ", 16);
        } else {
            oled_ShowString(72, 4, "OFF", 16);
        }

        if (System.Switch3) {
            oled_ShowString(72, 6, "ON ", 16);
        } else {
            oled_ShowString(72, 6, "OFF", 16);
        }
    } else { //第二页
        //蜂鸣器
        oled_ShowCHinese(16, 2, 30);
        oled_ShowCHinese(32, 2, 31);
        oled_ShowCHinese(48, 2, 32);
        OLED_ShowChar(64, 2, ':', 16);
        //灯光
        oled_ShowCHinese(16, 4, 33);
        oled_ShowCHinese(32, 4, 34);
        OLED_ShowChar(48, 4, ':', 16);

        if (System.Switch4) {
            oled_ShowString(72, 2, "ON ", 16);
        } else {
            oled_ShowString(72, 2, "OFF", 16);
        }

        if (System.Switch5) {
            oled_ShowString(72, 4, "ON ", 16);
        } else {
            oled_ShowString(72, 4, "OFF", 16);
        }
    }

    switch (CursorFlag) { //光标显示
    case 1:
        OLED_ShowChar(0, 2, '*', 16);
        OLED_ShowChar(0, 4, ' ', 16);
        OLED_ShowChar(0, 6, ' ', 16);
        break;

    case 2:
        OLED_ShowChar(0, 2, ' ', 16);
        OLED_ShowChar(0, 4, '*', 16);
        OLED_ShowChar(0, 6, ' ', 16);
        break;

    case 3:
        OLED_ShowChar(0, 2, ' ', 16);
        OLED_ShowChar(0, 4, ' ', 16);
        OLED_ShowChar(0, 6, '*', 16);
        break;
    }

    if (System.Switch1) {
        RELAY_ON;
    } else {
        RELAY_OFF;
    }

    if (System.Switch2) {
        RELAY1_ON;
    } else {
        RELAY1_OFF;
    }

    if (System.Switch3) {
        RELAY2_ON;
    } else {
        RELAY2_OFF;
    }

    if (System.Switch4) {
        BEEP_ON;
    } else {
        BEEP_OFF;
    }

    if (System.Switch5) {
        LED1_ON;
    } else {
        LED1_OFF;
    }
}


/******************
功能：阈值设置
参数：无
返回值：无
******************/
void ThresholdSet(void)
{
    static uint8_t IndexFlag1 = 1; //选项索引
    static uint8_t CursorFlag1 = 1; //光标索引
    //阈值设置
    oled_ShowCHinese(32, 0, 24);
    oled_ShowCHinese(48, 0, 25);
    oled_ShowCHinese(64, 0, 26);
    oled_ShowCHinese(80, 0, 27);

    /*按键检测*/
    if (isKey2) {
        IndexFlag1++;

        if (IndexFlag1 == 6) {
            IndexFlag1 = 1;
        }

        if (IndexFlag1 == 1 || IndexFlag1 == 4) {
            CursorFlag1 = 1;
            oled_Clear();
        } else if (IndexFlag1 == 2 || IndexFlag1 == 5) {
            CursorFlag1 = 2;
        } else if (IndexFlag1 == 3 || IndexFlag1 == 6) {
            CursorFlag1 = 3;
        }

        isKey2 = 0;
    } else if (isKey3) {
        isKey3 = 0;

        if (IndexFlag1 == 1) {
            Threshold.TempMax++;
        } else if (IndexFlag1 == 2) {
            Threshold.HumiMin++;
        } else if (IndexFlag1 == 3) {
            Threshold.SmogMax++;
        } else if (IndexFlag1 == 4) {
            Threshold.LightMin++;
        } else if (IndexFlag1 == 5) {
            Threshold.SGP30Max++;
        }
    } else if (isKey4) {
        isKey4 = 0;

        if (IndexFlag1 == 1) {
            Threshold.TempMax--;
        } else if (IndexFlag1 == 2) {
            Threshold.HumiMin--;
        } else if (IndexFlag1 == 3) {
            Threshold.SmogMax--;
        } else if (IndexFlag1 == 4) {
            Threshold.LightMin--;
        } else if (IndexFlag1 == 5) {
            Threshold.SGP30Max--;
        }
    }

    if (IndexFlag1 <= 3) { //第一页
        //温度上限
        oled_ShowCHinese(16, 2, 0);
        oled_ShowCHinese(32, 2, 2);
        oled_ShowCHinese(48, 2, 37);
        oled_ShowCHinese(64, 2, 39);
        OLED_ShowChar(80, 2, ':', 16);
        //湿度上限
        oled_ShowCHinese(16, 4, 1);
        oled_ShowCHinese(32, 4, 2);
        oled_ShowCHinese(48, 4, 38);
        oled_ShowCHinese(64, 4, 39);
        OLED_ShowChar(80, 4, ':', 16);
        //烟雾上限
        oled_ShowCHinese(16, 6, 8);
        oled_ShowCHinese(32, 6, 9);
        oled_ShowCHinese(48, 6, 37);
        oled_ShowCHinese(64, 6, 39);
        OLED_ShowChar(80, 6, ':', 16);
        //数值显示
        oled_ShowNum(90, 2, Threshold.TempMax, 2, 16);
        oled_ShowNum(90, 4, Threshold.HumiMin, 2, 16);
        oled_ShowNum(90, 6, Threshold.SmogMax, 2, 16);
        //单位显示
        oled_ShowCHinese(112, 2, 3);
        OLED_ShowChar(112, 4, '%', 16);
        oled_ShowString(112, 6, "%", 16);
    } else { //第二页
        //光照下限
        oled_ShowCHinese(16, 2, 6);
        oled_ShowCHinese(32, 2, 7);
        oled_ShowCHinese(48, 2, 38);
        oled_ShowCHinese(64, 2, 39);
        OLED_ShowChar(80, 2, ':', 16);
     
        oled_ShowString(16, 4, "CO2", 16);
        oled_ShowCHinese(48, 4, 37);
        oled_ShowCHinese(64, 4, 39);
        OLED_ShowChar(80, 4, ':', 16);
   
        //数值显示
        oled_ShowNum(90, 2, Threshold.LightMin, 2, 16);
        oled_ShowNum(90, 4, Threshold.SGP30Max, 3, 16);
      
        //单位显示
        OLED_ShowChar(112, 2, '%', 16);
    }

    switch (CursorFlag1) { //根据光标索引进行光标显示
    case 1:
        OLED_ShowChar(0, 2, '*', 16);
        OLED_ShowChar(0, 4, ' ', 16);
        OLED_ShowChar(0, 6, ' ', 16);
        break;

    case 2:
        OLED_ShowChar(0, 2, ' ', 16);
        OLED_ShowChar(0, 4, '*', 16);
        OLED_ShowChar(0, 6, ' ', 16);
        break;

    case 3:
        OLED_ShowChar(0, 2, ' ', 16);
        OLED_ShowChar(0, 4, ' ', 16);
        OLED_ShowChar(0, 6, '*', 16);
        break;
    }

    //阈值限幅
    if (Threshold.SmogMax >= 100) {
        Threshold.SmogMax = 100;
    }

    if (Threshold.SmogMax <= 0) {
        Threshold.SmogMax = 0;
    }

    if (Threshold.SGP30Max >= 1000) {
        Threshold.SGP30Max = 1000;
    }

    if (Threshold.SGP30Max <= 0) {
        Threshold.SGP30Max = 0;
    }
}



