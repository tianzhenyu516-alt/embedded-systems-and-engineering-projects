import time, os, sys
import math
from media.sensor import *
from media.display import *
from media.media import *
from machine import UART
from machine import FPIOA
from machine import Pin
from machine import Timer
from machine import PWM
import gc

tim = Timer(-1)  # 创建一个软件定时器

# 配置引脚
fpioa = FPIOA()
fpioa.set_function(50, FPIOA.UART3_TXD)
fpioa.set_function(51, FPIOA.UART3_RXD)
fpioa.set_function(62, FPIOA.GPIO62)
fpioa.set_function(20, FPIOA.GPIO20)
fpioa.set_function(63, FPIOA.GPIO63)

# 初始化串口
uart = UART(UART.UART3, baudrate=115200, bits=UART.EIGHTBITS, parity=UART.PARITY_NONE, stop=UART.STOPBITS_ONE)

# 实例化LED灯
LED_R = Pin(62, Pin.OUT, pull=Pin.PULL_NONE, drive=7)  # 红灯
LED_G = Pin(20, Pin.OUT, pull=Pin.PULL_NONE, drive=7)  # 绿灯
LED_B = Pin(63, Pin.OUT, pull=Pin.PULL_NONE, drive=7)  # 蓝灯
# 初始化时关闭所有LED
LED_R.high()
LED_G.high()
LED_B.high()

# 配置蜂鸣器IO口功能
beep_io = FPIOA()
beep_io.set_function(43, FPIOA.PWM1)

# 初始化蜂鸣器PWM通道
beep_pwm = PWM(1, 4000, 50, enable=False)  # 默认频率4kHz,占空比50%

# 全局变量


Di_Yi=0

######################################




prev_rect = None  # 保存上一次的有效矩形
lost_counter = 0  # 丢失计数
update_threshold = 0.1  # 更新阈值
smooth_factor = 0.8  # 平滑因子
max_lost_frames = 40  # 最大丢失帧数
GC2093_CSI2 = 25
black_th = (0, 39)  # 黑色棋子阈值
white_th = (249, 255)  # 白色棋子阈值
threshold = 3400  # 矩形检测的阈值
k1 = 0.534  # x的标定
k2 = 0.61538  # y的标定
Di_Er = 0
Di_Er_Ci_Shu = 0
Di_San = 0
Di_San_Ci_Shu = 0
Di_San_Shu = 0
Di_Si = 0
Di_Si_Shu =0
Di_Si_Ci_Shu = 0
Di_Wu = 0
Di_Liu = 0
Di_Liu_Ci = 0
Di_Liu_Ci_Shu = 0
grid_id_1 = 0
grid_id_2 = 0
array1 = []
array2 = []

Task_All_State=0
lamp=0   #指示识别是否成功

cell = {}  # 棋盘格子坐标的字典
rect_coordinate = 0  # 状态
rect_coordinate = 0
i = 1  #第四题的按棋子顺序发送
er = 1 #第二三题计数
rect_nei_1 = 0 #棋盘内识别状态第四题
rect_nei_2 = 0 #棋盘内识别状态第五题

rect_only = 0  # 只识别格子的状态机
cell_coords = {i: [0, 0] for i in range(1, 10)}  # {1: [0,0], ..., 9: [0,0]}
ji_lei_cell = 0
di_san=0
avg_cell = {}
stable_board_state = [[0 for _ in range(3)] for _ in range(3)]  # 最终稳定的棋盘状态
temp_board_state = [[0 for _ in range(3)] for _ in range(3)]  # 临时状态缓存
stable_counter = 0  # 稳定计数器
stable_threshold = 5  # 稳定帧数阈值
black_chess = {}
white_chess = {}

all_x = 0
all_y = 0
all_r = 0
shu_1 = 0
shu_2 = 0
#########################################第六题################################################
def deep_copy_list(lst):#手动深拷贝
    result = []
    for item in lst:
        if isinstance(item, list):
            result.append(deep_copy_list(item))  # 递归处理嵌套列表
        else:
            result.append(item)
    return result
def wrong(array1,array2):
    grid_id_1 = 0
    grid_id_2 = 0
    if array1 and array2:
        result = [
            [a ^ b for a, b in zip(row1, row2)]  #按位异,
            for row1, row2 in zip(array1, array2)
        ]

        result_1 = [
            [a & b for a, b in zip(row1, row2)]  #分别与result按位与
            for row1, row2 in zip(array1, result)
        ]

        result_2 = [
            [a & b for a, b in zip(row1, row2)]
            for row1, row2 in zip(result, array2)
        ]
        for i in range(3):
            for j in range(3):
                if result_1[i][j] != 0:
                    row_1=i+1
                    col_1=j+1
                    grid_id_1=(row_1-1)*3+col_1
        for i in range(3):
            for j in range(3):
                if result_2[i][j] != 0:
                    row_2=i+1
                    col_2=j+1
                    grid_id_2=(row_2-1)*3+col_2
        i = 0

    return grid_id_1 , grid_id_2

#########################################第四题,装置黑棋,玩家白棋############################################
def evaluate_board(board):
    """评估棋盘状态，AI为(2)，玩家为(1)"""
    # 检查行、列、对角线是否有三子连线（直接胜负）
    for i in range(3):
        # 行
        if board[i][0] == board[i][1] == board[i][2] != 0:
            return 100 if board[i][0] == 2 else -100  # 直接胜利或失败，赋予极高分数
        # 列
        if board[0][i] == board[1][i] == board[2][i] != 0:
            return 100 if board[0][i] == 2 else -100
    # 对角线
    if board[0][0] == board[1][1] == board[2][2] != 0:
        return 100 if board[0][0] == 2 else -100
    if board[0][2] == board[1][1] == board[2][0] != 0:
        return 100 if board[0][2] == 2 else -100

    # 检查是否平局
    if all(board[i][j] != 0 for i in range(3) for j in range(3)):
        return 0

    # 额外评估：检查两子连线（潜在胜利或威胁）
    ai_score = 0
    player_score = 0

    # 检查行
    for i in range(3):
        ai_count = sum(1 for j in range(3) if board[i][j] == 2)
        player_count = sum(1 for j in range(3) if board[i][j] == 1)
        empty_count = sum(1 for j in range(3) if board[i][j] == 0)
        if ai_count == 2 and empty_count == 1:
            ai_score += 10  # AI 有两子连线，优先完成三子
        if player_count == 2 and empty_count == 1:
            player_score += 10  # 玩家有两子连线，AI 需阻挡

    # 检查列
    for j in range(3):
        ai_count = sum(1 for i in range(3) if board[i][j] == 2)
        player_count = sum(1 for i in range(3) if board[i][j] == 1)
        empty_count = sum(1 for i in range(3) if board[i][j] == 0)
        if ai_count == 2 and empty_count == 1:
            ai_score += 10
        if player_count == 2 and empty_count == 1:
            player_score += 10

    # 检查主对角线
    ai_count = sum(1 for i in range(3) if board[i][i] == 2)
    player_count = sum(1 for i in range(3) if board[i][i] == 1)
    empty_count = sum(1 for i in range(3) if board[i][i] == 0)
    if ai_count == 2 and empty_count == 1:
        ai_score += 10
    if player_count == 2 and empty_count == 1:
        player_score += 10

    # 检查副对角线
    ai_count = sum(1 for i in range(3) if board[i][2 - i] == 2)
    player_count = sum(1 for i in range(3) if board[i][2 - i] == 1)
    empty_count = sum(1 for i in range(3) if board[i][2 - i] == 0)
    if ai_count == 2 and empty_count == 1:
        ai_score += 10
    if player_count == 2 and empty_count == 1:
        player_score += 10

    # 综合评分：AI 得分 - 玩家得分
    score = ai_score - player_score

    # 如果没有直接胜负或平局，返回额外评估的分数
    return score if score != 0 else None  # 游戏未结束，返回评估分数或 None

#def is_game_over(board):
#    """判断游戏是否结束"""
#    result = evaluate_board(board)
#    return result is not None and abs(result) >= 100  # 只有胜负时才结束游戏
def is_game_over(board):
    """
    判断游戏是否结束。
    返回: (bool: 是否结束, int: 100 AI胜, -100 玩家胜, 0 平局, None 未结束)
    """
    # 检查胜负
    for i in range(3):
        if board[i][0] == board[i][1] == board[i][2] != 0:
            return  (100 if board[i][0] == 2 else -100)
        if board[0][i] == board[1][i] == board[2][i] != 0:
            return  (100 if board[0][i] == 2 else -100)
    if board[0][0] == board[1][1] == board[2][2] != 0:
        return  (100 if board[0][0] == 2 else -100)
    if board[0][2] == board[1][1] == board[2][0] != 0:
        return  (100 if board[0][2] == 2 else -100)

    # 检查平局 (没有可落子位置了)
    if not get_available_moves(board):
        return 50 # 平局

    return False # 游戏未结束

def get_available_moves(board):
    """获取可用的落子位置"""
    moves = []
    for i in range(3):
        for j in range(3):
            if board[i][j] == 0:
                moves.append((i, j))
    return moves

def minimax(board, depth, is_maximizing):
    """Minimax算法实现，AI为黑棋(2)，玩家为白棋(1)"""
    result = evaluate_board(board)
    if result is not None and abs(result) >= 100:  # 只有胜负时才直接返回
        return result
    if depth >= 9:  # 限制最大深度，避免无意义搜索
        return result if result is not None else 0

    if is_maximizing:  # AI回合，最大化得分
        best_score = float('-inf')
        for move in get_available_moves(board):
            board[move[0]][move[1]] = 2  # 模拟AI落子
            score = minimax(board, depth + 1, False)
            board[move[0]][move[1]] = 0  # 撤销落子
            best_score = max(score, best_score)
        return best_score
    else:  # 玩家回合，最小化得分
        best_score = float('inf')
        for move in get_available_moves(board):
            board[move[0]][move[1]] = 1  # 模拟玩家落子
            score = minimax(board, depth + 1, True)
            board[move[0]][move[1]] = 0  # 撤销落子
            best_score = min(score, best_score)
        return best_score

def find_best_move(board):
    """找到AI的最佳落子位置"""
    best_score = float('-inf')
    best_move = None
    for move in get_available_moves(board):
        board[move[0]][move[1]] = 2  # 模拟AI落子
        score = minimax(board, 0, False)
        board[move[0]][move[1]] = 0  # 撤销落子
        if score > best_score:
            best_score = score
            best_move = move
    return best_move
##############################################第五题,装置白棋(2),玩家黑棋(1)#################
def evaluate_board_1(board):
    """评估棋盘状态，AI为(2)，玩家为(1)"""
    # 检查行、列、对角线是否有三子连线（直接胜负）
    for i in range(3):
        # 行
        if board[i][0] == board[i][1] == board[i][2] != 0:
            return 100 if board[i][0] == 2 else -100
        # 列
        if board[0][i] == board[1][i] == board[2][i] != 0:
            return 100 if board[0][i] == 2 else -100
    # 对角线
    if board[0][0] == board[1][1] == board[2][2] != 0:
        return 100 if board[0][0] == 2 else -100
    if board[0][2] == board[1][1] == board[2][0] != 0:
        return 100 if board[0][2] == 2 else -100

    # 检查是否平局 (棋盘满了且没有胜负)
    if all(board[i][j] != 0 for i in range(3) for j in range(3)):
        return 0

    # 额外评估：检查两子连线（潜在胜利或威胁）
    ai_score = 0
    player_score = 0

    # 统一检查所有可能的连线 (行、列、对角线)
    lines_to_check = []
    # 行
    for r_idx in range(3):
        lines_to_check.append([(board[r_idx][c_idx]) for c_idx in range(3)])
    # 列
    for c_idx in range(3):
        lines_to_check.append([(board[r_idx][c_idx]) for r_idx in range(3)])
    # 主对角线
    lines_to_check.append([board[i][i] for i in range(3)])
    # 副对角线
    lines_to_check.append([board[i][2 - i] for i in range(3)])

    for line in lines_to_check:
        ai_count = line.count(2)
        player_count = line.count(1)
        empty_count = line.count(0)

        if ai_count == 2 and empty_count == 1:
            ai_score += 10  # AI 有两子连线，优先完成三子
        if player_count == 2 and empty_count == 1:
            player_score += 10  # 玩家有两子连线，AI 需阻挡

    # 综合评分：AI 得分 - 玩家得分
    score = ai_score - player_score

    # 如果没有直接胜负或平局，返回额外评估的分数
    # *******************************************************************
    # 修改点 1: 总是返回数值score。如果游戏未结束且无特殊情况，score为0。
    # *******************************************************************
    return score

def get_available_moves_1(board): # 确保此函数可用
    """获取可用的落子位置"""
    moves = []
    for i in range(3):
        for j in range(3):
            if board[i][j] == 0:
                moves.append((i, j))
    return moves

def minimax_1(board, depth, is_maximizing):
    """Minimax算法实现，AI为(2)，玩家为(1)"""
    result = evaluate_board_1(board) # evaluate_board_1 现在总是返回一个数字

    # 终止条件：
    # 1. 如果游戏已经决出胜负 (result是100或-100)
    if result == 100 or result == -100:
        return result

    # 2. 如果是平局 (棋盘满了，evaluate_board_1会返回0)
    #    或者没有可走的路了 (更通用的平局判断)
    if not get_available_moves_1(board): # 棋盘满了 (且上面判断了不是胜负局)
        return 0 # 平局分数为0 (evaluate_board_1在这种情况下也会返回0)

    # 3. 井字棋的深度最多9步 (depth 0 到 8).
    #    如果depth >= 9, 意味着棋盘满了。这个情况已经被 get_available_moves_1() 覆盖。
    #    原始代码的 'if depth >= 9:' 在这里可以认为是检查棋盘是否已满。
    #    如果 evaluate_board_1 返回的 result 不是胜负，且 depth >= 9 (棋盘满)，
    #    那么 result 必然是 0 (平局)。
    # *******************************************************************
    # 修改点 2: 简化 depth >= 9 的处理，因为 result 不再是 None
    # *******************************************************************
    if depth >= 9: # 对于井字棋，这通常意味着棋盘已满，即平局 (如果不是胜/负)
        return result #此时 result 应该是 0 (平局)

    if is_maximizing:  # AI回合 (2), 最大化得分
        best_score = -math.inf # 使用 math.inf
        for move in get_available_moves_1(board):
            board[move[0]][move[1]] = 2
            score = minimax_1(board, depth + 1, False)
            board[move[0]][move[1]] = 0
            best_score = max(score, best_score)
        return best_score
    else:  # 玩家回合 (1), 最小化AI得分
        best_score = math.inf # 使用 math.inf
        for move in get_available_moves_1(board):
            board[move[0]][move[1]] = 1
            score = minimax_1(board, depth + 1, True)
            board[move[0]][move[1]] = 0
            best_score = min(score, best_score)
        return best_score

def find_best_move_1(board):
    """找到AI的最佳落子位置"""
    best_score = -math.inf # 使用 math.inf
    best_move = None
    # AI是2号棋子，轮到AI走棋，所以下一层是玩家走棋（minimizing player）
    for move in get_available_moves_1(board):
        board[move[0]][move[1]] = 2  # AI (2) 尝试走这一步
        # AI走了之后，轮到玩家(1)走，所以is_maximizing是False
        score = minimax_1(board, 0, False) # 初始深度为0，轮到对方（玩家）
        board[move[0]][move[1]] = 0  # 撤销落子
        if score > best_score:
            best_score = score
            best_move = move
    return best_move

# (可选) 修改 is_game_over_1 以便在游戏主循环中使用
def is_game_over_1(board):
    """
    判断游戏是否结束。
    返回: (bool: 是否结束, int: 100 AI胜, -100 玩家胜, 0 平局, None 未结束)
    """
    # 检查胜负
    for i in range(3):
        if board[i][0] == board[i][1] == board[i][2] != 0:
            return  (100 if board[i][0] == 2 else -100)
        if board[0][i] == board[1][i] == board[2][i] != 0:
            return  (100 if board[0][i] == 2 else -100)
    if board[0][0] == board[1][1] == board[2][2] != 0:
        return  (100 if board[0][0] == 2 else -100)
    if board[0][2] == board[1][1] == board[2][0] != 0:
        return  (100 if board[0][2] == 2 else -100)

    # 检查平局 (没有可落子位置了)
    if not get_available_moves_1(board):
        return 50 # 平局

    return False # 游戏未结束
#def is_game_over_1(board):
#    """判断游戏是否结束"""
#    result = evaluate_board_1(board)
#    return result is not None and abs(result) >= 100  # 只有胜负时才结束游戏

##############################矩形检测#######################################################
def sort_corners(corners):
    """几何中心排序法，适应任意旋转，以 y 值最小的点为起点顺时针排序"""
    if len(corners) != 4:
        return corners  # 如果不是四个角点，直接返回

    # 计算几何中心
    center_x = sum(p[0] for p in corners) / 4
    center_y = sum(p[1] for p in corners) / 4
    center = (center_x, center_y)

    # 找到 y 值最小的点作为起点
    top_point = min(corners, key=lambda p: p[1])

    # 按角度排序，相对于中心点，atan2 的结果从 -π 到 π，顺时针排序
    sorted_corners = sorted(
        corners,
        key=lambda p: math.atan2(p[1] - center[1], p[0] - center[0]),
        reverse=False  # reverse=True 确保顺时针排序
    )
    # 调整顺序，使 y 值最小的点作为第一个点
    top_idx = sorted_corners.index(top_point)
    sorted_corners = sorted_corners[top_idx:] + sorted_corners[:top_idx]
    if abs(sorted_corners[0][1]-sorted_corners[1][1])>=150:
        temp_corners=sorted(corners, key=lambda p: math.atan2(p[1] - center[1], p[0] - center[0]))
    else:
        temp_corners=sorted_corners
    return temp_corners

def calculate_9grid(board_corners):
    """根据棋盘四个角点生成九宫格坐标"""
    def interpolate(p1, p2, ratio):
        x = p1[0] + (p2[0] - p1[0]) * ratio
        y = p1[1] + (p2[1] - p1[1]) * ratio
        return (int(x), int(y))

    tl, tr, br, bl = board_corners
    grid_points = []
    for y_ratio in [i/3 for i in range(4)]:
        row = []
        for x_ratio in [j/3 for j in range(4)]:
            top = interpolate(tl, tr, x_ratio)
            bottom = interpolate(bl, br, x_ratio)
            point = interpolate(top, bottom, y_ratio)
            row.append(point)
        grid_points.append(row)

    grid_dict = {}
    for row in range(3):
        for col in range(3):
            grid_id = row * 3 + col + 1
            top_left = grid_points[row][col]
            top_right = grid_points[row][col+1]
            bottom_right = grid_points[row+1][col+1]
            bottom_left = grid_points[row+1][col]
            center_x = (top_left[0] + top_right[0] + bottom_right[0] + bottom_left[0]) // 4
            center_y = (top_left[1] + top_right[1] + bottom_right[1] + bottom_left[1]) // 4
            grid_dict[grid_id] = {
                "corners": [top_left, top_right, bottom_right, bottom_left],
                "center": (center_x, center_y)
            }
    return grid_dict

def draw_9grid(img, grid_data):
    """绘制九宫格、中心点和编号"""
    if grid_data is None:
        return img, {}
    cell = {}
    for grid_id, grid in grid_data.items():
        corners = grid["corners"]
        for i in range(4):
            x0, y0 = corners[i]
            x1, y1 = corners[(i+1) % 4]
#            img.draw_line(x0, y0, x1, y1, color=1, thickness=1)
        cx, cy = grid["center"]
#        img.draw_cross(cx, cy, color=1, thickness=1)
        # 绘制格子编号
#        img.draw_string(cx - 5, cy - 10, str(grid_id), color=255, scale=1)
        cell[grid_id] = (cx, cy)
    return img, cell

def mend(cell,th):
    avg_cell = {}
    if cell:
        avg_cell = {k: list(v) for k, v in cell.items()}  # 复制所有格子
        # 处理每个格子前，先检查是否存在且长度足够
        for key in [1, 2, 3, 4, 5,6, 7, 8, 9]:  # 只处理需要修改的格子
            if key in cell and len(cell[key]) >=1:
                avg_cell[key] = list(cell[key])  # 复制原列表到avg_cell
                # 根据格子编号进行修改
                if key == 1:
                    avg_cell[key][0] += th+3
                    avg_cell[key][1] += th-2
                elif key == 2:
                    avg_cell[key][0] += 4
                    avg_cell[key][1] += 3
                elif key == 3:
                    avg_cell[key][0] += 1
                    avg_cell[key][1] += th
                elif key == 4:
                    avg_cell[key][0] += th+1
                    avg_cell[key][1] -= 1

                elif key == 5:
                    avg_cell[key][0] += th-1
                    avg_cell[key][1] -= 2

                elif key == 6:
                    avg_cell[key][0] -= 1
                    avg_cell[key][1] -= 1

                elif key == 7:
                    avg_cell[key][0] += th
                    avg_cell[key][1] -= th+1
                elif key == 8:
                    avg_cell[key][0] += 2
                    avg_cell[key][1] -= 4
                elif key == 9:
                    avg_cell[key][0] -= 1
                    avg_cell[key][1] -= th
    return avg_cell
#
def mend_1(avg_cell,th):
    avg_cell_1 = {}
    if cell:
        avg_cell_1 = {k: list(v) for k, v in cell.items()}  # 复制所有格子
        # 处理每个格子前，先检查是否存在且长度足够
        for key in [1, 2, 3, 4, 5,6, 7, 8, 9]:  # 只处理需要修改的格子
            if key in avg_cell_1 and len(avg_cell[key]) >=1:
                avg_cell_1[key] = list(avg_cell[key])  # 复制原列表到avg_cell
                # 根据格子编号进行修改
                if key == 1:
                    avg_cell_1[key][0] -= 0
                    avg_cell_1[key][1] += 0
                elif key == 2:
                    avg_cell_1[key][1] += 0
                elif key == 3:
                    avg_cell_1[key][0] -= 3
                    avg_cell_1[key][1] -= 5
                elif key == 4:
                    avg_cell_1[key][0] += 2
                    avg_cell_1[key][1] += 1

                elif key == 5:
                    avg_cell_1[key][0] -= 1
                    avg_cell_1[key][1] += 0

                elif key == 6:
                    avg_cell_1[key][0] -= 0
                    avg_cell_1[key][1] -= 4

                elif key == 7:
                    avg_cell_1[key][0] += 1
                    avg_cell_1[key][1] += 1
                elif key == 8:
                    avg_cell_1[key][0] += 2
                    avg_cell_1[key][1] -= 2
                elif key == 9:
                    avg_cell_1[key][0] -= 1
                    avg_cell_1[key][1] -= 3
    return avg_cell_1


def find_max_rect(rects):
    if not rects:
        return None  # 或者抛出异常

    # 初始化最大矩形为第一个矩形
    rect_max = rects[0]
    max_area = rect_max.w() * rect_max.h()  # 计算面积

    for rect in rects:
        current_area = rect.w() * rect.h()
        if current_area > max_area:
            rect_max = rect
            max_area = current_area
    return rect_max

def detect_rect(img):
    global prev_rect, lost_counter, avg_cell, ji_lei_cell  # 添加avg_cell和ji_lei_cell为全局变量
    max_rect = None
    max_area = 0
    rect = None
    dst_img=img.to_grayscale(copy=True) #转灰度图
    h = dst_img.height()
#        roi = (100, 0, 250, h)
#        dut_img=dst_img.copy(roi=(104, 0, 256, h))

    dst_img.gaussian(2,unsharp=True) #高斯滤波
    dst_img.find_edges(image.EDGE_CANNY, threshold=(50, 150)) #canny边缘检测
    dst_img.dilate(2) #膨胀
    dst_img.erode(1) #服饰
#        graph=img.laplacian(1,sharpen=True)#拉普拉斯核进行边缘检测
    rects=dst_img.find_rects(threshold=160000)
    if rects:
        rect_max = find_max_rect(rects)
        if 300>rect_max.w()>150 and 300>rect_max.h()>150:
            rect = rect_max
            if rect:
                time.sleep(0.3)
            else:
                time.sleep(0.3)

    if rect:
        if isinstance(rect, dict):
            corners = rect["corners"]
        else:
            corners = rect.corners()
        sorted_corners = sort_corners(corners)
        if len(sorted_corners) == 4:
            grid_data = calculate_9grid(sorted_corners)

            img, _ = draw_9grid(img, grid_data)
            for i in range(4):
                x0, y0 = sorted_corners[i]
                x1, y1 = sorted_corners[(i+1) % 4]
#                img.draw_line(x0, y0, x1, y1, color=1, thickness=2)
    else:
        grid_data = None

    return rect, grid_data
####################################棋子识别#######################################
def chess_lvbo(x, y, r):  #均值滤波
    global all_x, all_y, all_r, shu_1, shu_2
    shu_1 += 1
    if shu_1 <= 30:
        all_x += x
        all_y += y
        all_r += r
        shu_2 += 1
    if shu_2 >= 50:
        return all_x/shu_2, all_y/shu_2, all_r/shu_2
    return 0, 0, 0

def chess_pieces_nei_1(img, avg_cell):   #棋盘内妻子识别(玩家白棋为1,装置黑棋为2)
    global stable_board_state,  stable_counter
    dst_img=img.to_grayscale(copy=True) #转灰度图

    for key,value in avg_cell.items():
        x,y = value
        grid_id = key
        th = dst_img.get_pixel(x, y)
        #检验阈值
#            text=str(th)
#            img.draw_string_advanced(x,y,20,text,color=255)
        if th <=80:
#            img.draw_string_advanced(x,y,20,'black',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 2

        elif th>=150:
#            img.draw_string_advanced(x,y,20,'white',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 1
        else:
#            img.draw_string_advanced(x,y,20,'none',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 0

    return stable_board_state
#
def chess_pieces_nei_2(img, avg_cell):   #棋盘内妻子识别(玩家黑棋为1,装置白棋为2)
    global stable_board_state,  stable_counter
    dst_img=img.to_grayscale(copy=True) #转灰度图

    for key,value in avg_cell.items():
        x,y = value
        grid_id = key
        th = dst_img.get_pixel(x, y)
        #检验阈值
#            text=str(th)
#            img.draw_string_advanced(x,y,20,text,color=255)
        if th <=80:
#            img.draw_string_advanced(x,y,20,'black',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 1

        elif th>=150:
#            img.draw_string_advanced(x,y,20,'white',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 2
        else:
#            img.draw_string_advanced(x,y,20,'none',color=255)
            row = (grid_id - 1) // 3
            col = (grid_id - 1) % 3
            stable_board_state[row][col] = 0

    return stable_board_state

def chess_pieces_wai(img, avg_cell): #棋盘外棋子识别
    black_blobs = []
    white_blobs = []
    black_chess = {}
    white_chess = {}
    chess_counter = 1

    if avg_cell:
        x1, y1 = avg_cell[1]
        x3, y3 = avg_cell[3]
        x7, y7 = avg_cell[7]
        x9, y9 = avg_cell[9]
    else:
        return {}, {}

    dst_img=img.to_grayscale(copy=True) #转灰度图
    dut_img=dst_img.copy()
    dut_img.gaussian(2,unsharp=True) #高斯滤波
    dut_img.find_edges(image.EDGE_CANNY, threshold=(50, 80)) #canny边缘检测
    dut_img.dilate(3) #膨胀
    dut_img.erode(2) #服饰
    #graph=img.laplacian(1,sharpen=True)#拉普拉斯核进行边缘检测
    h = dut_img.height()
    w = dut_img.width()
    if avg_cell:
        x1, y1 = avg_cell[1]
        x3, y3 = avg_cell[3]
        x7, y7 = avg_cell[7]
        x9, y9 = avg_cell[9]
    else:
        return {}, {}

    # ROI区域设置（根据需求调整）
#    roi = (0, 0, 200, h)
    #

    h = dst_img.height()
    roi_1 = (0, 0, 100, h) #黑棋子
    graph_1 = dut_img.find_circles(roi_1,threshold = 5500)

    roi_2 = (300, 0, 400, h) #白棋子
    graph_2 = dut_img.find_circles(roi_2,threshold = 5500)
    ji_shu = 0
    if graph_1:

        for t in graph_1:
            x,y,r = t.x(),t.y(),t.r()
            if 16<t.r() and t.r()<24:
#                img.draw_circle(x, y,r, color = 255, thickness=3)
                center_color = dst_img.get_pixel(x, y)


                if center_color < 80:
                    black_blobs.append((x, y, r))
    #
    if graph_2:

        for t in graph_2:
            x,y,r = t.x(),t.y(),t.r()
            if 16<t.r() and t.r()<24:
#                img.draw_circle(x, y,r, color = 255, thickness=3)
                center_color = dst_img.get_pixel(x, y)


                if center_color >180:
                    white_blobs.append((x, y, r))
    # 处理棋盘外黑棋
    if black_blobs:
        sorted_coordinates = sorted(black_blobs, key=lambda point: point[1])
        for i in range(len(sorted_coordinates)):
            black_chess[i+1] = sorted_coordinates[i][:2]

    # 处理棋盘外白棋
    if white_blobs:
        sorted_coordinates = sorted(white_blobs, key=lambda point: point[1])
        for i in range(len(sorted_coordinates)):
            white_chess[i+1] = sorted_coordinates[i][:2]

    return black_chess, white_chess

########################################## 串口通信函数#######################################
def shell_black(coordinates,HEAD,FOOT):  #黑棋子数据包
    #把坐标元组拆为x,y
    x,y = coordinates
    # 协议定义
    TYPE = 0xB5       # 数据类型(坐标)
    cx = int(x*k1)
    cy = int(y*k2)
    # 拆分坐标到高低字节
    #x_high = (x >> 8) & 0xFF
    #x_low = x & 0xFF
    #y_high = (y >> 8) & 0xFF
    #y_low = y & 0xFF


    # 构建数据包
    #packet = bytes([HEAD, TYPE, x_high, x_low, y_high, y_low, FOOT])
    packet = bytes([HEAD, TYPE, cx, cy, FOOT])
    # 发送数据
    uart.write(packet)

def shell_white(coordinates,HEAD,FOOT):   #白棋子的数据包
    #把坐标元组拆为x,y
    x,y = coordinates
    # 协议定义
    TYPE = 0xC5       # 数据类型(坐标)
    cx = int(x*k1)
    cy = int(y*k2)
    packet = bytes([HEAD, TYPE, cx, cy, FOOT])
    # 发送数据
    uart.write(packet)

def send_cell(coordinates,HEAD,FOOT):#棋盘的数据包
    #把坐标元组拆为x,y
    x,y = coordinates
    # 协议定义
    TYPE = 0xA9       # 数据类型(坐标)
    cx = int(x*k1-2)
    cy = int(y*k2)
    packet = bytes([HEAD, TYPE, cx, cy, FOOT])
    # 发送数据
    uart.write(packet)
###############################初始化#######################
try:
    sensor = Sensor(width=1280, height=960, fps=20)
    sensor.reset()
    sensor.set_framesize(width=480, height=320, chn=CAM_CHN_ID_0)
    sensor.set_pixformat(Sensor.RGB565)
    sensor.set_hmirror(False)
    sensor.set_vflip(False)
    Display.init(Display.ST7701, to_ide=True)
    MediaManager.init()
    sensor.run()
    clock = time.clock()
    received_message = b''
##################################循环#####################
    while True:
        os.exitpoint()
        img = sensor.snapshot()
        if lamp==0:
            LED_R.low() #未识别成功红灯

        # 棋盘识别流程
        if rect_coordinate == 0  :
            prev_rect, grid_data = detect_rect(img)
            if grid_data:
                img, cell = draw_9grid(img, grid_data)
                th = 4    #棋盘中心移动的距离
                avg_cell = mend (cell,th)   #棋盘因识别大一圈需写死一个格子中心移动
                rect_coordinate = 1 #识别结束 判定合不合法
                time.sleep(0.3)
            else:
                avg_cell = {}
                rect_coordinate = 0 #没识别结束

        elif rect_coordinate == 1:  #判定是否合法
            if avg_cell:
                x1, y1 = avg_cell[1]
                x3, y3 = avg_cell[3]
                x7, y7 = avg_cell[7]
                x9, y9 = avg_cell[9]
                length_1 = (x3 - x7) ** 2 + (y3 - y7) ** 2
                length_2 = (x9 - x1) ** 2 + (y9 - y1) ** 2
                cha = abs(length_1 - length_2)
                if cha < 15000:
                    rect_coordinate = 2  #合法
                else:
                    rect_coordinate = 0 #不合法
            else:
                rect_coordinate = 0 #不合法
        #棋盘外棋子识别
        elif rect_coordinate == 2 :
            black_chess= {}
            white_chess ={}
            black_chess, white_chess = chess_pieces_wai(img, avg_cell)

            if len(black_chess) == 5 and len(white_chess) ==5:


                rect_coordinate = 3

            else:
                rect_coordinate = 2
        elif rect_coordinate == 3:  #识别结束亮绿灯
            lamp = 1
            rect_coordinate = 4

        if lamp == 1:
            # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
        #     关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)
            lamp = 2
        elif lamp == 2:
            LED_R.high()
            LED_G.low()


        #棋盘内情况
        if rect_nei_1 == 1:  #第四题识别棋盘内部的(白1,黑2)
            stable_board_state = chess_pieces_nei_1(img, avg_cell)
        elif rect_nei_2 == 1:  #第五题识别棋盘内部的(白2,黑1)
            stable_board_state = chess_pieces_nei_2(img, avg_cell)


        # 串口读取题目标志位
        if Task_All_State==0:

            received_data = uart.read()
            if received_data==b'\xa1':
                Task_All_State=1
                received_data = 0
                Di_Yi=1
            elif received_data==b'\xa2':
                Task_All_State=2
                received_data = 0
                Di_Er=1
            elif received_data == b'\xa3':
                Task_All_State=3
                received_data = 0
                Di_San=1
            elif received_data == b'\xa4':
                Task_All_State=4
                received_data = 0
                Di_Si=1
            elif received_data == b'\xa5':
                Task_All_State=5
                received_data = 0
                Di_Wu=1



        Display.show_image(img, 240, 160)

########################第一题###################################################
        if Di_Yi==1:
            # 发送应答
            uart.write(bytes([0x1A]))
            # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
            #关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)
            time.sleep(0.1)  # 短暂延时
            HEAD = 0xaa
            FOOT = 0x55
            # 发送第一个坐标
            shell_black(black_chess[1],HEAD,FOOT)#发送黑棋子
            time.sleep(0.1)
            received_data = uart.read()
            if received_data == b'\xb2':
                Di_Yi=2
                received_data = 0
#                received_message = 0  # 重置接收标志

        elif Di_Yi==2:
            time.sleep(0.1)
            # 发送格子坐标
            HEAD = 0xbb
            FOOT = 0x66

            if 5 in avg_cell:
                send_cell(avg_cell[5],HEAD,FOOT)
#            received_message = 0  # 重置接收标志
                Di_Yi = 0 #关闭第一题
                Task_All_State=0 #开启串口读取题目标志位
########################第二题##################################################


        if Di_Er ==1:
            uart.write(bytes([0x2A]))
           # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
            #关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)
            Di_Er =2
#            received_message = 0

        elif Di_Er ==2:#等待请求
#            received_message = b''
#            uart.write(bytes([0xBB]))

#            start_time = time.ticks_ms()
#            while len(received_message) < 4 and time.ticks_diff(time.ticks_ms(), start_time) < 2000:  # 1秒超时
#                received_data1 = uart.read()
            received_message = b''    #初始化接受数据位
            received_data = uart.read()  #读取请求串口数据
            if received_data:    #传递出去
                received_message = received_data

            if len(received_message) >= 4:  # 确保数据长度足够
                if received_message[0]== 0xcc and received_message[3]== 0x77:#请求合法
                    Di_Er =3
        elif Di_Er ==3:  #已判断合法性,等待发送数据(这一状态下只有发)
            HEAD = 0xcc
            FOOT = 0x77
            #格子
            if received_message[1] == 0xa9:
                grid_id = received_message[2]
                if grid_id in avg_cell:
                    send_cell(avg_cell[grid_id], HEAD, FOOT)#发送格子
                    time.sleep(0.05)
                    Di_Er =4#格子发送成功
                    Di_Er_Ci_Shu+=1

            #黑棋子
            elif received_message[1] == 0xb5:
                grid_id = received_message[2]
                if grid_id in black_chess :
                    shell_black(black_chess[grid_id],HEAD,FOOT)#发送黑棋子
                    time.sleep(0.05)
                    Di_Er = 4#黑棋发送成功
                    Di_Er_Ci_Shu +=1

            #白棋子
            elif received_message[1] == 0xc5:
                grid_id = received_message[2]
                if grid_id in white_chess :
                    shell_black(white_chess[grid_id],HEAD,FOOT)#发送白棋子
                    time.sleep(0.05)
                    Di_Er =4#白棋发送成功
                    Di_Er_Ci_Shu +=1

        elif Di_Er ==4:
            if Di_Er_Ci_Shu==8:       #第二题结束
                Di_Er=0               #关闭第二题
                Di_Er_Ci_Shu = 0      #重置计数器
                Task_All_State = 0  # 重置接收标志
            else:
                Di_Er=2               #请求还未完成继续读取

#            #应该识别了
#            avg_cell = {}  #重置识别
#            black_chess = {}
#            white_chess = {}
#            rect_coordinate = 0
#            received_message = 0
##                time.sleep(1)
#            Di_Er=5
##################### 第三题处理#######################################################################
        elif Di_San == 1:          #开启三题
            time.sleep(0.1)
            uart.write(bytes([0x3A]))
            # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
            #关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)
            th = 4    #棋盘中心移动的距离
            avg_cell_1 = mend_1 (avg_cell,th)   #棋盘因识别大一圈需写死一个格子中心移动
            Di_San = 2

        elif Di_San == 2:          #读取串口请求数据
            received_message = b''
#            start_time = time.ticks_ms()
#            while len(received_message) < 4 and time.ticks_diff(time.ticks_ms(), start_time) < 2000:
            received_data = uart.read()
            if received_data:
                received_message = received_data
            if len(received_message) >= 4:
                if received_message[0] == 0xc7 and received_message[3] == 0x7c:
                    Di_San = 3

        elif Di_San == 3:            #发送相应请求的数据
            HEAD = 0xc7
            FOOT = 0x7c
            if received_message[1] == 0xa9:
                grid_id = received_message[2]
                if grid_id in avg_cell:
                    send_cell(avg_cell[grid_id], HEAD, FOOT)
                    Di_San_Ci_Shu += 1
                    Di_San = 4

            elif received_message[1] == 0xb5:
                grid_id = received_message[2]
                if grid_id in black_chess:
                    shell_black(black_chess[grid_id], HEAD, FOOT)
                    Di_San_Ci_Shu += 1
                    Di_San = 4

            elif received_message[1] == 0xc5:
                grid_id = received_message[2]
                if grid_id in white_chess:
                    shell_white(white_chess[grid_id], HEAD, FOOT)
                    Di_San_Ci_Shu += 1
                    Di_San = 4

        elif Di_San == 4:
            if Di_San_Ci_Shu == 8:   #第四题结束
                Di_San = 0
                Di_San_Ci_Shu = 0
            else :                  #第四题未结束继续等待请求
                Di_San = 2
                received_message = b''
##########################################存入第一帧#######################################
        if Di_Liu == 1:
            array1 = deep_copy_list(stable_board_state)#拷贝第一帧
            received_message = 0
            Di_Liu =0
            time.sleep(0.3)  # 短暂延时
################################ 第四题处理########################################
        if Di_Si==1:
            # 发送应答
            uart.write(bytes([0x4A]))
            # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
            #关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)

            rect_nei_1=1
            time.sleep(0.05)  # 短暂延时
            if black_chess:
                time.sleep(0.1)
                Di_Si=2
        elif Di_Si==2:
            HEAD = 0xdd
            FOOT = 0x88
            received_message = b''
            received_data = uart.read()

            if received_data:
                received_message = received_data
                received_data = 0
            if len(received_message) >= 4:  #确保数据长度足够
                if received_message[0]== 0xdd and received_message[3]== 0x88:#请求合法
                    Di_Si =3
        elif Di_Si == 3:

            HEAD = 0xdd
            FOOT = 0x88
            time.sleep(0.2)

            if received_message[1] == 0xa9:
                grid_id = received_message[2]
                if grid_id in avg_cell:
                    send_cell(avg_cell[grid_id], HEAD, FOOT)

                    Di_Si_Ci_Shu += 1
                    Di_Si = 4

            elif received_message[1] == 0xb5:
                grid_id = received_message[2]
                if grid_id in black_chess:
                    shell_black(black_chess[grid_id], HEAD, FOOT)
                    Di_Si_Ci_Shu += 1
                    Di_Si = 4

            elif received_message[1] == 0xc5:
                grid_id = received_message[2]
                if grid_id in white_chess:
                    shell_white(white_chess[grid_id], HEAD, FOOT)
                    Di_Si_Ci_Shu += 1
                    Di_Si = 4

        elif Di_Si == 4:
            if Di_Si_Ci_Shu ==2:         #第四题初始化结束,准备接受博弈请求博弈
                Di_Si = 5
                Di_Si_Ci_Shu = 0
            else:
               Di_Si=2                   #未结束继续读取
               received_message = b''

        elif Di_Si==5:                      #准备接受博弈博弈请求
            received_data = uart.read()
            if received_data == b'\xe1':    #接收到判断是否出错请求,
                received_data = 0
                Di_Si = 6
            elif received_data == b'\xe2':  #接收到格子请求
                received_data = 0
                Di_Si = 7
            else:
               Di_Si==5                     #未接受到请求继续读取


        elif Di_Si == 6:            #判断是否出错
            array2 = deep_copy_list(stable_board_state)#拷贝第二帧
            grid_id_1 , grid_id_2 = wrong(array1,array2)
            time.sleep(0.1)  # 短暂延时

            if grid_id_1 and grid_id_2 :
                received_message = 0
                #给stm32提示,出现错误
                uart.write(bytes([0x6A]))
                time.sleep(0.1)  # 短暂延时
                Di_Liu=2
                Di_Si = 5
            else:
                Di_Si = 8   #未出错准备判断游戏是否结束
        #判断游戏是否结束
        elif Di_Si ==8:
            si = is_game_over(stable_board_state)
            if si==100:
                rect_nei_1 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 0
                Di_Si = 0
                time.sleep(5)
            elif si == -100:
                rect_nei_1 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 0
                Di_Si = 0
                time.sleep(5)
            elif si == 50:
                rect_nei_1 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 0
                Di_Si = 0
                time.sleep(5)
            elif  not si:
                Di_Si = 9       #游戏未结束准备发送棋子
        elif  Di_Si == 9:
            #发送棋子位置
            HEAD = 0xdd
            FOOT = 0x88
            if i+1 in black_chess:
                time.sleep(0.3)
                shell_black(black_chess[i+1], HEAD, FOOT)
                i+=1  #按顺序发棋子
                Di_Si =5

        elif  Di_Si ==7:
            try:
                HEAD = 0xdd
                FOOT = 0x88
                # 使用Minimax算法找到最佳落子位置
                best_move = find_best_move(stable_board_state)
                if best_move:
                    row, col = best_move
                    grid_id = row * 3 + col + 1
                    if grid_id in avg_cell:
                        # 发送AI落子位置
                        send_cell(avg_cell[grid_id], HEAD, FOOT)

                        time.sleep(1)
                        # 点亮蓝灯表示AI已落子
                        LED_B.low()
                        time.sleep(0.5)
                        LED_B.high()
                        received_message = 0 # 重置接收标志
                        Di_Si =10
            except Exception as e:
                print("AI move error:", e)


        elif Di_Si == 10:
            received_data = uart.read()
            if received_data == b'\xe3':
                received_data = 0
                Di_Liu=1
                Di_Si = 5



########################################第五题####################################################
        if Di_Wu == 1 :
            # 发送应答
            #rect_coordinate = 0
            uart.write(bytes([0x5A]))
            # 使能PWM通道输出
            beep_pwm.enable(1)
            # 延时50ms
            time.sleep_ms(50)
        #     关闭PWM输出 防止蜂鸣器吵闹
            beep_pwm.enable(0)

            rect_nei_2=1
            time.sleep(0.05)  # 短暂延时
            if black_chess:
                time.sleep(0.1)
                Di_Wu=2

        elif Di_Wu == 2:#准备接受博弈博弈请求
            received_data = uart.read()
            if received_data == b'\xe1':    #接收到判断是否出错请求,
                received_data = 0
                Di_Wu = 3
            elif received_data == b'\xe2':  #接收到格子请求
                received_data = 0
                Di_Wu = 6
            else:
               Di_Wu==2                     #未接受到请求继续读取

        elif Di_Wu == 3:
            array2 = deep_copy_list(stable_board_state)#拷贝第二帧
            grid_id_1 , grid_id_2 = wrong(array1,array2)
            time.sleep(0.1)  # 短暂延时
            if  grid_id_1 and grid_id_2:
                Di_Liu=2
                received_message = 0
                #给stm32提示,出现错误
                uart.write(bytes([0x6A]))
                time.sleep(0.1)  # 短暂延时
                Di_Wu = 2
            else:
                Di_Wu = 4       #判断游戏是否结束

        #判断游戏是否结束
        elif Di_Wu == 4:
            time.sleep(0.1)
            #判断游戏是否结束
            wu = is_game_over_1(stable_board_state)

            if wu==100:
                rect_nei_2 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 1
                Di_Wu = 0
                time.sleep(5)
            elif wu == -100:
                rect_nei_2 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 1
                Di_Wu = 0
                time.sleep(5)
            elif wu == 50:
                rect_nei_2 = 0
                beep_pwm.enable(1)
                time.sleep_ms(50)
                beep_pwm.enable(0)
                i = 1
                Di_Wu = 0
                time.sleep(5)
            elif  not wu:
                Di_Wu = 5

        #发送棋子位置
        elif Di_Wu == 5:
            HEAD = 0xee  #待商议
            FOOT = 0x99
            time.sleep(0.3)
            if i in white_chess:
                shell_white(white_chess[i], HEAD, FOOT)
                i+=1  #按顺序发棋子
                Di_Wu = 2
            received_message = 0 # 重置接收标志

        #计算格子坐标并发送
        elif Di_Wu == 6:
            try:
                HEAD = 0xee  #待商议
                FOOT = 0x99
                # 使用Minimax算法找到最佳落子位置
                best_move = find_best_move_1(stable_board_state)
                if best_move:
                    row, col = best_move
                    grid_id = row * 3 + col + 1
                    if grid_id in avg_cell:
                        # 发送AI落子位置
                        send_cell(avg_cell[grid_id], HEAD, FOOT)
                        # 点亮蓝灯表示AI已落子
                        LED_B.low()
                        time.sleep(0.5)
                        LED_B.high()
                        received_message = 0 # 重置接收标志
                        Di_Wu = 7
            except Exception as e:
                print("AI move error:", e)


        elif Di_Wu == 7:
            received_data = uart.read()
            if received_data == b'\xe3':
                received_data = 0
                Di_Liu=1
                Di_Wu = 2


############################################第六题##############################################

        if Di_Liu==2:
            if grid_id_1 and grid_id_2 :
                #发送放错的格子
                HEAD = 0xab  #待商议
                FOOT = 0xaa
                if grid_id_2 in avg_cell:
                    send_cell(avg_cell[grid_id_2], HEAD, FOOT)
                    time.sleep(0.1)  # 短暂延时
                    Di_Liu_Ci_Shu += 1
                    Di_Liu = 3
                #发送应该放的格子
                if grid_id_1 in avg_cell:
                    send_cell(avg_cell[grid_id_1], HEAD, FOOT)
                    Di_Liu_Ci_Shu += 1
                    Di_Liu = 3
        elif Di_Liu == 3:
            if Di_Liu_Ci_Shu ==2:
                grid_id_1 = 0
                grid_id_2 = 0
                Di_Liu = 0
                Di_Liu_Ci_Shu=0
            else:
               Di_Liu = 2



except Exception as e:
    print("运行异常:", e)
finally:
    sensor.stop()
    Display.deinit()
    MediaManager.deinit()
