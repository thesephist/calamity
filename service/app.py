import time
from flask import Flask, request, jsonify
from transformers import pipeline, set_seed, AutoTokenizer, AutoModelForCausalLM

model_name = 'EleutherAI/gpt-j-6B'

# tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)

# model
model = AutoModelForCausalLM.from_pretrained(model_name)
model.config.temperature = 0.75
model.config.top_p = 0.9

# generator pipeline
generator = pipeline('text-generation',
        tokenizer=tokenizer,
        model=model)

set_seed(int(time.time()))

def infer(prompt, tokens_count, num_sequences, eos_token):
    input_tokens = len(tokenizer(prompt)['input_ids'])
    seqs = generator(prompt,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer(eos_token).input_ids[0] if eos_token else tokenizer.eos_token_id,
            max_length=input_tokens + tokens_count,
            num_return_sequences=num_sequences)
    return jsonify([seq['generated_text'] for seq in seqs])

app = Flask(__name__)

@app.route('/generate/', methods=['POST'])
def generate():
    params = request.get_json(force=True)
    # TODO: error handling
    return infer(params.get('text'), params.get('tokens', 10), params.get('n', 1), params.get('eos'))

