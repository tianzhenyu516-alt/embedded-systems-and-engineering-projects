%% 数据准备（示例数据）
% 输入参数：DO、CODmn、NH3N、TP、pH（5个特征）
% 输出参数：水质类别（I-V类用1-5表示）
%xlsread('D:\resources\MATLAB\R2010a\bin\water_quality_data.xlsx'); % 加载数据文件，格式为[N×5]的输入矩阵，[N×1]的输出向量
%% 数据加载（Excel文件）
filename = getenv('WATER_QUALITY_DATA_FILE');
if isempty(filename)
    filename = fullfile(fileparts(mfilename('fullpath')), '..', 'data', 'water_quality_data.xlsx');
end

% 读取数据并更改变量名
input_data = xlsread(filename, 'A2:E180')';   % 5×N矩阵
output_data = xlsread(filename, 'F2:F180')';  % 1×N向量

% 数据验证
assert(size(input_data,1)==5, '输入数据应包含5个特征');
assert(size(output_data,1)==1, '输出数据应为单行向量');

% 数据归一化
[input_norm, ps_input] = mapminmax(input_data, 0, 1);  
output_norm = (output_data - 1)/4;  % 将类别1-5映射到0-1

% 数据集划分
total_samples = size(input_data, 2);  % 获取总样本数

% 设定最小测试样本数阈值
min_test_samples = 10;  % 根据实际情况调整

% 自动调整划分比例
if total_samples < 50
    % 小样本模式
    train_ratio = 0.8;
    val_ratio = 0.1;
    test_ratio = 0.1;
else
    % 常规模式
    train_ratio = 0.7;
    val_ratio = 0.15;
    test_ratio = 0.15;
end

% 计算各分集样本数
train_num = round(total_samples * train_ratio);
val_num = round(total_samples * val_ratio);
test_num = total_samples - train_num - val_num;

% 强制保证最小测试样本
if test_num < min_test_samples
    test_num = min_test_samples;
    train_num = total_samples - val_num - test_num;
    if train_num < 1
        train_num = 1;
        val_num = total_samples - train_num - test_num;
    end
end

% 生成随机索引
indices = randperm(total_samples);
trainInd = indices(1:train_num);
valInd = indices(train_num+1:train_num+val_num);
testInd = indices(end-test_num+1:end);

% 验证非空
assert(~isempty(testInd), '测试集划分失败');
fprintf('数据集划分：训练集%d，验证集%d，测试集%d\n',...
        length(trainInd), length(valInd), length(testInd));
%% 改进遗传算法参数设置
pop_size = 30;    % 种群规模
max_gen = 100;    % 最大迭代次数
chrom_len = (5*8 + 8*1) + (8 + 1); % 权重+阈值的总参数数

% 自适应参数
Pc_max = 0.8;     % 最大交叉概率
Pc_min = 0.3;     % 最小交叉概率
Pm_max = 0.1;     % 最大变异概率
Pm_min = 0.01;    % 最小变异概率

%% 改进遗传算法主循环
pop = rand(pop_size, chrom_len)*2 - 1; % 初始化种群[-1,1]

best_fitness = zeros(max_gen, 1);
for gen = 1:max_gen
    % 计算适应度
    fitness = zeros(pop_size, 1);
    for i = 1:pop_size
        [w1, b1, w2, b2] = decode_chromosome(pop(i,:), 5, 8, 1);
        fitness(i) = 1 / (calc_mse(w1, b1, w2, b2, input_norm(:,trainInd), output_norm(trainInd)) + eps);
    end
    
    % 精英保留
    [~, idx] = sort(fitness, 'descend');
    elite = pop(idx(1:2), :);
    
    % 自适应交叉变异概率
    Pc = Pc_max - (Pc_max - Pc_min)*(gen/max_gen)^2;
    Pm = Pm_min + (Pm_max - Pm_min)*(1 - mean(fitness)/max(fitness));
    
    % 选择（锦标赛选择）
    new_pop = elite;
for i = 3:pop_size
    % 生成3个不重复的候选索引（兼容2010）
    candidates = randperm(pop_size);  % 全排列
    candidates = candidates(1:3);     % 取前3个
    
    [~, best] = max(fitness(candidates));
    new_pop(i,:) = pop(candidates(best),:);
end
    
    % 交叉（多点交叉）
   for i = 1:2:pop_size-1
    if rand < Pc
        % 生成两个不重复的交叉点（兼容旧版本）
        cross_point = randperm(chrom_len-1);  
        cross_point = sort(cross_point(1:2));
        
        % 执行交叉操作
        temp = new_pop(i, cross_point(1):cross_point(2));
        new_pop(i, cross_point(1):cross_point(2)) = new_pop(i+1, cross_point(1):cross_point(2));
        new_pop(i+1, cross_point(1):cross_point(2)) = temp;
    end
end
    
    % 变异（高斯变异）
   for i = 1:pop_size
    if rand < Pm
        % 生成变异位置（旧版本兼容方案）
        mutate_num = ceil(chrom_len*0.1);
        all_pos = randperm(chrom_len);
        mutate_pos = all_pos(1:mutate_num);
        
        % 执行高斯变异
        new_pop(i, mutate_pos) = new_pop(i, mutate_pos) + 0.1*randn(size(mutate_pos));
        
        % 边界约束（可选）
        new_pop(i, mutate_pos) = max(min(new_pop(i, mutate_pos), -1));
        new_pop(i, mutate_pos) = min(new_pop(i, mutate_pos), 1);
    end
end
    pop = new_pop;
    best_fitness(gen) = max(fitness);
end

%% 最优个体解码
[~, best_idx] = max(fitness);
[w1, b1, w2, b2] = decode_chromosome(pop(best_idx,:), 5, 8, 1);

%% BP神经网络构建
net = newff(input_norm, output_norm, ...
           8, {'tansig', 'purelin'}, 'trainlm', 'learngdm', 'mse');
net.IW{1,1} = w1;
net.LW{2,1} = w2;
net.b{1} = b1;
net.b{2} = b2;

% 自适应学习率参数
% 设置网络参数
net.trainParam.epochs = 1000;     % 最大训练次数
net.trainParam.goal = 1e-5;       % 训练目标误差
net.trainParam.lr = 0.05;         % 初始学习率
net.trainParam.mc = 0.9;          % 动量因子

% 网络训练
net = train(net, input_norm(:,trainInd), output_norm(trainInd));
subplot(3,1,1)
%% 性能评估（添加保护机制）
if isempty(testInd)
    error('测试集样本为空，请调整划分比例');
else
    % 预测输出
    pred_norm = sim(net, input_norm(:,testInd));
    pred = round(pred_norm * 4 + 1);
    pred = min(max(pred, 1), 5);  % 约束到1-5类
    
    % 计算准确率
    accuracy = sum(pred == output_data(testInd)) / length(testInd);
    fprintf('测试集准确率：%.2f%%\n', accuracy*100);
    
    % 可视化（仅当有测试样本时）
    figure
    plot(output_data(testInd), 'bo-'); 
    hold on;
    plot(pred, 'r^--');
    legend('实际类别','预测类别');
    title('BP水质分类预测结果');
    %xlabel('黑河张家桥样本序号');
    %xlabel('泾河桥样本序号');
    %xlabel('咸阳铁桥样本序号');
    xlabel('兴平样本序号');
    ylabel('水质类别');
end


