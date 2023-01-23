import time
import torch
from flask import Flask, request, jsonify
from transformers import pipeline, set_seed, AutoTokenizer, AutoModelForCausalLM

model_name = 'EleutherAI/gpt-j-6B'

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, device_map='auto', torch_dtype=torch.float16)
generator = pipeline(
    'text-generation',
    tokenizer=tokenizer,
    model=model,
)

def infer(prompt, tokens_count, num_sequences, eos_token):
    seqs = generator(
        prompt,
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=tokenizer(eos_token).input_ids[0] if eos_token else tokenizer.eos_token_id,
        max_new_tokens=tokens_count,
        num_return_sequences=num_sequences,
        do_sample=True,
        temperature=1.0,
        top_p=0.9,
    )
    return jsonify([seq['generated_text'] for seq in seqs])

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

@app.route('/generate/', methods=['POST'])
def generate():
    params = request.get_json(force=True)
    return infer(
        params.get('text', ''),
        params.get('tokens', 10),
        params.get('n', 1),
        params.get('eos'),
    )

