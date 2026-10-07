#include "ti_msp_dl_config.h"
#include "headfile.h"

/* ================= 调参区 ================= */
#define SPD_FULL       485    /* 直行速度 */
#define SPD_TURN       150    /* 2/4号见线：内轮反转力度 */
#define SPD_HARD       350    /* 1/5号见线：内轮全力反转 */
#define STOP_FRAMES    3      /* 停车确认帧数 */
#define TICKS_PER_SEC  100    /* 定时器每秒tick数：删关中断后按标称100Hz。
                                 若OLED秒和手机秒表不符，只改这一个数：
                                 OLED偏快→按比例调大，偏慢→调小 */
#define STOP_ARM_TICK  (19 * TICKS_PER_SEC)   /* 19秒后才开始检测停车带 */
#define END_BIAS       120    /* 19秒后左偏置力度：线靠向4/5号 */
/* ========================================== */

uint8_t gray_raw = 0;
uint8_t g_stop = 0;

volatile uint8_t  tracking_on = 0;
volatile uint32_t run_timer_10ms = 0;   /* duty_100hz计数，标称10ms/tick */
volatile uint8_t  b21_last = 0;
volatile uint16_t start_delay = 0;

void gray_init(void) {
    DL_GPIO_initDigitalInputFeatures(PORTA_GRAY_BIT4_IOMUX,
        DL_GPIO_INVERSION_DISABLE, DL_GPIO_RESISTOR_PULL_UP,
        DL_GPIO_HYSTERESIS_DISABLE, DL_GPIO_WAKEUP_DISABLE);
    DL_GPIO_initDigitalInputFeatures(PORTA_GRAY_BIT2_IOMUX,
        DL_GPIO_INVERSION_DISABLE, DL_GPIO_RESISTOR_PULL_UP,
        DL_GPIO_HYSTERESIS_DISABLE, DL_GPIO_WAKEUP_DISABLE);
    DL_GPIO_initDigitalInputFeatures(PORTA_GRAY_BIT0_IOMUX,
        DL_GPIO_INVERSION_DISABLE, DL_GPIO_RESISTOR_PULL_UP,
        DL_GPIO_HYSTERESIS_DISABLE, DL_GPIO_WAKEUP_DISABLE);
    DL_GPIO_initDigitalInputFeatures(PORTA_GRAY_BIT1_IOMUX,
        DL_GPIO_INVERSION_DISABLE, DL_GPIO_RESISTOR_PULL_UP,
        DL_GPIO_HYSTERESIS_DISABLE, DL_GPIO_WAKEUP_DISABLE);
    DL_GPIO_initDigitalInputFeatures(PORTA_GRAY_BIT3_IOMUX,
        DL_GPIO_INVERSION_DISABLE, DL_GPIO_RESISTOR_PULL_UP,
        DL_GPIO_HYSTERESIS_DISABLE, DL_GPIO_WAKEUP_DISABLE);
}

uint8_t read_gray(void) {
    uint8_t val = 0;
    if (!(PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT0_PIN))  val |= 0x01;
    if (!(PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT1_PIN))  val |= 0x02;
    if (!(PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT3_PIN))  val |= 0x04;
    if (!(PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT2_PIN))  val |= 0x08;
    if (!(PORTA_PORT->DIN31_0 & PORTA_GRAY_BIT4_PIN))  val |= 0x10;
    return val;
}

int main(void)
{
    uint8_t i;
    uint32_t tsec;

    SYSCFG_DL_init();
    OLED_Init();
    nGPIO_Init();
    ctrl_params_init();
    trackless_params_init();
    rgb_init();
    Encoder_Init();
    Button_Init();
    timer_irq_config();
    usart_irq_config();
    PPM_Init();
    gray_init();

    trackless_output.unlock_flag = LOCK;
    speed_setup = SPD_FULL;

    while (1)
    {
        gray_raw = read_gray();

        /* 第一行：5路传感器 */
        LCD_clear_L(0, 0);
        display_6_8_string(0, 0, "BIN:");
        for (i = 0; i < 5; i++) {
            LCD_P6x8Char(30 + i * 6, 0, ((gray_raw >> i) & 1) ? '1' : '0');
        }

        /* 第二行：左右轮输出 */
        LCD_clear_L(0, 1);
        display_6_8_string(0, 1, "L:");
        display_6_8_number(12, 1, speed_output[0]);
        display_6_8_string(60, 1, "R:");
        display_6_8_number(72, 1, speed_output[1]);

        /* 第三行：停车计数 + 圈速(分:秒) */
        LCD_clear_L(0, 2);
        display_6_8_string(0, 2, "S:");
        display_6_8_number(12, 2, g_stop);
        tsec = run_timer_10ms / TICKS_PER_SEC;
        display_6_8_string(36, 2, "T:");
        display_6_8_number(48, 2, tsec / 60);
        LCD_P6x8Char(60, 2, ':');
        display_6_8_number(66, 2, tsec % 60);

        delay_ms(100);
    }
}

void maple_duty_200hz(void)
{
    uint8_t b21_now;
    int L, R;
    uint8_t is_pair;
    static uint8_t stop_confirm = 0;
    static uint16_t lost = 0;
    static int last_L = 0, last_R = 0;

    /* ---------- 按键启停 ---------- */
    b21_now = (DL_GPIO_readPins(PORTB_PORT, KEYB_S3_PIN) != 0);
    if (b21_now == 0 && b21_last == 1) {
        tracking_on = !tracking_on;
        if (tracking_on) {
            trackless_output.unlock_flag = UNLOCK;
            run_timer_10ms = 0;
            start_delay = 100;
            stop_confirm = 0;
            lost = 0;
            last_L = 0; last_R = 0;   /* 清掉上一把的方向记忆 */
        } else {
            trackless_output.unlock_flag = LOCK;
            speed_output[0] = 0;
            speed_output[1] = 0;
            motor_output(1);
        }
    }
    b21_last = b21_now;

    if (!tracking_on) {
        speed_output[0] = 0;
        speed_output[1] = 0;
        motor_output(1);
        return;
    }

    gray_raw = read_gray();
    if (start_delay > 0) start_delay--;

    /* ---------- 1. 优先级译码：任何情况下都在循迹 ---------- */
    if (gray_raw != 0x00) {
        if (gray_raw & 0x01)      { L = -SPD_HARD; R = SPD_FULL; }  /* 1号:全力左打死 */
        else if (gray_raw & 0x10) { L = SPD_FULL;  R = -SPD_HARD; } /* 5号:全力右打死 */
        else if (gray_raw & 0x02) { L = -SPD_TURN; R = SPD_FULL; }  /* 2号:左打死 */
        else if (gray_raw & 0x08) { L = SPD_FULL;  R = -SPD_TURN; } /* 4号:右打死 */
        else                      { L = SPD_FULL;  R = SPD_FULL; }  /* 3号:直行 */
        last_L = L; last_R = R;              /* 记住最后一次有线时的方向 */
    } else {
        L = last_L; R = last_R;              /* 全灭:保持最后方向继续找线，不放生 */
    }

    /* ---------- 2. 末段偏置：19秒后恒定左偏，线靠到4/5号下 ---------- */
    if (run_timer_10ms > STOP_ARM_TICK) {
        L -= END_BIAS;
        if (L < -400) L = -400;
    }

    /* ---------- 3. 停车判定：只负责计数和刹车，永远不管方向 ----------
       任意相邻两灯同亮连续3帧 → 停。闪烁不再影响循迹 */
    is_pair = ((gray_raw & 0x03) == 0x03) ||   /* 1+2 */
              ((gray_raw & 0x06) == 0x06) ||   /* 2+3 */
              ((gray_raw & 0x0C) == 0x0C) ||   /* 3+4 */
              ((gray_raw & 0x18) == 0x18);     /* 4+5 */

    if (is_pair && start_delay == 0 && run_timer_10ms > STOP_ARM_TICK) {
        stop_confirm++;
        if (stop_confirm >= STOP_FRAMES) {
            speed_output[0] = 0;
            speed_output[1] = 0;
            tracking_on = 0;
            trackless_output.unlock_flag = LOCK;
            motor_output(1);
            return;
        }
    } else {
        stop_confirm = 0;
    }

    /* ---------- 3. 丢线保险：连续3秒全灭才停 ---------- */
    if (gray_raw == 0x00) lost++;
    else                  lost = 0;
    if (lost >= 600) {
        speed_output[0] = 0;
        speed_output[1] = 0;
        tracking_on = 0;
        trackless_output.unlock_flag = LOCK;
        motor_output(1);
        return;
    }

    g_stop = stop_confirm;
    speed_output[0] = L;
    speed_output[1] = R;
    motor_output(1);
}

void duty_1000hz(void) {}
void duty_100hz(void) {
    if (tracking_on) {
        run_timer_10ms++;
    }
}
void duty_10hz(void) {}