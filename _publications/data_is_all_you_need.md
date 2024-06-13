---
title: "Data is all you need: Finetuning LLMs for Chip Design via an Automated design-data augmentation framework"
collection: publications
permalink: /publication/data_is_all_you_need
date: 2024
venue: 'DAC'
paperurl: 'https://yyh-sjtu.github.io/files/data_is_all_you_need.pdf'
citation: 'Chang K, Wang K, Yang N, et al. Data is all you need: Finetuning LLMs for Chip Design via an Automated design-data augmentation framework[J]. arXiv preprint arXiv:2403.11202, 2024.'
---

Recent advances in large language models have demonstrated their potential for automated generation of Verilog code from high-level prompts. Researchers have utilized fine-tuning to enhance the ability of these large language models (LLMs) in the field of Chip Design. However, the lack of Verilog data hinders further improvement in the quality of Verilog generation by LLMs. Additionally, the absence of a Verilog and EDA script data augmentation framework significantly increases the time required to prepare the training dataset for LLM trainers. In this paper, we propose an automated design-data augmentation framework, which generates high quality natural language description of the Verilog/EDA script. To evaluate the effectiveness of our data augmentation method, we finetune Llama2-13B and Llama2-7B models. The results demonstrate a significant improvement in the Verilog generation task when compared to the general data augmentation method. Moreover, the accuracy of Verilog generation surpasses that of the current state-of-the-art open-source Verilog generation model, increasing from 58.8% to 70.6% with the same benchmark and outperforms GPT-3.5 in Verilog repair and EDA Script Generation with only 13B weights.
