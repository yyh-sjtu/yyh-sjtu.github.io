---
title: "Optimizing Functionality: Differential Logic Gate Networks Need Logic Initialization"
collection: publications
permalink: /publication/optimizing_diff_logic
date: 2024-08-10
venue: 'Submitting to NeurIPS'
paperurl: 'https://yyh-sjtu.github.io/files/optimizing_diff_logic.pdf'
citation: 'Chang K, Wang K, Chen G, Zhou Y, et al. Optimizing Functionality: Differential Logic Gate Networks Need Logic Initialization[J].'
---

Recently, researchers have employed deep differential logic gate networks to train 1 highly efficient 1-bit neural networks capable of directly synthesizing fully 1-bit 2 neural networks into circuit chips. However, existing methods often rely on random 3 initialization connections, hindering the convergence on more complex datasets 4 and leading to lower precision. In this research, we illuminate the profound impact 5 of logic network initialization on convergence. We introduce a novel non-random 6 initialization approach that utilizes precise symbolic logic reasoning information to 7 initialize logic gate networks. Subsequently, these constructed logic gate networks 8 are converted into layer-wise logic gate networks, serving as the initialized logic 9 gate network to enhance the accuracy of differential logic gate network training. 10 Through this method, the training process gains the ability to recognize the inner 11 logic information within datasets, resulting in improved accuracy and convergence. 12 We evaluate the logic-initialized network using benchmarks from the IWLS bench- 13 mark suite, demonstrating significantly enhanced benchmark accuracy compared 14 to approaches lacking our proposed logic initialization.