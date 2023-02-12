import time
import torch
from flask import Flask, request, jsonify
from transformers import pipeline, set_seed, AutoTokenizer, AutoModelForCausalLM, AutoModelForSeq2SeqLM

lm_model_name = 'EleutherAI/gpt-j-6B'
tokenizer = AutoTokenizer.from_pretrained(lm_model_name)
model = AutoModelForCausalLM.from_pretrained(lm_model_name, device_map='auto', load_in_8bit=True)
generator = pipeline(
    'text-generation',
    tokenizer=tokenizer,
    model=model,
)

chat_model_name = 'allenai/cosmo-xl'
chat_tokenizer = AutoTokenizer.from_pretrained(chat_model_name)
chat_model = AutoModelForSeq2SeqLM.from_pretrained(chat_model_name, device_map='auto', load_in_8bit=True)

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

def chat_infer(situation, instruction, messages):
    def set_input(situation_narrative, role_instruction, conversation_history):
        input_text = " <turn> ".join(conversation_history)
        if role_instruction != "":
            input_text = "{} <sep> {}".format(role_instruction, input_text)
        if situation_narrative != "":
            input_text = "{} <sep> {}".format(situation_narrative, input_text)
        return input_text

    def chat_generate(situation_narrative, role_instruction, conversation_history):
        input_text = set_input(situation_narrative, role_instruction, conversation_history)
        inputs = tokenizer([input_text], return_tensors="pt").to(chat_model.device)
        outputs = model.generate(
            inputs["input_ids"],
            max_new_tokens=512,
            temperature=1.0,
            top_p=0.9,
            do_sample=True,
        )
        response = tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)
        return response

    return jsonify(chat_generate(situation, instruction, messages))

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

@app.route('/chat_generate/', methods=['POST'])
def chat_generate():
    params = request.get_json(force=True)
    return chat_infer(
        params.get('context', ''),
        params.get('instruction', ''),
        params.get('messages', []),
    )

