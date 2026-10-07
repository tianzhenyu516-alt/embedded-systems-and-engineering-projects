#include "sys.h"
u8 TEMIP_MAX;
u8 TEMIP_MIN;
u8 mqtt_buff[400];
u8 Connect_flag = 0;
u8 ConnectPack_flag = 0;
u8 SubscribePack_flag = 0;
u8 Ping_flag = 0;
int sensorMax = 0;
uint16_t ReadData = 0;

float tempx;
unsigned char  mqtt_TxBuf[7][400];
unsigned char *mqtt_TxInPtr;
unsigned char *mqtt_TxOutPtr;
unsigned char *mqtt_TxEndPtr;
char str[20] = "";
unsigned char  mqtt_RxBuf[7][400];
unsigned char *mqtt_RxInPtr;
unsigned char *mqtt_RxOutPtr;
unsigned char *mqtt_RxEndPtr;
char dest[5] = {0};
unsigned char  mqtt_CMDBuf[7][400];
unsigned char *mqtt_CMDInPtr;
unsigned char *mqtt_CMDOutPtr;
unsigned char *mqtt_CMDEndPtr;

char clientid[128];
int  clientid_size;
char lex[256];
char username[128];
int  username_size;

char passward[128];
int  passward_size;

char ServerIP[128];
int  ServerPort;

void Mqtt_Subscribe(char *topic_name, int QoS);
void mqtt_DealTxData(unsigned char *data, int size);

void MQTT_Buff_Init(void)
{
    mqtt_TxInPtr = mqtt_TxBuf[0];
    mqtt_TxOutPtr = mqtt_TxInPtr;
    mqtt_TxEndPtr = mqtt_TxBuf[6];
    mqtt_RxInPtr = mqtt_RxBuf[0];
    mqtt_RxOutPtr = mqtt_RxInPtr;
    mqtt_RxEndPtr = mqtt_RxBuf[6];
    mqtt_CMDInPtr = mqtt_CMDBuf[0];
    mqtt_CMDOutPtr = mqtt_CMDInPtr;
    mqtt_CMDEndPtr = mqtt_CMDBuf[6];
    Mqtt_ConnectMessege();
    Mqtt_Subscribe(SUBSCRIBE_TOPIC, 1);
}
void Mqtt_Subscribe(char *topic_name, int QoS)
{
    int payload_size;
    int remaining_size;
    int len;
    int all_size = 1;
    int variable_size = 2;
    payload_size = 2 + strlen(topic_name) + 1;
    remaining_size = variable_size + payload_size;
    mqtt_buff[0] = 0x82;

    while (remaining_size > 0) {
        len = remaining_size % 128;
        remaining_size = remaining_size / 128;

        if (remaining_size > 0) {
            len = len | 0x80;
        }

        mqtt_buff[all_size++] = len;
    }

    mqtt_buff[all_size + 0] = 0x00;
    mqtt_buff[all_size + 1] = 0x0A;
    mqtt_buff[all_size + 2] = strlen(topic_name) / 256;
    mqtt_buff[all_size + 3] = strlen(topic_name) % 256;
    memcpy(&mqtt_buff[all_size + 4], topic_name, strlen(topic_name));
    mqtt_buff[all_size + 4 + strlen(topic_name)] = QoS;
    mqtt_DealTxData(mqtt_buff, all_size + variable_size + payload_size);
}
void Mqtt_ConnectMessege()
{
    int remaining_size;
    int len;
    int variable_size;
    int payload_size;
    int all_size = 1;
    variable_size = 10;
    payload_size = 2 + clientid_size  + 2 + username_size  + 2 + passward_size;
    remaining_size = variable_size + payload_size;
    mqtt_buff[0] = 0x10;

    while (remaining_size > 0) {
        len = remaining_size % 128;
        remaining_size = remaining_size / 128;

        if (remaining_size > 0) {
            len = len | 0x80;
        }

        mqtt_buff[all_size++] = len;
    }

    mqtt_buff[all_size + 0] = 0x00;
    mqtt_buff[all_size + 1] = 0x04;
    mqtt_buff[all_size + 2] = 0x4D;
    mqtt_buff[all_size + 3] = 0x51;
    mqtt_buff[all_size + 4] = 0x54;
    mqtt_buff[all_size + 5] = 0x54;
    mqtt_buff[all_size + 6] = 0x04;
    mqtt_buff[all_size + 7] = 0xC2;
    mqtt_buff[all_size + 8] = 0x00;
    mqtt_buff[all_size + 9] = 0x64;
    mqtt_buff[all_size + 10] = clientid_size / 256;
    mqtt_buff[all_size + 11] = clientid_size % 256;
    memcpy(&mqtt_buff[all_size + 12], clientid, clientid_size);
    mqtt_buff[all_size + 12 + clientid_size] = username_size / 256;
    mqtt_buff[all_size + 13 + clientid_size] = username_size % 256;
    memcpy(&mqtt_buff[all_size + 14 + clientid_size], username, username_size);
    mqtt_buff[all_size + 14 + clientid_size + username_size] = passward_size / 256;
    mqtt_buff[all_size + 15 + clientid_size + username_size] = passward_size % 256;
    memcpy(&mqtt_buff[all_size + 16 + clientid_size + username_size], passward, passward_size);
    mqtt_DealTxData(mqtt_buff, all_size + variable_size + payload_size);
    //	for(j=0;j<sizeof(mqtt_buff);j++)
    //	{
    //		u1_printf("%x/",mqtt_buff[j]);
    //	}
    //    u1_printf("\r\n");
}
void mqtt_PublishQs0(char *topic, char *data, int data_len)
{
    int all_size = 1;
    int variable_size, payload_size, remaining_size, len;
    variable_size = 2 + strlen(topic);
    payload_size = data_len;
    remaining_size = variable_size + payload_size;
    mqtt_buff[0] = 0x30;

    while (remaining_size > 0) {
        len = remaining_size % 128;
        remaining_size = remaining_size / 128;

        if (remaining_size > 0) {
            len = len | 0x80;
        }

        mqtt_buff[all_size++] = len;
    }

    mqtt_buff[all_size + 0] = strlen(topic) / 256;
    mqtt_buff[all_size + 1] = strlen(topic) % 256;
    memcpy(&mqtt_buff[all_size + 2], topic, strlen(topic));
    memcpy(&mqtt_buff[all_size + 2 + strlen(topic)], data, data_len);
    //	for(j=0;j<sizeof(mqtt_buff);j++)
    //	{
    //		u1_printf("%x ",mqtt_buff[j]);
    //	}
    //    u1_printf("\r\n");
    mqtt_DealTxData(mqtt_buff, all_size + variable_size + payload_size);
}
void mqtt_DealCmdSet(unsigned char *data, int size)
{
    memcpy(&mqtt_CMDInPtr[2], data, size);
    mqtt_CMDInPtr[0] = size / 256;
    mqtt_CMDInPtr[1] = size % 256;
    mqtt_CMDInPtr[size + 2] = '\0';
    mqtt_CMDInPtr += 400;

    if (mqtt_CMDInPtr == mqtt_CMDEndPtr) {
        mqtt_CMDInPtr = mqtt_CMDBuf[0];
    }
}
void mqtt_Dealsetdata_Qs0(unsigned char *redata)
{
    int i, topic_len, cmd_len, cmd_local, temp, temp_len, multiplier;
    unsigned char tempbuff[400];
    unsigned char *data;
    temp_len = 0;
    i = multiplier = 1;
    data = &redata[2];

    do {
        temp = data[i];
        temp_len += (temp & 127) * multiplier;
        multiplier *= 128;
        i++;
    } while ((temp & 128) != 0);

    topic_len = data[i] * 256 + data[i + 1] + 2;
    cmd_len = temp_len - topic_len;
    cmd_local = topic_len + i;
    memcpy(tempbuff, &data[cmd_local], cmd_len);
    mqtt_DealCmdSet(tempbuff, cmd_len);
}

void mqtt_DealTxData(unsigned char *data, int size)
{
    mqtt_TxInPtr[0] = size / 256;
    mqtt_TxInPtr[1] = size % 256;
    memcpy(&mqtt_TxInPtr[2], data, size);
    mqtt_TxInPtr += 400;

    if (mqtt_TxInPtr == mqtt_TxEndPtr) {
        mqtt_TxInPtr = mqtt_TxBuf[0];
    }
}

void mqtt_Ping(void)
{
    mqtt_buff[0] = 0xC0;
    mqtt_buff[1] = 0x00;
    mqtt_DealTxData(mqtt_buff, 2);
}

void Ali_MsessageInit()
{
    memset(clientid, 128, 0);
    sprintf(clientid, "%s", DEVICENAME);
    clientid_size = strlen(clientid);
    memset(username, 128, 0);
    sprintf(username, "%s", PRODUCTKEY);
    username_size = strlen(username);
    memset(passward, 128, 0);
    sprintf(passward, "%s", DEVICESECRE);
    passward_size = strlen(passward);
    memset(ServerIP, 128, 0);
    sprintf(ServerIP, "%s", BAD);                //构建服务器域名
    ServerPort = 1883;
}

char *mid(char *dst, char *src, int n, int m) /*n为长度，m为位置*/
{
    char *p = src;
    char *q = dst;
    int len = strlen(src);

    if (n > len) {
        n = len - m;    /*从第m个到最后*/
    }

    if (m < 0) {
        m = 0;    /*从第一个开始*/
    }

    if (m > len) {
        return NULL;
    }

    p += m;

    while (n--) {
        *(q++) = *(p++);
    }

    *(q++) = '\0'; /*有必要吗？很有必要*/
    return dst;
}





void mqtt_Content(void)
{
    if (Connect_flag == 0) {
        memset(WiFi_RX_BUF, 0, 1024);
        WiFi_RxCounter = 0;
        TIM_Cmd(TIM4, DISABLE);
        TIM_Cmd(TIM3, DISABLE);
        u1_printf("正在连接MQTT服务器\r\n");
			
			  oled_ShowString(16, 4, "connecting...", 16);
			

        if (WIFI_Connect() == 0) {
            Connect_flag = 1;
            u1_printf("已连接MQTT服务器\r\n\r\n");
            memset(WiFi_RX_BUF, 0, 1024);
            WiFi_RxCounter = 0;
            MQTT_Buff_Init();
            TIM_Cmd(TIM4, ENABLE);
            TIM_Cmd(TIM3, ENABLE);
        }
    } else {
        if (mqtt_TxOutPtr != mqtt_TxInPtr) {
            if ((mqtt_TxOutPtr[2] == 0x10) || ((mqtt_TxOutPtr[2] == 0x82) && ConnectPack_flag == 1) || SubscribePack_flag == 1) {
                u1_printf("发送数据:0x%x\r\n", mqtt_TxOutPtr[2]);
                mqtt_TxData(mqtt_TxOutPtr);
                mqtt_TxOutPtr += 400;

                if (mqtt_TxOutPtr == mqtt_TxEndPtr) {
                    mqtt_TxOutPtr = mqtt_TxBuf[0];
                }
            }
        }

        if (mqtt_RxOutPtr != mqtt_RxInPtr) {
            if (mqtt_RxOutPtr[2] == 0x20) {
                switch (mqtt_RxOutPtr[5]) {
                case 0x00 :
                    u1_printf("CONNECT报文连接成功\r\n\r\n");
                    ConnectPack_flag = 1;
                    break;

                case 0x01 :
                    u1_printf("0x01连接已拒绝，不支持的协议版本，准备重启\r\n");
                    Connect_flag = 0;
                    break;

                case 0x02 :
                    u1_printf("0x02连接已拒绝，不合格的客户 端标识符，准备重启\r\n");
                    Connect_flag = 0;
                    break;

                case 0x03 :
                    u1_printf("0x03连接已拒绝，服务端不可用，准备重启\r\n");
                    Connect_flag = 0;
                    break;

                case 0x04 :
                    u1_printf("0x04连接已拒绝，无效的用户名 或密码，准备重启\r\n");
                    Connect_flag = 0;
                    break;

                case 0x05 :
                    u1_printf("0x05连接已拒绝，未授权，准备重启\r\n");
                    Connect_flag = 0;
                    break;

                default   :
                    u1_printf("连接已拒绝，准备重启\r\n");
                    Connect_flag = 0;
                    break;
                }
            } else if (mqtt_RxOutPtr[2] == 0x90) {
                switch (mqtt_RxOutPtr[6]) {
                case 0x01 :
                    u1_printf("订阅成功\r\n\r\n");
                    SubscribePack_flag = 1;
                    TIM3_Init(60000 - 1, 7200 - 1);
                    Ping_flag = 0;
                    mqtt_PublishQs0(P_TOPIC_NAME, lex, strlen(lex));
                    break;

                default   :
                    u1_printf("订阅失败，准备重启\r\n");
                    Connect_flag = 0;
                    break;
                }
            } else if (mqtt_RxOutPtr[2] == 0xD0) {
                u1_printf("Ping回复正常！\r\n");
                Ping_flag = 1;
            } else if ((mqtt_RxOutPtr[2] == 0x30)) {
                u1_printf("MQTT服务器推送的内容是\r\n");
                mqtt_Dealsetdata_Qs0(mqtt_RxOutPtr);
            }

            mqtt_RxOutPtr += 400;

            if (mqtt_RxOutPtr == mqtt_RxEndPtr) {
                mqtt_RxOutPtr = mqtt_RxBuf[0];
            }
        }

        if (mqtt_CMDOutPtr != mqtt_CMDInPtr) {
            u1_printf("命令:%s\r\n", &mqtt_CMDOutPtr[2]);

            
					//模式切换
					if (strstr((char *)mqtt_CMDOutPtr + 2, "Manual")) {
                oled_Clear();
                OperateMode = 1;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Automatic")) {
                oled_Clear();
                OperateMode = 0;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "ThresholdOn")) {
                oled_Clear();
                OperateMode = 2;
            }
						
							//手动模式
						
						 if (strstr((char *)mqtt_CMDOutPtr + 2, "Switch1")) {
                System.Switch1 = !System.Switch1;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Switch2")) {
                System.Switch2 = !System.Switch2;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Switch3")) {
                System.Switch3 = !System.Switch3;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Switch4")) {
                System.Switch4 = !System.Switch4;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Switch5")) {
                System.Switch5 = !System.Switch5;
            }
						
						//阈值加减
            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold1Down")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.TempMax = Threshold.TempMax--;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold1Add")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.TempMax = Threshold.TempMax++;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold2Down")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.HumiMin = Threshold.HumiMin--;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold2Add")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.HumiMin = Threshold.HumiMin++;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold3Down")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.SmogMax = Threshold.SmogMax--;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold3Add")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.SmogMax = Threshold.SmogMax++;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold4Down")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.LightMin = Threshold.LightMin--;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold4Add")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.LightMin = Threshold.LightMin++;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold5Down")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.SGP30Max = Threshold.SGP30Max--;
            }

            if (strstr((char *)mqtt_CMDOutPtr + 2, "Threshold5Add")) {
                int len = strlen((char *)mqtt_CMDOutPtr + 2);
                Threshold.SGP30Max = Threshold.SGP30Max++;
            }

           

            memset(mqtt_CMDOutPtr + 2, 0x00, sizeof(mqtt_CMDOutPtr + 2));
            mqtt_CMDOutPtr += 400;

            if (mqtt_CMDOutPtr == mqtt_CMDEndPtr) {
                mqtt_CMDOutPtr = mqtt_CMDBuf[0];
            }
        }
    };
}


