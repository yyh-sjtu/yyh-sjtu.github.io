> My central view is that DPO and GRPO belong to the same family of **relative policy-gradient estimators**. Their most interesting property is not merely that one response is pushed up and another is pushed down. By contrasting outputs generated under the same context, token-level randomness that is unrelated to reward—wording, style, and habitual phrasing—can cancel exactly or in expectation, while gradients associated with reward-determining tokens survive. This produces an implicit form of token-level credit assignment from sequence-level supervision.

This article develops that view from the loss and gradient, states the assumptions under which it is valid, and then uses it to examine the token-level argument made by RAD-DPO.

## 1. Start from the gradient, not the algorithm name

For a prompt $x$, let $y_w$ be the preferred response and $y_l$ the rejected response. Define the DPO implicit score

$$
s_\theta(x,y)=\log\frac{\pi_\theta(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)},
$$

and the pairwise margin

$$
\Delta_\theta=s_\theta(x,y_w)-s_\theta(x,y_l).
$$

The DPO loss is

$$
\mathcal L_{\mathrm{DPO}}
=-\log\sigma(\beta\Delta_\theta).
$$

Expanding the two autoregressive sequence probabilities gives the full token-level form:

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

The first parenthesis is the chosen-versus-rejected log-probability difference under the policy model; the second is the same difference under the reference model. This grouping makes it clear that DPO learns from the policy's **relative** preference margin after subtracting the reference margin.

Because the reference model is fixed,

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

where

$$
w_{\mathrm{DPO}}=\beta\sigma(-\beta\Delta_\theta)>0.
$$

The reference model changes the pair weight through $\Delta_\theta$, but the core score-function direction is simply

$$
\nabla\log\pi(y_w\mid x)-\nabla\log\pi(y_l\mid x).
$$

This direction is the key to the connection with GRPO.

## 2. DPO as a group-of-two relative policy gradient

Consider a simplified GRPO update without clipping, the old-policy importance ratio, or the explicit KL term. For $G$ responses sampled for the same prompt, GRPO standardizes rewards inside the group:

$$
\hat A_i=\frac{R_i-\bar R}{\operatorname{Std}(R_1,\ldots,R_G)}.
$$

For $G=2$ and $R_w>R_l$, population standardization gives

$$
\hat A_w=+1,\qquad \hat A_l=-1.
$$

The resulting ascent direction is

$$
\nabla_\theta J_{G=2}
\propto
\nabla_\theta\log\pi_\theta(y_w\mid x)
-\nabla_\theta\log\pi_\theta(y_l\mid x).
$$

It is parallel to the DPO descent direction. DPO can therefore be understood as a group-of-two relative policy-gradient update with adaptive, antisymmetric advantages

$$
A_w^{\mathrm{DPO}}=+w_{\mathrm{DPO}},\qquad
A_l^{\mathrm{DPO}}=-w_{\mathrm{DPO}}.
$$

This is a gradient-level equivalence, not an identity between the complete algorithms. Full GRPO contains online sampling, group reward normalization, an old policy, importance ratios, clipping, and an explicit KL estimator. DPO instead begins with pairwise preference likelihood and places the reference policy inside the logistic margin. Length normalization conventions may also differ.

The most precise statement is:

> With sequence-level log-probabilities and equal positive/negative weighting, and after removing PPO-specific machinery, each DPO pair has the same score-function direction as a $G=2$ group-relative policy gradient. DPO additionally assigns each pair an adaptive logistic weight.

## 3. Expanding the update to tokens

For an autoregressive policy,

$$
\log\pi_\theta(y\mid x)
=\sum_{t=1}^{T_y}\log\pi_\theta(y_t\mid x,y_{<t}).
$$

Define the token score

$$
g_t(y)=\nabla_\theta\log\pi_\theta(y_t\mid x,y_{<t}).
$$

The DPO update for one pair becomes

$$
-\nabla\mathcal L_{\mathrm{DPO}}
=w_{\mathrm{DPO}}
\left[
\sum_t g_t(y_w)-\sum_t g_t(y_l)
\right].
$$

At first glance, every token receives the same sequence-level weight. There is no explicit token reward and no token-specific advantage. How, then, can token-level credit assignment emerge?

The answer is **relative cancellation across paired or grouped trajectories**.

## 4. Exact cancellation: shared tokens and shared prefixes

Suppose the two responses have an identical token prefix $c$:

$$
y_w=c\oplus a,\qquad y_l=c\oplus b.
$$

Autoregressive factorization gives

$$
\log\pi_\theta(y_w\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(a\mid x,c),
$$

$$
\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(c\mid x)+\log\pi_\theta(b\mid x,c).
$$

Therefore

$$
\log\pi_\theta(y_w\mid x)-\log\pi_\theta(y_l\mid x)
=\log\pi_\theta(a\mid x,c)-\log\pi_\theta(b\mid x,c).
$$

The direct prefix score cancels before differentiation:

$$
\nabla\log\pi_\theta(c\mid x)
-\nabla\log\pi_\theta(c\mid x)=0.
$$

The group-of-two GRPO view says the same thing. The identical prefix actions receive opposite advantages of equal magnitude, so their direct score-function terms cancel.

This is exact, per-example credit assignment: the objective ignores tokens that are literally common to both alternatives and concentrates the pairwise signal after the divergence point.

## 5. Statistical cancellation: style and language habits

Most stylistic tokens are not literally identical. Two mathematically equivalent answers may use different transitions, punctuation, or sentence structures. Their gradients cannot cancel token by token within one pair. The stronger and more useful claim is an expectation-level one.

Partition token features conceptually into

- $K$: features that influence correctness or final reward;
- $N$: nuisance features such as wording, style, and language habits that do not affect reward.

For DPO, the expected nuisance contribution is

$$
\mathbb E\left[
w_{\mathrm{DPO}}
\left(
\sum_{t\in N_w}g_t(y_w)-
\sum_{t\in N_l}g_t(y_l)
\right)
\right].
$$

If nuisance choices are conditionally independent of the preference label, have the same distribution on the chosen and rejected sides, and are not systematically correlated with the adaptive pair weight, this expectation is approximately zero. Their signs vary from pair to pair and average out.

Reward-critical tokens behave differently. If a token choice reliably changes the final answer or reward, it is correlated with being chosen, so

$$
\mathbb E\left[
w_{\mathrm{DPO}}
\left(
\sum_{t\in K_w}g_t(y_w)-
\sum_{t\in K_l}g_t(y_l)
\right)
\right]\ne 0.
$$

Across many comparisons, the gradient signal-to-noise ratio is therefore larger on reward-correlated decisions. Sequence-level preference supervision induces a statistical concentration of learning signal around critical decisions.

GRPO makes the same structure clearer. Its group gradient has the form

$$
\nabla J_{\mathrm{GRPO}}
\propto
\sum_{i=1}^{G}\hat A_i\sum_t g_t(y_i).
$$

Because standard group-normalized advantages satisfy $\sum_i\hat A_i=0$, a token feature that appears similarly across high- and low-reward samples tends to cancel. A token feature correlated with reward covaries with $\hat A_i$ and survives:

$$
\mathbb E[\hat A_i g_{i,t}]
=\operatorname{Cov}(\hat A_i,g_{i,t}).
$$

This is the sense in which DPO and GRPO perform **implicit token-level credit assignment**. They do not know which token is important in a single trajectory. Instead, relative comparisons suppress reward-independent variation and retain reward-correlated variation over repeated samples.

### Important limits

This mechanism is conditional, not automatic:

1. If annotators prefer a particular style, style is correlated with the label and will not cancel.
2. If chosen and rejected responses come from different models or decoding settings, their style distributions may be systematically different.
3. With only two samples, the estimator is noisy. Larger GRPO groups can estimate the reward covariance more reliably.
4. Every token in a trajectory still receives the same scalar sequence advantage in a standard implementation. This is not explicit process supervision.
5. A later-token loss can backpropagate through earlier hidden states. Cancellation of a prefix token's direct log-prob term does not detach the prefix representation from suffix computation.

## 6. On-policy and off-policy interpretation

The data source determines the label:

- If the current policy generates candidates, a judge ranks them, and the model is updated immediately, the procedure is online/on-policy.
- If pairs come from a fixed dataset, another model, or a stale policy and are repeatedly reused without importance correction, training is offline/off-policy relative to the current policy.
- GRPO is usually categorized as an on-policy PPO-family method because it samples from $\pi_{\mathrm{old}}$ and controls the update with ratios and clipping.

Thus offline DPO is naturally viewed as an off-policy group-of-two relative surrogate. DPO on fresh self-rollouts is the online analogue, not off-policy merely because the model generated both candidates itself.

## 7. Re-examining RAD-DPO

[RAD-DPO (*Robust Adaptive Denoising Direct Preference Optimization for Generative Retrieval in E-commerce*)](https://arxiv.org/abs/2602.23964) applies preference learning to generative retrieval, where each item is represented by a structured Semantic ID (SID). The paper argues that standard DPO penalizes a rejected SID's entire sequence, causing “push-pull” conflict on hierarchical prefix tokens shared by positive and negative items.

The relative-gradient view reveals several problems with that explanation.

### 7.1 Fixed-length pairwise SIDs already cancel shared prefixes

The paper constructs SIDs with three-level RQ-Kmeans codebooks. Chosen and rejected item IDs are therefore fixed-length sequences. For $|y_w|=|y_l|=L$, even its SimPO-style normalized score satisfies

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

Length normalization is only a common scale factor and does not restore a prefix gradient. For a standard pairwise DPO baseline, the claimed direct prefix conflict is algebraically absent.

### 7.2 The listwise objective can create a residual—but it is a different mechanism

RAD-DPO actually compares one positive with several negatives through log-sum-exp. Ignoring dynamic weights, let

$$
z=\log\sum_j\exp(\hat r_w-\hat r_j),
\qquad
q_j=\frac{\exp(-\hat r_j)}{\sum_k\exp(-\hat r_k)}.
$$

Then

$$
\nabla z=\nabla\hat r_w-\sum_jq_j\nabla\hat r_j.
$$

If only a subset $S$ of negatives shares a particular positive prefix, the direct coefficient on that prefix is

$$
\frac{1}{L}\left(1-\sum_{j\in S}q_j\right).
$$

It vanishes when every negative shares the prefix and remains when some negatives do not. This residual comes from comparing the positive against other, non-sharing negatives. It is not a push-pull conflict inside a shared positive-negative pair, and it is introduced by RAD-DPO's listwise objective rather than by standard pairwise DPO.

### 7.3 What TLGD actually changes

Token-Level Gradient Detachment stops the direct log-prob gradient of a negative sample's shared prefix while preserving the forward likelihood. This does not restore a zero-gradient symmetry. It removes the negative contribution and leaves the positive prefix contribution in place.

TLGD is therefore better described as **asymmetric positive-prefix protection or reinforcement**. It may be a useful inductive bias for hierarchical IDs, but that is different from proving that standard DPO contains an unstable prefix conflict.

The published formula also detaches prefix log-prob scalars, not the prefix hidden states or KV representations used to predict suffix tokens. Suffix losses can still backpropagate through the prefix context unless the implementation performs an additional activation detach.

### 7.4 Other questions about the objective

The published listwise loss also contains a calibration issue worth separating from prefix gradients:

$$
\log\sum_{j=1}^{n}\exp(\hat r_w-\hat r_j).
$$

When all scores are equal, this value is $\log n$, not zero. Adding more negatives therefore increases the apparent positive margin and pushes the outer sigmoid further toward saturation even before the positive outranks any negative. The experiment fixes $n=3$, so this is not an uncontrolled comparison across runs, but the $\log n$ offset still changes loss calibration and reduces the gradient weight.

RDRW computes weights from model hidden-state similarity and moving quantiles. The paper does not clearly state whether gradients are stopped through the similarity-derived weight. If they are not, the model may reduce loss by changing the weighting representation itself; if they are, RDRW is a non-stationary external heuristic. Either choice can be valid, but the optimization path should be specified.

### 7.5 What the evidence establishes

The TLGD ablation improves most offline metrics slightly, while SID Recall@128 is unchanged and hallucination rate is marginally worse. These results support possible engineering usefulness, but they do not directly validate the proposed mechanism: the paper does not report prefix-gradient angles, variance, norms, or oscillation curves, and it does not separate pairwise cancellation from listwise residual gradients.

The strongest defensible conclusion is therefore:

> TLGD may be a useful asymmetric credit-assignment rule for structured retrieval, but the paper's claim that it fixes an inherent shared-prefix gradient conflict in standard DPO is not supported by the algebra.

## 8. Final perspective

My understanding of DPO and GRPO is not that one is “supervised learning” and the other is “real RL.” At the gradient level, both construct relative weights over trajectories and multiply those weights by token score functions.

Their useful credit-assignment property comes from contrast:

- identical, shared tokens can cancel exactly;
- reward-independent stylistic variation can cancel in expectation;
- reward-correlated decisions survive repeated comparisons;
- larger and more diverse groups can improve this statistical separation.

DPO is the smallest non-trivial member of this family: a group of two with an adaptive logistic pair weight. GRPO generalizes the relative comparison to larger online groups and adds policy-optimization machinery.

This view also provides a useful test for new preference objectives. Before introducing a token-level correction, first expand the loss and ask: **Which token gradients are already canceled by symmetry? Which survive only because the objective broke that symmetry? And is the proposed correction removing noise, or deliberately introducing a new credit-assignment bias?**

## References

- Rafailov et al., [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290), NeurIPS 2023.
- Shao et al., [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300), 2024.
- Li et al., [RAD-DPO: Robust Adaptive Denoising Direct Preference Optimization](https://arxiv.org/abs/2602.23964), SIGIR 2026; [DOI](https://doi.org/10.1145/3805712.3808512).
