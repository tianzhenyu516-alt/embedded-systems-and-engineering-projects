import sensor, image, utime, pyb,machine
from pyb import Pin

class ULTRASONIC:
    def __init__(self, trig_pin, echo_pin):
        self.trig = machine.Pin(trig_pin, machine.Pin.OUT_PP)
        self.echo = machine.Pin(echo_pin, machine.Pin.IN)
        self.distance=0

    def get_distance(self):
        self.trig.high()
        utime.sleep_us(11)
        self.trig.low()
        pulse_time = machine.time_pulse_us(self.echo, 1, 1000000)
        self.distance = (pulse_time * 0.017)
        return self.distance

