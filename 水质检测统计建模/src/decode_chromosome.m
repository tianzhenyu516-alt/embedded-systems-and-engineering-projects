%% ½âÂëº¯ÊıĞŞÕı
function [w1, b1, w2, b2] = decode_chromosome(chrom, in_num, hidden_num, out_num)
    % ÊäÈë²ã¡úÒşº¬²ãÈ¨ÖØ (8¡Á5)
    w1 = reshape(chrom(1:hidden_num*in_num), hidden_num, in_num);
    
    % Òşº¬²ãÆ«ÖÃ (8¡Á1)
    b1 = chrom(hidden_num*in_num + 1 : hidden_num*in_num + hidden_num)';
    
    % Òşº¬²ã¡úÊä³ö²ãÈ¨ÖØ (1¡Á8)
    w2 = reshape(chrom(hidden_num*in_num + hidden_num + 1 : ...
                      hidden_num*in_num + hidden_num + hidden_num*out_num), ...
                out_num, hidden_num);
    
    % Êä³ö²ãÆ«ÖÃ (1¡Á1)
    b2 = chrom(end-out_num+1:end)';
end

