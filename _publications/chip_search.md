---
title: "ChipGPT: Enabling Template-Free Hardware Design Space Exploration via LLM-Driven Chip Discovery Search"
collection: publications
permalink: /publication/chip_search
date: 2024-08-10
venue: 'Submitting to MLCAD'
paperurl: 'https://yyh-sjtu.github.io/files/chip_search.pdf'
citation: 'Chang K, Wang Y, Zhou Y, et al. ChipGPT: Enabling Template-Free Hardware Design Space Exploration via LLM-Driven Chip Discovery Search[J].'
---

Recently, using design space exploration to design a better chip draw much attention in EDA community. However, design space exploration requires a profound knowledge to construct a template, which limits the design space. Inspired by DeepMind’s Funsearch published in Nature, we leverage the professional knowledge feature of LLM to search for a new hardware design, which does not need a template. Our method is a LLM integrated search method, which leverages existing RTL designs to generate a new RTL design or extract a rule to optimize hardware designs. This process reinforces the knowledge of LLM via the feedback from EDA tool. It supports loop level, RTL level and gate-level module generation, which greatly enlarges the design space by enabling a template-free design space exploration. We evaluate this method using a wide range of LLM. The results show that this method can search for better results. It reveals that our infinite knowledge reinforcement learning can generate previously undefined hardware, which enablestemplate-free design space exploration.
