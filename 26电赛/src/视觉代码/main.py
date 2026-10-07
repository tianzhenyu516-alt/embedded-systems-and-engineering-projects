"""K230 ball balance competition build with phone video streaming."""

from media.sensor import *
from media.display import *
from media.media import *
import time
import gc
import cv2
import os
import socket
import _thread
from ulab import numpy as np
import math
from machine import PWM, FPIOA, Pin

try:
    import network
except Exception as network_import_error:
    network = None
    print("NETWORK IMPORT FAILED:", repr(network_import_error))

DETECT_W = 640
DETECT_H = 480
ROD_LENGTH_MM = 250.0
CENTER_MM = 125.0
KP = 3.0
KI = 0.02
KD = 0.8
OUTPUT_LIMIT = 80.0
CENTER_DEADBAND_CM = 0.25
CENTER_VISUAL_KP = 2.2
CENTER_VISUAL_KD = 1.0
CENTER_OUTPUT_LIMIT = 30.0
CENTER_SERVO_STEP = 3.0
CENTER_NEAR_LIMIT = 10.0
CENTER_NEAR_CM = 1.2
CENTER_MIN_OUTPUT = 2.5
Q3_VISUAL_KP = 1.6
Q3_VISUAL_KD = 0.9
Q3_OUTPUT_LIMIT = 24.0
Q3_SERVO_STEP = 2.2
Q3_PLUS_TARGET_CM = 4.5
Q3_PLUS_REACHED_CM = 4.1
Q3_SAFE_TARGET_CM = 4.3
Q3_LOOKAHEAD_S = 0.18
Q3_BRAKE_ZONE_CM = 3.8
Q3_BRAKE_OUTPUT_LIMIT = 32.0
Q3_BRAKE_SERVO_STEP = 3.8
Q3_EMERGENCY_CM = 4.7
Q3_EMERGENCY_OUTPUT_LIMIT = 40.0
Q3_STABLE_TIME_MS = 500
Q3_MAX_TIME_MS = 5000
Q4_MAX_TIME_MS = 8000
Q4_ERROR_LIMIT_CM = 1.0
Q4_CENTER_STABLE_MS = 500
SERVO_CENTER_ANGLE = 90.0

# Wireless video settings. The phone joins this AP and runs pc_receiver.py.
AP_SSID = "K230-CAM"
AP_PASSWORD = ""
BUILD_ID = "BALL-WIFI-V18-20260801"
PHONE_FRAME_PORT = 9000
PHONE_BEACON_PORT = 9001
PHONE_BEACON_MAGIC = b"K230RECV"
FRAME_MAGIC = b"KFRM"
JPEG_QUALITY = 35
STREAM_EVERY_N = 6
NETWORK_RETRY_MS = 2000
NETWORK_THREAD_STACK = 64 * 1024
SEND_CHUNK = 1400


class WirelessPush:
    """AP mode JPEG sender designed not to block the balance control loop."""

    def __init__(self):
        self._lock = _thread.allocate_lock()
        self._jpeg = None
        self._seq = 0
        self._frame_counter = 0
        self._running = False
        self._ap = None
        self._last_phone_ip = None
        self.enabled = False
        self.connected = False
        self.phone_ip = ""

    @staticmethod
    def _yield_thread():
        try:
            os.exitpoint()
        except Exception:
            pass

    @staticmethod
    def _close(sock):
        if sock is not None:
            try:
                sock.close()
            except Exception:
                pass

    def _create_ap(self):
        if network is None:
            raise OSError("network module unavailable")

        interface_ids = []
        try:
            interface_ids.append(network.AP_IF)
        except Exception:
            pass
        if 1 not in interface_ids:
            interface_ids.append(1)

        last_error = None
        for interface_id in interface_ids:
            try:
                ap = network.WLAN(interface_id)
                if not ap.active():
                    ap.active(True)

                configured = False
                for kwargs in ({"ssid": AP_SSID, "key": AP_PASSWORD},
                               {"ssid": AP_SSID, "password": AP_PASSWORD},
                               {"essid": AP_SSID, "password": AP_PASSWORD}):
                    try:
                        ap.config(**kwargs)
                        configured = True
                        break
                    except Exception as error:
                        last_error = error
                if not configured:
                    raise OSError("AP config keyword unsupported")

                time.sleep_ms(1000)
                print("AP READY: SSID={} PASSWORD={} IP={}".format(
                    AP_SSID, AP_PASSWORD, ap.ifconfig()[0]))
                return ap
            except Exception as error:
                last_error = error

        raise OSError("AP start failed: {}".format(repr(last_error)))

    def start(self):
        if self._running:
            return True
        try:
            # This is intentionally called after sensor.run().
            self._ap = self._create_ap()
            self._running = True
            self.enabled = True
            try:
                _thread.stack_size(NETWORK_THREAD_STACK)
            except Exception:
                pass
            _thread.start_new_thread(self._push_loop, ())
            print("WIRELESS THREAD READY")
            return True
        except Exception as error:
            self.enabled = False
            self.connected = False
            print("WIRELESS DISABLED; CONTROL CONTINUES:", repr(error))
            return False

    def stop(self):
        self._running = False
        self.connected = False

    def publish(self, img):
        if not self.enabled:
            return

        self._frame_counter += 1
        if self._frame_counter < STREAM_EVERY_N:
            return
        self._frame_counter = 0

        # Do not spend CPU or heap on JPEG when no phone is connected.
        if not self.connected:
            return

        try:
            try:
                encoded = img.compressed(quality=JPEG_QUALITY)
            except Exception:
                encoded = img.compress(quality=JPEG_QUALITY)
            if encoded is None:
                encoded = img
            jpeg = bytes(encoded.bytearray())
        except Exception as error:
            print("JPEG ENCODE FAILED:", repr(error))
            return

        self._lock.acquire()
        try:
            self._jpeg = jpeg
            self._seq += 1
        finally:
            self._lock.release()

    def _fetch(self, last_seq):
        self._lock.acquire()
        try:
            if self._jpeg is None or self._seq == last_seq:
                return None, last_seq
            return self._jpeg, self._seq
        finally:
            self._lock.release()

    def _listen_for_phone_beacon(self, wait_ms=2200):
        """Use the phone receiver's UDP beacon; no ap.status() dependency."""
        udp = None
        try:
            udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                udp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            except Exception:
                pass
            udp.bind(("0.0.0.0", PHONE_BEACON_PORT))
            try:
                udp.setblocking(False)
            except Exception:
                try:
                    udp.settimeout(0.2)
                except Exception:
                    pass

            deadline = time.ticks_add(time.ticks_ms(), wait_ms)
            while time.ticks_diff(deadline, time.ticks_ms()) > 0:
                try:
                    data, address = udp.recvfrom(64)
                    if data.startswith(PHONE_BEACON_MAGIC):
                        print("PHONE BEACON:", address[0])
                        return address[0]
                except OSError:
                    time.sleep_ms(40)
                self._yield_thread()
        except Exception as error:
            print("BEACON FALLBACK:", repr(error))
        finally:
            self._close(udp)
        return None

    def _open_phone(self, ip):
        tcp = None
        try:
            tcp = socket.socket()
            try:
                tcp.settimeout(0.8)
            except Exception:
                pass
            tcp.connect(socket.getaddrinfo(ip, PHONE_FRAME_PORT)[0][-1])
            try:
                tcp.setblocking(True)
            except Exception:
                pass
            try:
                tcp.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            except Exception:
                pass
            return tcp
        except Exception:
            self._close(tcp)
            return None

    def _connect_phone(self):
        # Reuse the last successful address first for fast recovery.
        if self._last_phone_ip:
            tcp = self._open_phone(self._last_phone_ip)
            if tcp is not None:
                return tcp, self._last_phone_ip

        beacon_ip = self._listen_for_phone_beacon()
        if beacon_ip:
            tcp = self._open_phone(beacon_ip)
            if tcp is not None:
                return tcp, beacon_ip

        # Beacon delivery can be restricted by Android. Scan the AP subnet.
        try:
            ap_ip = self._ap.ifconfig()[0]
            base = ap_ip.rsplit(".", 1)[0]
        except Exception:
            base = "192.168.169"

        for host in range(2, 21):
            ip = "{}.{}".format(base, host)
            if ip == beacon_ip or ip == self._last_phone_ip:
                continue
            tcp = self._open_phone(ip)
            if tcp is not None:
                print("PHONE FOUND BY SCAN:", ip)
                return tcp, ip
            self._yield_thread()
        return None, None

    @staticmethod
    def _send_all(sock, data):
        view = memoryview(data)
        sent = 0
        retries = 0
        while sent < len(view):
            end = min(sent + SEND_CHUNK, len(view))
            try:
                count = sock.send(view[sent:end])
            except OSError as error:
                code = error.args[0] if error.args else 0
                if code in (11, 35):
                    retries += 1
                    if retries > 400:
                        raise
                    time.sleep_ms(5)
                    continue
                raise
            if not count:
                raise OSError("phone connection closed")
            sent += count
            retries = 0

    def _push_loop(self):
        last_seq = 0
        while self._running:
            tcp = None
            try:
                tcp, phone_ip = self._connect_phone()
                if tcp is None:
                    raise OSError("phone receiver not found")

                self._last_phone_ip = phone_ip
                self.phone_ip = phone_ip
                self.connected = True
                print("PUSH CONNECTED: {}:{}".format(
                    phone_ip, PHONE_FRAME_PORT))

                while self._running:
                    jpeg, seq = self._fetch(last_seq)
                    if jpeg is None:
                        time.sleep_ms(10)
                        self._yield_thread()
                        continue
                    last_seq = seq
                    header = FRAME_MAGIC + len(jpeg).to_bytes(4, "little")
                    self._send_all(tcp, header)
                    self._send_all(tcp, jpeg)
                    self._yield_thread()
            except Exception as error:
                print("PUSH RETRY:", repr(error))
            finally:
                self.connected = False
                self.phone_ip = ""
                self._close(tcp)

            if self._running:
                time.sleep_ms(NETWORK_RETRY_MS)
                self._yield_thread()

fpioa = FPIOA()
fpioa.set_function(47, FPIOA.PWM3)
servo_pwm = PWM(3, freq=50, duty=0)

def servo_write(angle):
    if angle < 0: angle = 0
    if angle > 180: angle = 180
    pulse_us = int(500 + (angle / 180.0) * 2000)
    servo_pwm.duty_u16(int(pulse_us / 20000.0 * 65535))

# Buttons are active-low: connect each button between the GPIO pin and GND.
# Button 1 starts requirement 3; button 2 starts requirement 4 visual mode.
BTN_Q3_PIN = 17
BTN_Q4_PIN = 16
btn_q3 = Pin(BTN_Q3_PIN, Pin.IN, Pin.PULL_UP)
btn_q4 = Pin(BTN_Q4_PIN, Pin.IN, Pin.PULL_UP)

class PID:
    def __init__(self, kp, ki, kd, limit=OUTPUT_LIMIT):
        self.kp = kp; self.ki = ki; self.kd = kd; self.limit = limit
        self.integral = 0.0; self.prev_error = 0.0
        self.prev_derivative = 0.0; self.prev_time = time.ticks_ms()
    def reset(self):
        self.integral = 0.0; self.prev_error = 0.0
        self.prev_derivative = 0.0; self.prev_time = time.ticks_ms()
    def update(self, error):
        now = time.ticks_ms()
        dt = (now - self.prev_time) / 1000.0
        if dt <= 0: dt = 0.01
        p = self.kp * error
        self.integral += error * dt
        self.integral = max(-50.0, min(50.0, self.integral))
        i = self.ki * self.integral
        # Vision position contains frame-to-frame noise. Limit and smooth the
        # derivative so one noisy frame cannot command a large servo kick.
        raw_d = (error - self.prev_error) / dt
        raw_d = max(-30.0, min(30.0, raw_d))
        self.prev_derivative = 0.7 * self.prev_derivative + 0.3 * raw_d
        d = self.kd * self.prev_derivative
        output = p + i + d
        output = max(-self.limit, min(self.limit, output))
        self.prev_error = error
        self.prev_time = now
        return output

try: sensor.stop()
except: pass
try: Display.deinit()
except: pass
time.sleep_ms(200)
sensor = Sensor()
sensor.reset()
time.sleep_ms(200)
sensor.set_framesize(width=DETECT_W, height=DETECT_H, chn=CAM_CHN_ID_0)
sensor.set_pixformat(Sensor.RGB888, chn=CAM_CHN_ID_0)
try: sensor.set_auto_exposure(True, exposure=12000)
except: pass
Display.init(Display.ST7701, width=800, height=480, to_ide=True)
MediaManager.init()
sensor.run()

# Keep the proven initialization order: camera/display first, Wi-Fi second.
wireless = WirelessPush()
wireless.start()

def find_rod_simple(gray_np):
    small = cv2.resize(gray_np, (320, 240))
    scale_x = DETECT_W / 320
    scale_y = DETECT_H / 240
    _, thresh = cv2.threshold(small, 120, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best_rod = None
    best_area = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 1500: continue
        x, y, w, h = cv2.boundingRect(cnt)
        X = int(x * scale_x)
        Y = int(y * scale_y)
        W = int(w * scale_x)
        H = int(h * scale_y)
        if W > H:
            ratio = W / max(H, 1)
        else:
            ratio = H / max(W, 1)
        if ratio < 2.0: continue
        if area > best_area:
            best_area = area
            best_rod = {'left': X, 'right': X + W, 'top': Y, 'bottom': Y + H, 'width': W, 'height': H, 'horizontal': (W > H)}
    return best_rod

def find_ball_in_area(gray_np, x1, y1, x2, y2):
    if x2 <= x1 or y2 <= y1: return None
    small = cv2.resize(gray_np, (320, 240))
    scale_x = DETECT_W / 320
    scale_y = DETECT_H / 240
    edges = cv2.Canny(small, 20, 80)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    best_score = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        area_real = area * scale_x * scale_y
        if area_real < 50 or area_real > 2000: continue
        peri = cv2.arcLength(cnt, True)
        if peri == 0: continue
        circularity = 4 * math.pi * area / (peri * peri)
        if circularity < 0.5: continue
        (x, y), radius = cv2.minEnclosingCircle(cnt)
        cx = int(x * scale_x)
        cy = int(y * scale_y)
        r = int(radius * scale_x)
        if cx < x1 or cx > x2: continue
        if cy < y1 or cy > y2: continue
        try:
            brightness = int(np.mean(gray_np[cy-3:cy+3, cx-3:cx+3]))
            if brightness < 80: continue
        except: pass
        if r < 5 or r > 25: continue
        score = circularity
        if score > best_score:
            best_score = score
            best = (cx, cy, r, circularity)
    return best

def draw_scale(img, rod):
    if rod is None: return
    rod_px = rod['right'] - rod['left']
    cpx = rod['left'] + rod_px // 2
    img.draw_line(cpx, rod['top'], cpx, rod['bottom'], color=(255,255,255), thickness=3)
    img.draw_string_advanced(cpx-5, rod["top"]-18, 12, "0", color=(255,255,255))
    half_length_cm = ROD_LENGTH_MM / 20.0
    for v in [-5.0, 5.0]:
        px = rod["left"] + int((v + half_length_cm) / (2.0 * half_length_cm) * rod_px)
        img.draw_line(px, rod["top"]+3, px, rod["bottom"]-3, color=(255,0,255), thickness=2)
        img.draw_string_advanced(px-8, rod["top"]-18, 10, "%+.0f" % v, color=(255,0,255))
    for v in [-10.0, 10.0]:
        px = rod["left"] + int((v + half_length_cm) / (2.0 * half_length_cm) * rod_px)
        img.draw_line(px, rod["top"]+5, px, rod["bottom"]-5, color=(0,150,255), thickness=1)


print("=== {} ===".format(BUILD_ID))
servo_write(SERVO_CENTER_ANGLE)
time.sleep_ms(500)
pid = PID(KP, KI, KD)
rod_last = None; rod_stable = 0; ball_last_x = None; lost_frames = 0
pos_history = []; frame_count = 0; t_last = time.ticks_ms(); servo_now = 90.0
visual_prev_cm = None; visual_prev_ms = 0; visual_velocity_cm_s = 0.0
# States:
#   centering    startup center-lock phase
#   center       center lock confirmed, waiting for a test button
#   q3_to_plus   requirement 3: center -> +5 cm
#   q3_to_minus  requirement 3: +5 cm -> -5 cm
#   q3_done      requirement 3 complete, hold near -5 cm
#   q3_timeout   requirement 3 exceeded 5 seconds
#   q4_returning requirement 4: return the ball to center first
#   q4_active    requirement 4 visual center hold for 8 seconds
#   q4_done      requirement 4 visual window complete
state = "centering"
center_stable_start = 0
center_ready = False
q3_start_ms = 0; q3_elapsed_ms = 0; q3_stable_start = 0
q4_start_ms = 0; q4_elapsed_ms = 0; q4_max_error_cm = 0.0
q4_center_stable_start = 0
target = 0.0
btn_q3_last = 1
btn_q4_idle = btn_q4.value()
btn_q4_last = btn_q4_idle
btn_q3_debounce = 0; btn_q4_debounce = 0
print("START - BTN1: Q3, BTN2 idle level: %d" % btn_q4_idle)

while True:
    img = sensor.snapshot()
    frame_count += 1
    now_ms = time.ticks_ms()

    # Buttons (active-low, edge-triggered, independently debounced).
    q3_v = btn_q3.value()
    if q3_v == 0 and btn_q3_last == 1 and (now_ms - btn_q3_debounce) > 300:
        if state in ("centering", "center", "q3_done", "q3_timeout", "q4_done"):
            state = "q3_to_plus"
            q3_start_ms = now_ms
            q3_elapsed_ms = 0
            q3_stable_start = 0
            target = Q3_PLUS_TARGET_CM
            pid.reset()
            print("BTN1 -> Q3 START: +5cm THEN -5cm")
        btn_q3_debounce = now_ms
    btn_q3_last = q3_v

    q4_v = btn_q4.value()
    q4_pressed = (q4_v != btn_q4_idle)
    q4_was_idle = (btn_q4_last == btn_q4_idle)
    if q4_v != btn_q4_last:
        print("BTN2 RAW:%d IDLE:%d" % (q4_v, btn_q4_idle))
    if q4_pressed and q4_was_idle and (now_ms - btn_q4_debounce) > 300:
        if state not in ("q4_returning", "q4_active"):
            state = "q4_returning"
            q4_center_stable_start = 0
            q4_elapsed_ms = 0
            q4_max_error_cm = 0.0
            target = 0.0
            pid.reset()
            visual_prev_cm = None
            visual_prev_ms = 0
            visual_velocity_cm_s = 0.0
            print("BTN2 -> Q4 RETURN TO CENTER")
        btn_q4_debounce = now_ms
    btn_q4_last = q4_v

    if state in ("q3_to_plus", "q3_to_minus"):
        q3_elapsed_ms = time.ticks_diff(now_ms, q3_start_ms)
        if q3_elapsed_ms >= Q3_MAX_TIME_MS:
            state = "q3_timeout"
            target = -Q3_SAFE_TARGET_CM
            pid.reset()
            print("Q3 TIMEOUT: exceeded 5s")
    elif state == "q4_active":
        q4_elapsed_ms = time.ticks_diff(now_ms, q4_start_ms)
        if q4_elapsed_ms >= Q4_MAX_TIME_MS:
            state = "q4_done"
            q4_result = "PASS" if q4_max_error_cm <= Q4_ERROR_LIMIT_CM else "FAIL"
            print("Q4 VISUAL %s: MAX ERR %.2fcm" % (q4_result, q4_max_error_cm))

    img_np = img.to_numpy_ref()
    gray_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    rod = find_rod_simple(gray_np)
    if rod is not None:
        rod_stable += 1
        if rod_stable >= 2: rod_last = rod
    else:
        rod_stable = max(0, rod_stable - 1)

    ball_pos_cm = None

    if rod_last is not None:
        img.draw_rectangle(rod_last['left'], rod_last['top'], rod_last['width'], rod_last['height'], color=(0,255,0), thickness=1)
        rod_length_px = rod_last['right'] - rod_last['left']
        scale_mm_per_px = ROD_LENGTH_MM / rod_length_px
        center_px = rod_last['left'] + rod_length_px // 2
        center_y = rod_last['top'] + rod_last['height'] // 2
        img.draw_cross(center_px, center_y, color=(0,255,0), size=15)
        draw_scale(img, rod_last)
        ball = find_ball_in_area(gray_np, rod_last['left'], rod_last['top'], rod_last['right'], rod_last['bottom'])
        if ball and ball_last_x is not None:
            if abs(ball[0] - ball_last_x) > 80: ball = None
        if ball:
            cx, cy, r, circ = ball
            lost_frames = 0; ball_last_x = cx
            img.draw_circle(cx, cy, r, color=(255,0,0), thickness=2)
            img.draw_cross(cx, cy, color=(255,0,0), size=r+5, thickness=2)
            pos_mm = (cx - rod_last['left']) * scale_mm_per_px
            raw_cm = (pos_mm - CENTER_MM) / 10.0
            pos_history.append(raw_cm)
            if len(pos_history) > 3: pos_history.pop(0)
            ball_pos_cm = sum(pos_history) / len(pos_history)
        else:
            lost_frames += 1
            if ball_last_x is not None and lost_frames < 15:
                img.draw_string_advanced(10, 10, 14, "TRACKING...", color=(255,255,0))
            else:
                ball_last_x = None; pos_history.clear(); pid.reset()
                visual_prev_cm = None; visual_prev_ms = 0; visual_velocity_cm_s = 0.0

    # Servo lost ball -> hold center
    if ball_pos_cm is None and lost_frames > 5:
        servo_now = servo_now + (90.0 - servo_now) * 0.15
        servo_write(servo_now)

    # Control
    if ball_pos_cm is not None:
        if visual_prev_cm is not None:
            vdt = (now_ms - visual_prev_ms) / 1000.0
            if vdt > 0:
                raw_velocity = (ball_pos_cm - visual_prev_cm) / vdt
                raw_velocity = max(-20.0, min(20.0, raw_velocity))
                visual_velocity_cm_s = 0.7 * visual_velocity_cm_s + 0.3 * raw_velocity
        visual_prev_cm = ball_pos_cm
        visual_prev_ms = now_ms
        predicted_pos_cm = ball_pos_cm + visual_velocity_cm_s * Q3_LOOKAHEAD_S
        q3_boundary_pos = max(abs(ball_pos_cm), abs(predicted_pos_cm))

        if state == "centering":
            target = 0.0
            if abs(ball_pos_cm) <= 0.5:
                if center_stable_start == 0:
                    center_stable_start = now_ms
                elif (now_ms - center_stable_start) >= 1000:
                    state = "center"
                    center_ready = True
                    pid.reset()
                    print("CENTER READY: stable at 0cm")
            else:
                center_stable_start = 0
        elif state == "q3_to_plus":
            target = Q3_PLUS_TARGET_CM
            if ball_pos_cm >= Q3_PLUS_REACHED_CM:
                state = "q3_to_minus"
                q3_stable_start = 0
                target = -Q3_SAFE_TARGET_CM
                pid.reset()
                print("Q3 +5cm REACHED -> GO TO -5cm")
        elif state == "q3_to_minus":
            target = -Q3_SAFE_TARGET_CM
            final_in_range = (-5.0 <= ball_pos_cm <= -4.0)
            if final_in_range and abs(visual_velocity_cm_s) <= 1.0:
                if q3_stable_start == 0:
                    q3_stable_start = now_ms
                elif time.ticks_diff(now_ms, q3_stable_start) >= Q3_STABLE_TIME_MS:
                    q3_elapsed_ms = time.ticks_diff(now_ms, q3_start_ms)
                    state = "q3_done"
                    pid.reset()
                    print("Q3 DONE: %.2fs, POS %.2fcm" % (q3_elapsed_ms / 1000.0, ball_pos_cm))
            else:
                q3_stable_start = 0
        elif state in ("q3_done", "q3_timeout"):
            target = -Q3_SAFE_TARGET_CM
        elif state == "q4_returning":
            target = 0.0
            if abs(ball_pos_cm) <= 0.5:
                if q4_center_stable_start == 0:
                    q4_center_stable_start = now_ms
                elif time.ticks_diff(now_ms, q4_center_stable_start) >= Q4_CENTER_STABLE_MS:
                    state = "q4_active"
                    q4_start_ms = now_ms
                    q4_elapsed_ms = 0
                    q4_max_error_cm = 0.0
                    pid.reset()
                    print("Q4 CENTER READY -> START 8s HOLD")
            else:
                q4_center_stable_start = 0
        elif state in ("q4_active", "q4_done"):
            target = 0.0
            q4_max_error_cm = max(q4_max_error_cm, abs(ball_pos_cm))
        elif state == "center":
            target = 0.0

        error_cm = ball_pos_cm - target
        center_mode = state in ("centering", "center", "q4_returning", "q4_active", "q4_done")
        q3_mode = state in ("q3_to_plus", "q3_to_minus", "q3_done", "q3_timeout")

        if center_mode and abs(error_cm) <= CENTER_DEADBAND_CM:
            pid.reset()
            pid_out = 0.0
        else:
            if center_mode:
                # Vision-based PD: position pulls toward center, velocity
                # damps the motion when the ball is already moving inward.
                pid_out = (CENTER_VISUAL_KP * error_cm) + (CENTER_VISUAL_KD * visual_velocity_cm_s)
            elif q3_mode:
                pid_out = (Q3_VISUAL_KP * error_cm) + (Q3_VISUAL_KD * visual_velocity_cm_s)
            else:
                pid_out = pid.update(error_cm)
        if center_mode:
            if abs(error_cm) > CENTER_NEAR_CM:
                output_limit = CENTER_OUTPUT_LIMIT
            else:
                output_limit = CENTER_NEAR_LIMIT
            pid_out = max(-output_limit, min(output_limit, pid_out))
            if abs(error_cm) > CENTER_DEADBAND_CM and abs(pid_out) < CENTER_MIN_OUTPUT:
                pid_out = CENTER_MIN_OUTPUT if error_cm > 0 else -CENTER_MIN_OUTPUT
            max_step = CENTER_SERVO_STEP
        elif q3_mode:
            moving_outward = (ball_pos_cm * visual_velocity_cm_s) > 0
            if q3_boundary_pos >= Q3_EMERGENCY_CM:
                q3_limit = Q3_EMERGENCY_OUTPUT_LIMIT
                max_step = Q3_BRAKE_SERVO_STEP
            elif q3_boundary_pos >= Q3_BRAKE_ZONE_CM and moving_outward:
                q3_limit = Q3_BRAKE_OUTPUT_LIMIT
                max_step = Q3_BRAKE_SERVO_STEP
            else:
                q3_limit = Q3_OUTPUT_LIMIT
                max_step = Q3_SERVO_STEP
            pid_out = max(-q3_limit, min(q3_limit, pid_out))
        else:
            max_step = Q3_SERVO_STEP
        # Keep the servo direction from the original working version.
        servo_command = SERVO_CENTER_ANGLE + pid_out
        servo_command = max(0, min(180, servo_command))
        # Slew-limit the command so the mechanical system receives a gentle
        # correction instead of an abrupt angle jump.
        servo_delta = servo_command - servo_now
        servo_delta = max(-max_step, min(max_step, servo_delta))
        servo_now += servo_delta
        servo_write(servo_now)

        # Display
        if state == "centering":
            st = "CENTERING"; sc = (255,200,0)
        elif state == "center":
            if abs(error_cm) < CENTER_DEADBAND_CM: st = "CENTER"; sc = (0,255,0)
            elif error_cm > 0: st = "RIGHT"; sc = (255,80,80)
            else: st = "LEFT"; sc = (80,255,80)
        elif state == "q3_to_plus":
            st = "Q3 TO +5cm"; sc = (255,200,0)
        elif state == "q3_to_minus":
            st = "Q3 TO -5cm"; sc = (255,160,0)
        elif state == "q3_done":
            st = "Q3 DONE"; sc = (0,255,0)
        elif state == "q3_timeout":
            st = "Q3 TIMEOUT"; sc = (255,0,0)
        elif state == "q4_returning":
            st = "Q4 RETURN CENTER"; sc = (255,200,0)
        elif state == "q4_active":
            st = "Q4 CENTER HOLD"; sc = (0,200,255)
        else:
            if q4_max_error_cm <= Q4_ERROR_LIMIT_CM:
                st = "Q4 DONE PASS"; sc = (0,255,0)
            else:
                st = "Q4 DONE FAIL"; sc = (255,0,0)

        img.draw_string_advanced(10, 10, 18, st, color=sc)
        img.draw_string_advanced(555, 10, 12, "B2:%d" % q4_v, color=(255,255,0))
        img.draw_string_advanced(10, 32, 14, "POS:%+.2f TGT:%+.1f" % (ball_pos_cm, target), color=(255,255,255))
        img.draw_string_advanced(10, 50, 12, "ERR:%+.2f SVO:%.1f" % (error_cm, servo_now), color=(0,255,0))
        if q3_mode:
            img.draw_string_advanced(10, 66, 12, "Q3:%.2fs / 5.00s" % (q3_elapsed_ms / 1000.0), color=(255,255,0))
        elif state in ("q4_active", "q4_done"):
            img.draw_string_advanced(10, 66, 12, "Q4:%.2fs / 8.00s MAX:%.2f" % (q4_elapsed_ms / 1000.0, q4_max_error_cm), color=(255,255,0))

        if frame_count % 10 == 0:
            print("%s POS:%+.2f TGT:%+.1f ERR:%+.2f SVO:%.1f" % (st, ball_pos_cm, target, error_cm, servo_now))
    else:
        img.draw_string_advanced(10, 10, 18, "NO BALL", color=(255,0,0))

    # Free OpenCV arrays before JPEG encoding to reduce peak heap pressure.
    del img_np
    del gray_np

    if wireless.enabled:
        if wireless.connected:
            net_text = "NET:OK"
            net_color = (80,255,120)
        else:
            net_text = "NET:WAIT"
            net_color = (255,200,0)
    else:
        net_text = "NET:OFF"
        net_color = (255,80,80)
    img.draw_string_advanced(555, 28, 12, net_text, color=net_color)
    wireless.publish(img)

    Display.show_image(img, x=80, y=0)
    if frame_count % 30 == 0: gc.collect()
    if frame_count % 10 == 0:
        now2 = time.ticks_ms()
        fps = 10000 / max(1, time.ticks_diff(now2, t_last))
        t_last = now2
        print("FPS: %.1f" % fps)

wireless.stop()
sensor.stop()
Display.deinit()
MediaManager.deinit()
servo_write(SERVO_CENTER_ANGLE)
servo_pwm.deinit()
