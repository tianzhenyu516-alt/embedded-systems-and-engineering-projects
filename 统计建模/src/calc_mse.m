%% 适应度计算函数修正
function mse = calc_mse(w1, b1, w2, b2, input, target)
    % 输入层→隐含层计算 (8×5) * (5×N) = 8×N
    hidden = tansig(w1 * input + repmat(b1, 1, size(input,2)));
    
    % 隐含层→输出层计算 (1×8) * (8×N) = 1×N
    output = w2 * hidden + repmat(b2, 1, size(input,2));
    
    % 计算均方误差
    mse = mean((output - target).^2);
end