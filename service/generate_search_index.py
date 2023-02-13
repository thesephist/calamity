if __name__ == '__main__':
    # load
    import json

    docs_path = './docs.json'
    with open(docs_path, 'rb') as f:
        content = f.read().decode('utf-8', 'ignore').encode('utf-8')
        docs = json.loads(content)
    print(f'Building index with {len(docs)} documents')

    # chunk
    chunk_size = 1000
    def chunk(text: str):
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunks.append(text[i:chunk_size])
        return chunks

    def flatten(xs):
        return [item for sublist in xs for item in sublist]

    chunked_texts = flatten([chunk(t) for t in texts])
    print(f'... {len(chunked_texts)} chunks to embed.')

    # embed
    from sentence_transformers import SentenceTransformer

    model_name = 'all-mpnet-base-v2'
    model = SentenceTransformer(model_name).to('cuda')
    embeddings = model.encode(chunked_texts, convert_to_tensor=True)

    # persist
    import json

    with open('./search_index.json', 'w+') as f:
        json.dump({
            'texts': chunked_texts,
            'embeddings': embeddings.round(decimals=4).tolist(),
        }, f)

