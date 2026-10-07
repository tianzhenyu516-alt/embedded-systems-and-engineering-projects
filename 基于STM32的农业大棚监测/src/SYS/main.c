#include "sys.h"
#include "usart3.h"


SENSOR SensorData;//传感器结构体定义
THRESHOLD Threshold;//阈值结构体定义
SYSTEM System;//系统标志位结构体定义

void mqttPublic(void);
void Threshold_Init(THRESHOLD *Threshold);

int main(void)
{
    delay_init();//延时函数初始化
    TIM4_Init(4000, 7200 - 1); //定时器4初始化
    TIM2_Init(499, 7199); //定时器2初始化 定时扫描按键 定时将消息发布标志置位
    NVIC_Config(); //中断优先级配置
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    My_USART1();//串口1初始化 （调试打印用） 波特率：9600
    My_USART2(); //串口2初始化 （与ESP8266通信用）波特率：115200
    RELAY_GPIO_Config();//继电器初始化
    Adc_Init();//adc初始化，读取传感器值
    oled_Init();//oled初始化
    SGP30_Init();
    delay_ms(100);
    SGP30_Write(0x20, 0x08);
    SensorData.sgp30_dat = SGP30_Read();//读取SGP30的值
    SensorData.CO2Data = (SensorData.sgp30_dat & 0xffff0000) >> 16;
    SensorData.TVOCData = SensorData.sgp30_dat & 0x0000ffff;

    while (SensorData.CO2Data == 400 && SensorData.TVOCData == 0) {
        SGP30_Write(0x20, 0x08);
        SensorData.sgp30_dat = SGP30_Read();//读取SGP30的值
        SensorData.CO2Data = (SensorData.sgp30_dat & 0xffff0000) >> 16;//取出CO2浓度值
        SensorData.TVOCData = SensorData.sgp30_dat & 0x0000ffff;			 //取出TVOC值
        oled_ShowString(16 * 1, 2 * 3, "wait.....", 16);
    }

    wifi_GPIO_Config();//ESP8266复位引脚初始化
    Ali_MsessageInit();//服务器连接相关的变量初始化
    Beep_Init();//蜂鸣器初始化
    LED_GPIO_Config();//LED灯初始化
    DHT11_Init();//温湿度传感器初始化
    KEY_Init();//按键初始化
    Threshold_Init(&Threshold);//传感器阈值及执行器件开关变量初始化
    oled_Clear();

    /*******************************************/
    while (1) {
        mqtt_Content();//连接MQTT服务器并与之通信
        DHT11_Read_TempAndHumidity(&dht11Data);//获取温湿度;
        SensorData.SmogVal = Get_Adc_Average(1, 5) / 41; //获取烟雾浓度;
        SensorData.LightVal = Get_Adc_Average(5, 5) / 41; //获取烟雾浓度;
        Mode_Decide();//模式判定 （按键1选择模式）

        /*****定时发布MQTT消息至服务器*****/
        if (System.mqttflag) {
            mqttPublic();//向MQTT服务器发布消息
            System.mqttflag = 0;
        }
    }
}


//向MQTT服务器发布消息
void mqttPublic(void)
{
    char Data[255];
    /*****将传感器数据按JSON格式打包并发布*****/
    sprintf(Data,
            "{\"sensor1\":%d,\"sensor2\":%d,\"sensor3\":%d,\"sensor4\":%d,\"sensor5\":%d,\"sensor6\":%d,\"sensor7\":%d,\"sensor8\":%d,\"sensor9\":%d,\"sensor10\":%d}",
            dht11Data.temp_int, dht11Data.humi_int, SensorData.SmogVal, 100-SensorData.LightVal, SensorData.CO2Data
            , Threshold.TempMax, Threshold.HumiMin, Threshold.SmogMax, Threshold.LightMin, Threshold.SGP30Max
           );
    mqtt_PublishQs0(P_TOPIC_NAME, Data, strlen(Data)); //发布函数，参数为：Topic，JSON格式数据，数据长度
}

//传感器阈值及执行器件开关变量初始化
void Threshold_Init(THRESHOLD *Threshold)
{
    Threshold->TempMax = 34;
    Threshold->HumiMin = 40;
    Threshold->SmogMax = 40;
    Threshold->LightMin = 50;
    Threshold->SGP30Max = 800;
    System.Switch1 = 0;
    System.Switch2 = 0;
    System.Switch3 = 0;
    System.Switch4 = 0;
    System.Switch5 = 0;
    System.Switch6 = 0;
    System.mqttflag = 0;
    System.ClearFlag = 0;
}


