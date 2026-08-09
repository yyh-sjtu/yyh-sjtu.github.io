> **先给结论。** 在忽略 PPO clipping、重要性采样、长度归一化等细节后，DPO 对一对 chosen/rejected 样本产生的更新方向，确实与组大小 $G=2$、优势为 $(+1,-1)$ 的组相对策略梯度相同。DPO 可以被理解为一种**带自适应 pair weight 的二样本组相对策略梯度**。但这只是梯度层面的条件等价，不代表 DPO 与完整 GRPO 是同一个算法。
>
> 这个视角也能反驳一种过于宽泛的说法：对原始、未做长度归一化的 DPO，如果正负回答有完全相同的 token 前缀，那么前缀的直接 log-prob 项会在代数上严格抵消，并不存在“同一前缀同时受到正负梯度冲突”。不过，RAD-DPO 实际采用的并不是这个标准目标，而是长度归一化、多负例和 listwise loss；在它的目标中，前缀梯度通常不再严格抵消。因此，更准确的评价是：**RAD-DPO 的工程改动可能有效，但它用“标准 DPO 的前缀冲突”解释改动，理论表述得过强。**

## 1. 记号

给定提示 $x$、偏好回答 $y_w$（chosen）和 $y_l$（rejected），记

$$
s_\theta(x,y)
=\log\frac{\pi_\theta(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}.
$$

其中 $\pi_\theta$ 是待训练策略，$\pi_{\mathrm{ref}}$ 是固定参考模型。定义一对回答的隐式奖励差

$$
\Delta_\theta
=s_\theta(x,y_w)-s_\theta(x,y_l).
$$

## 2. 从 KL 约束 RL 推导 DPO

DPO 的起点是带 KL 正则的奖励最大化：

$$
\max_\pi\;
\mathbb E_{x\sim D,\,y\sim\pi(\cdot\mid x)}[r(x,y)]
-\beta\,D_{\mathrm{KL}}\!\left(\pi(\cdot\mid x)\,\|\,\pi_{\mathrm{ref}}(\cdot\mid x)\right).
$$

对固定 $x$，加入归一化约束 $\sum_y\pi(y\mid x)=1$。对 $\pi(y\mid x)$ 求驻点，可得

$$
\pi_r(y\mid x)
=\frac{1}{Z(x)}\pi_{\mathrm{ref}}(y\mid x)
\exp\!\left(\frac{r(x,y)}{\beta}\right),
$$

其中

$$
Z(x)=\sum_y\pi_{\mathrm{ref}}(y\mid x)
\exp\!\left(\frac{r(x,y)}{\beta}\right).
$$

反解奖励：

$$
r(x,y)
=\beta\log\frac{\pi_r(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}
+\beta\log Z(x).
$$

在 Bradley--Terry 偏好模型下，$y_w$ 胜过 $y_l$ 的概率为

$$
p(y_w\succ y_l\mid x)
=\sigma\bigl(r(x,y_w)-r(x,y_l)\bigr).
$$

代入上式后，两个回答共享的 $\beta\log Z(x)$ 正好消失：

$$
p(y_w\succ y_l\mid x)
=\sigma\!\left(\beta\left[
\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\mathrm{ref}}(y_w\mid x)}
-\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\mathrm{ref}}(y_l\mid x)}
\right]\right).
$$

于是标准 DPO loss 为

$$
\boxed{
\mathcal L_{\mathrm{DPO}}(\theta)
=-\mathbb E_{(x,y_w,y_l)}
\log\sigma\!\left(\beta\Delta_\theta\right)
}.
$$

这就是 DPO “不显式训练 reward model，也不显式 rollout 做 RL”的核心：把 KL-RL 的最优策略形式直接代回偏好似然。

## 3. 展开到 token 级别

自回归模型满足

$$
\log\pi_\theta(y\mid x)
=\sum_{t=1}^{T_y}
\log\pi_\theta(y_t\mid x,y_{<t}).
$$

因此

$$
\begin{aligned}
\Delta_\theta
=&\left[
\sum_{t=1}^{T_w}\log\pi_\theta(y_{w,t}\mid x,y_{w,<t})
-\sum_{t=1}^{T_l}\log\pi_\theta(y_{l,t}\mid x,y_{l,<t})
\right]\\
&-\left[
\sum_{t=1}^{T_w}\log\pi_{\mathrm{ref}}(y_{w,t}\mid x,y_{w,<t})
-\sum_{t=1}^{T_l}\log\pi_{\mathrm{ref}}(y_{l,t}\mid x,y_{l,<t})
\right].
\end{aligned}
$$

由于参考模型固定，它影响 loss 的数值和样本权重，但不直接对 $\theta$ 求导。单个偏好对的梯度是

$$
\boxed{
\nabla_\theta\mathcal L_{\mathrm{DPO}}
=-\underbrace{\beta\sigma(-\beta\Delta_\theta)}_{w_{\mathrm{DPO}}>0}
\left[
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x)
\right]
}.
$$

所以梯度下降的更新方向为

$$
-\nabla_\theta\mathcal L_{\mathrm{DPO}}
=w_{\mathrm{DPO}}
\left[
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x)
\right].
$$

它做了两件事：提高 chosen 的概率、降低 rejected 的概率；而 $w_{\mathrm{DPO}}$ 会根据当前策略相对参考模型是否已经拉开足够 margin，自适应地调节这一对样本的力度。

## 4. 为什么它像组大小为 2 的 GRPO？

先考虑一个去掉 PPO clipping、重要性比率和显式 KL 项的组相对策略梯度。对同一提示采样 $G$ 个回答，用组内标准化奖励

$$
\hat A_i=\frac{R_i-\bar R}{\operatorname{Std}(R_1,\ldots,R_G)}.
$$

当 $G=2$ 且 $R_w>R_l$ 时，若采用总体标准差，

$$
\bar R=\frac{R_w+R_l}{2},\qquad
\operatorname{Std}=\frac{|R_w-R_l|}{2},
$$

从而

$$
\hat A_w=+1,\qquad \hat A_l=-1.
$$

若使用样本标准差，只会共同多出一个常数 $1/\sqrt 2$，不改变方向。于是二样本组策略梯度为

$$
\nabla_\theta J_{G=2}
\propto
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x).
$$

它和上面的 DPO 梯度下降方向完全平行。换句话说，可以把 DPO 的单对样本理解为赋予了

$$
A_w^{\mathrm{DPO}}=+w_{\mathrm{DPO}},\qquad
A_l^{\mathrm{DPO}}=-w_{\mathrm{DPO}}
$$

这一对反对称的、自适应优势。

### 一个更准确的命题

> 在使用 sequence-level log-prob、正负样本等权，并忽略 clipping、importance ratio、显式 KL 与长度归一化时，DPO 的每对样本更新方向等价于 $G=2$、优势为 $(+1,-1)$ 的组相对策略梯度；DPO 额外用 logistic preference residual 为每一对样本乘上自适应权重。

这支持“DPO 本质上很像二样本 GRPO”的直觉，但还不能说二者严格相同：

1. **监督信号不同。** DPO 从二元偏好和 Bradley--Terry 似然出发；GRPO 通常从可比较的标量奖励出发。
2. **参考模型的角色不同。** DPO 把参考模型放进 pairwise margin；GRPO 通常把它放进显式 KL penalty。
3. **数据更新机制不同。** 完整 GRPO/PPO 有旧策略、重要性比率和 clipping；标准 DPO 没有这些机制。
4. **token 权重可能不同。** GRPO 实现常按回答长度平均 token loss，而原始 DPO 使用序列 log-prob 求和；回答长度不同时，两者不再只是同一个常数缩放。

## 5. 到底是 on-policy 还是 off-policy？

这取决于偏好对来自哪里，而不是取决于 loss 名字。

- 如果 $(y_w,y_l)$ 是由**当前策略**即时 rollout，再由 judge 排序并立刻更新，那么它是 online/on-policy 的二样本类比。
- 如果样本来自人工数据、SFT 模型、其他模型，或者来自旧策略 $\pi_b$ 的 replay buffer，而当前训练的是不同的 $\pi_\theta$，它就是相对 $\pi_\theta$ 的 offline/off-policy 学习。
- GRPO 通常从 $\pi_{\mathrm{old}}$ 采样，再通过 $\pi_\theta/\pi_{\mathrm{old}}$ 和 clipping 控制更新，因此通常仍被归为 on-policy PPO 家族，而不是一般意义上的无校正 off-policy RL。

所以“如果 chosen/rejected 是它自己 rollout 出来的，DPO 就是 off-policy GRPO”需要改一个词：**若由当前策略刚刚生成，它更接近 on-policy；若由冻结或滞后的自身策略生成并反复复用，才是 off-policy。**

## 6. 完全相同的前缀会不会发生梯度冲突？

设两条回答具有 token 级完全相同的前缀 $c$：

$$
y_w=c\oplus a,\qquad y_l=c\oplus b.
$$

序列 log-prob 可拆成

$$
\log\pi_\theta(y_w\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(a\mid x,c),
$$

$$
\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(b\mid x,c).
$$

相减后

$$
\log\pi_\theta(y_w\mid x)-\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(a\mid x,c)-\log\pi_\theta(b\mid x,c).
$$

参考模型同样如此。因此，对**原始、序列求和形式的标准 DPO**，共同前缀的直接 log-prob 项在 forward 中已经精确消失，求导后当然也是零：

$$
\nabla\log\pi_\theta(c\mid x)
-\nabla\log\pi_\theta(c\mid x)=0.
$$

二样本 GRPO 视角给出同样结论：共同前缀上的 action 完全相同，而优势恰好是 $(+a,-a)$，在等权条件下直接 score-function 项抵消。这不是“两个很大的相反梯度在优化器中打架”，而是同一个计算图中的代数抵消。

### 但要区分两种“前缀梯度”

1. **前缀 token 自身 log-prob 的直接梯度**：在上述条件下严格抵消。
2. **后缀 loss 经由前缀上下文产生的梯度**：后缀 logits 依赖前缀 token 形成的 hidden states，因此后缀仍可通过 attention 路径影响模型参数。它并不会因为前缀 log-prob 项抵消而自动消失。

此外，Transformer 在不同位置共享参数。即使 loss 只落在后缀，它也会改变生成前缀时用到的同一套参数；但这不能被称为一个独立的“前缀 token loss”。

## 7. 用这个结论重新审视 RAD-DPO

RAD-DPO 将其 Token-Level Gradient Detachment（TLGD）的动机描述为：标准 DPO 会压低整个负样本，而正负样本共享的前缀同时受到正向和负向信号，可能导致梯度冲突或振荡。

如果这里的“标准 DPO”严格指原始 DPO，那么上面的推导已经构成反例：**在完全相同前缀、相同 mask、序列 log-prob 求和的条件下，直接前缀项为零，不需要额外截断来解决冲突。**

但 RAD-DPO 真正优化的目标与原始 DPO 不同，主要有三个变化。

### 7.1 长度归一化破坏前缀抵消

RAD-DPO 使用类似 SimPO 的长度归一化隐式奖励（且不使用参考模型）：

$$
\hat r_\theta(x,y)=\frac{1}{|y|}\log\pi_\theta(y\mid x).
$$

对共享前缀 $c$，正负奖励之差中的前缀系数变成

$$
\left(\frac{1}{T_w}-\frac{1}{T_l}\right)
\log\pi_\theta(c\mid x).
$$

只要 $T_w\ne T_l$，它就不为零。此时确实可能存在直接的共同前缀梯度，不过根因是**长度归一化使正负两侧权重不相等**，而不是原始 DPO 天生会错误惩罚共同前缀。

### 7.2 多负例与 listwise 权重进一步破坏对称性

论文使用一个正例和多个负例，并通过 log-sum-exp 构造 listwise preference loss。其梯度会给不同负例分配不同 softmax 权重。即使多个负例共享部分前缀，只要长度、分叉点或权重不同，正负梯度一般也不会严格对称。

所以，TLGD 对论文自己的训练目标可能是有意义的；但更准确的理论故事应当是：**修复由长度归一化和多负例加权引入的不对称 credit assignment**，而不是修复标准 DPO 必然存在的前缀冲突。

### 7.3 TLGD 实际截断了什么？

论文对负样本共同前缀的 log-prob 标量应用 stop-gradient。它保持 forward 数值不变，但将这些项对参数的直接梯度设为零。

这带来两个容易忽略的结果：

- 它并未在公式中截断 prefix hidden states 或 KV 表示到后缀 logits 的反向传播。因此，上面提到的“后缀经前缀上下文回传”仍可能存在，除非实现额外 detach 了 activation；论文公式没有说明这一点。
- 它打破了正负样本的反对称性。特别是在原本能够严格抵消的等长单负例情形，截断负前缀后，chosen 前缀的正向更新反而被保留下来。因而 TLGD 更像一种**偏向保留正样本前缀的非对称 credit assignment**，而不只是删除“互相冲突的噪声”。

## 8. 实验是否证明了“梯度振荡”故事？

RAD-DPO 的消融实验中，加入 TLGD 后多数离线指标有小幅提升：

| 指标 | 完整 RAD-DPO | 去掉 TLGD | 差值 |
|---|---:|---:|---:|
| Item Recall@10 | 0.3048 | 0.3025 | +0.0023 |
| Item MRR | 0.2481 | 0.2470 | +0.0011 |
| SID Recall@8 | 0.3888 | 0.3872 | +0.0016 |
| SID Recall@64 | 0.6247 | 0.6237 | +0.0010 |
| SID Recall@128 | 0.6864 | 0.6864 | 0.0000 |
| SID MRR | 0.2947 | 0.2939 | +0.0008 |
| Hallucination rate（越低越好） | 0.0652 | 0.0647 | -0.0005 |

这些结果说明 TLGD 作为工程技巧可能有用，但还不足以确认论文提出的具体机制：

1. 提升幅度整体较小，且 hallucination rate 反而略差。
2. 论文没有直接展示共同前缀梯度的方差、夹角、范数或训练振荡曲线。
3. 没有把“长度归一化导致的不抵消”与“原始 DPO 的行为”分开做控制实验。
4. stop-gradient 同时改变了 credit assignment，因此指标改善也可能来自 chosen-prefix reinforcement，而非消除了所谓冲突。

因此，证据支持的最强结论是“TLGD 对该系统有轻微经验收益”，而不是“标准 DPO 存在前缀梯度冲突，且 TLGD 已证明解决了它”。

## 9. 最终判断

我的结论可以压缩为四句话：

1. **DPO 与 $G=2$ GRPO 的直觉是成立的。** 二者对一对样本共享 $\nabla\log\pi(y_w)-\nabla\log\pi(y_l)$ 这个核心方向，DPO 的 logistic residual 相当于自适应的组内优势幅度。
2. **这种等价有明确边界。** 完整 GRPO 的 rollout、reward normalization、old-policy ratio、clipping、显式 KL 和 token averaging 都不能从 DPO 中凭空得到。
3. **该视角能够反驳 RAD-DPO 对“标准 DPO”的宽泛批评。** 对完全相同的前缀，原始 DPO 的直接前缀梯度严格抵消。
4. **它不能否定 RAD-DPO 改动的全部合理性。** RAD-DPO 自己的长度归一化和多负例目标破坏了抵消；TLGD 可能是有用的工程修正，但应被解释为非对称的 prefix credit assignment，而非已经被证明的“标准 DPO 梯度冲突修复”。

从更一般的角度看，DPO、GRPO 和许多 preference optimization 方法都在做同一件核心工作：为采样序列构造有正有负的相对权重，再乘上 sequence/token score function。真正决定算法差异的，不只是“chosen 加、rejected 减”，而是**权重怎样产生、数据由谁采样、是否校正分布偏移，以及 credit 被怎样分配到 token**。

## 参考资料

- Rafailov et al., [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290), NeurIPS 2023.
- Shao et al., [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300), 2024（GRPO）.
- Li et al., [RAD-DPO: Robust Adaptive Denoising Direct Preference Optimization](https://arxiv.org/abs/2602.23964), SIGIR 2026; [DOI](https://doi.org/10.1145/3805712.3808512).
- 本文讨论所依据的[共享对话](https://chatgpt.com/share/6a7884a3-42ac-83ec-aeee-814252d737ad)。
