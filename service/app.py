import os
import time
import json
import torch
from typing import List
import torch.nn.functional as F
from flask import Flask, request, jsonify
from transformers import (
    pipeline,
    set_seed,
    AutoTokenizer,
    AutoModelForCausalLM,
    StoppingCriteria,
)
from sentence_transformers import SentenceTransformer

token = os.environ['HF_TOKEN']

free_vram = torch.cuda.get_device_properties(0).total_memory / 1e9
lm_model_name = 'meta-llama/Llama-2-13b-hf' if free_vram > 16 else 'meta-llama/Llama-2-7b-hf'
safe_model_max_length = int(os.environ.get('SAFE_MODEL_MAX_LENGTH', 4096)) # 4k train-time ctx_len for Llama 2
tokenizer = AutoTokenizer.from_pretrained(lm_model_name, token=token, model_max_length=safe_model_max_length)
model = AutoModelForCausalLM.from_pretrained(lm_model_name, token=token, device_map='auto', load_in_8bit=True)
generator = pipeline(
    'text-generation',
    tokenizer=tokenizer,
    model=model,
)

search_model_name = 'all-mpnet-base-v2'
search_index_file = './search_index.json'
search_model = SentenceTransformer(search_model_name).to('cpu')
with open(search_index_file) as f:
    index = json.load(f)
    search_texts = index['texts']
    search_embeddings = torch.tensor(index['embeddings'])

    def retrieve_search(query: str, n: int = 5) -> List[str]:
        query_embedding = search_model.encode(query, convert_to_tensor=True).to('cpu')
        similarities = F.cosine_similarity(query_embedding, search_embeddings)
        indexes = sorted(range(len(search_texts)), key=similarities.__getitem__, reverse=True)
        return [search_texts[i] for i in indexes[:n]]

class StopSequenceCriteria(StoppingCriteria):
    """
    StoppingCriteria that implements a very basic version of a multi-token stop
    sequence. If batch_size > 1, only looks at the first of the batch.
    """
    def __init__(self, prompt: str, stop_sequence: str):
        self.prompt = prompt
        self.stop_sequence = stop_sequence

    def __call__(self, input_ids: torch.FloatTensor, scores, **kwargs):
        # assumes no batching
        generated_text = tokenizer.decode(input_ids[0])[len(self.prompt):]
        return self.stop_sequence in generated_text

    def __len__(self):
        return 1

    def __iter__(self):
        yield self

def infer(
    prompt,
    tokens_count,
    num_sequences,
    eos_token,
    stop_sequence,
    temperature,
    top_p,
):
    prompt = prompt.encode('utf-8', 'ignore').decode('utf-8', 'ignore') # ignore broken text encodings
    prompt = tokenizer.decode(
        tokenizer.encode(prompt)[-(safe_model_max_length - tokens_count):],
        skip_special_tokens=True,
    )
    seqs = generator(
        prompt,
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=tokenizer(eos_token).input_ids[-1] if eos_token else tokenizer.eos_token_id,
        handle_long_generation='hole',
        max_new_tokens=tokens_count,
        num_return_sequences=num_sequences,
        return_full_text=False,
        do_sample=True,
        temperature=temperature,
        top_p=top_p,
        stopping_criteria=StopSequenceCriteria(prompt, stop_sequence) if stop_sequence else None,
    )
    return jsonify([seq['generated_text'] for seq in seqs])

app = Flask(__name__)
app.json.ensure_ascii = False

@app.route('/generate/', methods=['POST'])
def generate():
    params = request.get_json(force=True)
    return infer(
        prompt=params.get('text', ''),
        tokens_count=params.get('tokens', 10),
        num_sequences=params.get('n', 1),
        eos_token=params.get('eos'),
        stop_sequence=params.get('stop'),
        temperature=params.get('temperature', 1.0),
        top_p=params.get('top_p', 0.9),
    )

@app.route('/search/', methods=['POST'])
def search():
    params = request.get_json(force=True)
    return retrieve_search(
        params.get('query', ''),
        params.get('n', 5),
    )

