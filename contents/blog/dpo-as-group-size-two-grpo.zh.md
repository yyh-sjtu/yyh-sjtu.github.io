> 我的核心理解是：DPO 和 GRPO 属于同一类**相对策略梯度估计器**。它们最值得注意的地方，不只是把 chosen 概率提高、把 rejected 概率降低，而是通过比较同一上下文下的多个输出，使与奖励无关的 token 随机性——措辞、风格和语言习惯——能够精确地或在期望意义上抵消；真正影响结果正确性和最终奖励的 token 梯度则会保留下来。这样，序列级监督可以间接产生一种 token 级 credit assignment。

下面我从 loss 和梯度展开这一理解，说明它成立所需的条件，再用它分析 RAD-DPO 关于 token 梯度的论证。

## 1. 从梯度出发，而不是从算法名称出发

给定提示 $x$、偏好回答 $y_w$ 和拒绝回答 $y_l$，定义 DPO 的隐式分数

$$
s_\theta(x,y)=\log\frac{\pi_\theta(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)},
$$

以及 pairwise margin

$$
\Delta_\theta=s_\theta(x,y_w)-s_\theta(x,y_l).
$$

DPO loss 为

$$
\mathcal L_{\mathrm{DPO}}
=-\log\sigma(\beta\Delta_\theta).
$$

把 chosen 和 rejected 的自回归序列概率分别展开，可以得到我使用的完整 token 形式：

$$
\begin{aligned}
\mathcal L_{\mathrm{DPO}}
=-\log\sigma\Bigg(\beta\Bigg[&
\left(
\sum_{t=1}^{T_w}\log\pi_\theta(y_{w,t}\mid x,y_{w,<t})
-\sum_{t=1}^{T_l}\log\pi_\theta(y_{l,t}\mid x,y_{l,<t})
\right)\\
&-\left(
\sum_{t=1}^{T_w}\log\pi_{\mathrm{ref}}(y_{w,t}\mid x,y_{w,<t})
-\sum_{t=1}^{T_l}\log\pi_{\mathrm{ref}}(y_{l,t}\mid x,y_{l,<t})
\right)
\Bigg]\Bigg).
\end{aligned}
$$

第一个括号是 policy model 中 chosen 与 rejected 的 log-probability 差，第二个括号是 reference model 中对应的差。这个分组说明，DPO 实际优化的是 policy 相对偏好 margin 减去 reference margin。

由于参考模型固定，梯度下降的方向为

$$
\boxed{
-\nabla_\theta\mathcal L_{\mathrm{DPO}}
=w_{\mathrm{DPO}}
\left[
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x)
\right]
}
$$

其中

$$
w_{\mathrm{DPO}}=\beta\sigma(-\beta\Delta_\theta)>0.
$$

参考模型通过 $\Delta_\theta$ 改变每一对样本的权重，但核心 score-function 方向就是

$$
\nabla\log\pi(y_w\mid x)-\nabla\log\pi(y_l\mid x).
$$

这正是 DPO 与 GRPO 发生联系的地方。

## 2. 把 DPO 理解成组大小为 2 的相对策略梯度

先考虑去掉 clipping、old-policy importance ratio 和显式 KL 项的简化 GRPO。对同一个 prompt 采样 $G$ 个回答，GRPO 在组内标准化奖励：

$$
\hat A_i=\frac{R_i-\bar R}{\operatorname{Std}(R_1,\ldots,R_G)}.
$$

当 $G=2$ 且 $R_w>R_l$ 时，使用总体标准差可得

$$
\hat A_w=+1,\qquad \hat A_l=-1.
$$

于是策略梯度上升方向为

$$
\nabla_\theta J_{G=2}
\propto
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x).
$$

它和 DPO 的梯度下降方向平行。因此，可以把 DPO 理解成一个组大小为 2、优势反对称且幅度自适应的组相对策略梯度：

$$
A_w^{\mathrm{DPO}}=+w_{\mathrm{DPO}},\qquad
A_l^{\mathrm{DPO}}=-w_{\mathrm{DPO}}.
$$

这里是梯度层面的等价，并不意味着完整算法相同。完整 GRPO 还包含在线 rollout、组内奖励标准化、旧策略、重要性比率、clipping 和显式 KL；DPO 从 pairwise preference likelihood 出发，并把参考策略放进 logistic margin。两者的长度归一化方式也可能不同。

更准确的表述是：

> 在使用 sequence-level log-prob、正负样本等权，并去掉 PPO 特有机制后，每一个 DPO pair 都具有与 $G=2$ 组相对策略梯度相同的 score-function 方向；DPO 另外通过 logistic residual 为每一对样本分配自适应权重。

## 3. 将更新展开到 token

自回归模型满足

$$
\log\pi_\theta(y\mid x)
=\sum_{t=1}^{T_y}\log\pi_\theta(y_t\mid x,y_{<t}).
$$

定义 token score

$$
g_t(y)=\nabla_\theta\log\pi_\theta(y_t\mid x,y_{<t}).
$$

一对 DPO 样本的更新可以写成

$$
-\nabla\mathcal L_{\mathrm{DPO}}
=w_{\mathrm{DPO}}
\left[
\sum_tg_t(y_w)-\sum_tg_t(y_l)
\right].
$$

表面上看，每个 token 都乘了同一个序列级权重，没有显式 token reward，也没有 token-specific advantage。那么 token 级 credit assignment 从哪里出现？

答案是：**在成对或成组轨迹之间进行相对抵消。**

## 4. 精确抵消：完全相同的 token 和共同前缀

假设两条回答有完全相同的 token 前缀 $c$：

$$
y_w=c\oplus a,\qquad y_l=c\oplus b.
$$

利用自回归分解，

$$
\log\pi_\theta(y_w\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(a\mid x,c),
$$

$$
\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(b\mid x,c).
$$

所以

$$
\log\pi_\theta(y_w\mid x)-\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(a\mid x,c)-\log\pi_\theta(b\mid x,c).
$$

共同前缀的直接 score 在求导之前就已经消失：

$$
\nabla\log\pi_\theta(c\mid x)
-\nabla\log\pi_\theta(c\mid x)=0.
$$

组大小为 2 的 GRPO 视角会得到相同结论：完全相同的 prefix action 乘上大小相同、符号相反的优势，因此直接 score-function 项严格抵消。

这是一种逐样本、精确的 credit assignment：目标函数自动忽略两种选择共有的 token，把 pairwise 学习信号集中到分叉点之后。

## 5. 统计抵消：风格和语言习惯

多数风格 token 并不会逐字相同。两个数学上等价的回答可能使用不同的连接词、标点和句式，因此它们无法在单个 pair 中逐 token 精确抵消。更有意义的结论发生在期望层面。

可以在概念上把 token 特征分为两类：

- $K$：会影响结果正确性或最终奖励的关键特征；
- $N$：不影响奖励的措辞、风格和语言习惯等 nuisance 特征。

DPO 中 nuisance token 的期望贡献为

$$
\mathbb E\left[
w_{\mathrm{DPO}}
\left(
\sum_{t\in N_w}g_t(y_w)-
\sum_{t\in N_l}g_t(y_l)
\right)
\right].
$$

如果这些措辞选择在给定任务语义后与偏好标签条件独立，在 chosen 和 rejected 两侧来自相同分布，并且不与自适应 pair weight 系统性相关，那么该期望近似为零。它们在不同 pair 中符号随机，最终会被平均掉。

关键 token 不同。如果某个 token 决策稳定地影响最终答案或奖励，它就会与 chosen 标签相关，因此

$$
\mathbb E\left[
w_{\mathrm{DPO}}
\left(
\sum_{t\in K_w}g_t(y_w)-
\sum_{t\in K_l}g_t(y_l)
\right)
\right]\ne0.
$$

经过大量相对比较后，与奖励相关的 token 决策具有更高的梯度信噪比，序列级 preference supervision 的学习信号便会统计性地集中到关键决策上。

GRPO 能更直观地呈现同一结构。它的组梯度为

$$
\nabla J_{\mathrm{GRPO}}
\propto
\sum_{i=1}^{G}\hat A_i\sum_tg_t(y_i).
$$

由于标准组内归一化优势满足 $\sum_i\hat A_i=0$，在高奖励和低奖励样本中分布相似的 token 特征倾向于抵消；与奖励相关的 token 特征会和 $\hat A_i$ 发生协方差并保留下来：

$$
\mathbb E[\hat A_i g_{i,t}]
=\operatorname{Cov}(\hat A_i,g_{i,t}).
$$

这就是我所说的 DPO/GRPO **隐式 token 级 credit assignment**。算法并不知道单条轨迹中哪个 token 最重要，而是利用重复的相对比较压低 reward-independent variation，保留 reward-correlated variation。

### 这个观点的边界

这种机制有条件，并不会自动发生：

1. 如果标注者偏爱某种文风，风格就与标签相关，不会被抵消。
2. 如果 chosen 和 rejected 来自不同模型或不同 decoding 配置，它们的风格分布可能系统性不同。
3. 只有两个样本时估计方差较大；更大的 GRPO group 通常能更可靠地估计 reward covariance。
4. 标准实现中，一条轨迹的所有 token 仍然乘同一个标量 advantage；这并不是显式的过程监督。
5. 后缀 loss 可以通过 earlier hidden states 反向传播。前缀 token 的直接 log-prob 抵消，不等于 prefix representation 与后缀计算被 detach。

## 6. On-policy 与 off-policy

应当根据数据来源判断：

- 当前策略生成候选、judge 排序并立即更新，属于 online/on-policy。
- 样本来自固定数据集、其他模型或滞后策略，并且在没有重要性修正的情况下反复复用，则相对当前策略属于 offline/off-policy。
- GRPO 通常被归为 on-policy PPO 家族，因为它从 $\pi_{\mathrm{old}}$ 采样，并通过 ratio 和 clipping 控制更新。

因此，离线 DPO 可以自然地理解成 off-policy 的二样本组相对 surrogate；对当前模型的新鲜 self-rollout 做 DPO 则是 online 类比，不能仅仅因为样本是模型自己生成的就称为 off-policy。

## 7. 重新分析 RAD-DPO

RAD-DPO 把 preference learning 应用于生成式推荐，其中每个 item 被表示为结构化 Semantic ID。论文认为，标准 DPO 会惩罚 rejected SID 的整个序列，使正负 item 共享的层级前缀同时受到 push 和 pull，从而产生梯度冲突。

相对梯度视角暴露了这一解释中的几个问题。

### 7.1 固定长度 pairwise SID 已经抵消共同前缀

论文使用三层 RQ-Kmeans codebook 构造 SID，因此 chosen 和 rejected item ID 是固定长度序列。对于 $|y_w|=|y_l|=L$，即使采用论文中的 SimPO 风格长度归一化，也有

$$
\begin{aligned}
\hat r(y_w)-\hat r(y_l)
&=\frac{1}{L}\bigl[
\log\pi(c)+\log\pi(a\mid c)
-\log\pi(c)-\log\pi(b\mid c)
\bigr]\\
&=\frac{1}{L}\bigl[
\log\pi(a\mid c)-\log\pi(b\mid c)
\bigr].
\end{aligned}
$$

长度归一化只是共同缩放 $1/L$，不会重新产生 prefix gradient。对标准 pairwise DPO baseline，论文所说的直接前缀冲突在代数上并不存在。

### 7.2 Listwise 目标可能产生残余项，但机制不同

RAD-DPO 实际通过 log-sum-exp，让一个正例同时与多个负例比较。先忽略动态权重，定义

$$
z=\log\sum_j\exp(\hat r_w-\hat r_j),
\qquad
q_j=\frac{\exp(-\hat r_j)}{\sum_k\exp(-\hat r_k)}.
$$

那么

$$
\nabla z=\nabla\hat r_w-\sum_jq_j\nabla\hat r_j.
$$

如果只有负例子集 $S$ 与 chosen 共享某个前缀，该前缀的直接梯度系数为

$$
\frac{1}{L}\left(1-\sum_{j\in S}q_j\right).
$$

当所有负例都共享该前缀时它仍然为零；当一部分负例共享、一部分不共享时才会留下残余。这个残余来自 chosen 同时和其他不共享前缀的负例进行比较，不是共享正负 pair 内部的 push-pull，而且是 RAD-DPO 的 listwise 目标引入的，而不是标准 pairwise DPO 固有的问题。

### 7.3 TLGD 实际改变了什么

Token-Level Gradient Detachment 将负样本共同前缀的直接 log-prob 梯度设为零，同时保持 forward likelihood 不变。它并没有恢复零梯度对称性，而是删除 negative contribution、保留 positive prefix contribution。

因此，TLGD 更准确的描述是**非对称的正样本前缀保护或强化**。它可能是适合层级 ID 的 inductive bias，但这和证明标准 DPO 存在不稳定的 prefix conflict 是两件事。

论文公式只 detach 了 prefix log-prob 标量，没有 detach 用来预测后缀 token 的 prefix hidden states 或 KV representation。如果实现中没有额外截断 activation，后缀 loss 仍然可以经过前缀上下文反向传播。

### 7.4 目标函数本身的其他问题

论文的 listwise loss 还存在一个应当与前缀梯度分开讨论的校准问题：

$$
\log\sum_{j=1}^{n}\exp(\hat r_w-\hat r_j).
$$

当所有分数完全相同时，该值是 $\log n$，而不是零。因此，增加负例数量会自动增大表面的正 margin，使外层 sigmoid 在正例尚未胜过任何负例时就更加接近饱和。论文固定使用 $n=3$，所以这不是不同实验之间未控制的变量，但 $\log n$ 偏置仍会改变 loss 校准并减小梯度权重。

RDRW 的权重来自模型 hidden-state similarity 和动态分位点，但论文没有清楚说明是否截断 similarity-derived weight 的梯度。如果不截断，模型可能通过改变用于加权的 representation 本身来降低 loss；如果截断，RDRW 就是一个非平稳的外部启发式规则。两种实现都可能合理，但应当明确其优化路径。

### 7.5 实验能够证明什么

TLGD 消融在多数离线指标上带来小幅提升，但 SID Recall@128 没有变化，hallucination rate 还略有变差。这些结果可以支持它具有一定工程价值，却不能直接验证论文提出的机制：论文没有报告 prefix gradient 的夹角、方差、范数或振荡曲线，也没有区分 pairwise 精确抵消和 listwise 残余梯度。

因此，目前证据能够支持的最强结论是：

> TLGD 可能是适合结构化生成推荐的非对称 credit-assignment 规则，但“它修复了标准 DPO 固有的共同前缀梯度冲突”这一解释得不到代数推导的支持。

## 8. 最后的理解

我并不把 DPO 简单理解成“监督学习”，把 GRPO 理解成“真正的 RL”。从梯度层面看，它们都在为多条轨迹构造相对权重，再把权重乘到 token score function 上。

它们有价值的 credit-assignment 能力来自比较：

- 完全相同的共享 token 可以精确抵消；
- 与奖励无关的风格随机性可以在期望上抵消；
- 与奖励相关的关键决策会在重复比较中保留下来；
- 更大、更多样的 group 可以提高这种统计分离的可靠性。

DPO 是这个家族中最小的非平凡情形：组大小为 2，并且带有自适应 logistic pair weight。GRPO 把相对比较扩展到更大的在线采样组，同时加入完整的策略优化机制。

这一视角也给分析新的 preference objective 提供了一个简单方法。在引入 token-level 修正之前，先把 loss 展开并追问：**哪些 token 梯度已经由于对称性而抵消？哪些梯度只是因为目标函数打破对称性才留下？新的修正究竟是在删除噪声，还是主动加入一种新的 credit-assignment bias？**

## 参考资料

- Rafailov et al., [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290), NeurIPS 2023.
- Shao et al., [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300), 2024（GRPO）.
- Li et al., [RAD-DPO: Robust Adaptive Denoising Direct Preference Optimization](https://arxiv.org/abs/2602.23964), SIGIR 2026; [DOI](https://doi.org/10.1145/3805712.3808512).
