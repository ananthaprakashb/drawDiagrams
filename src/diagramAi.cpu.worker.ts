import { env, pipeline, TextStreamer } from '@huggingface/transformers';
import type { TextGenerationPipelineType } from '@huggingface/transformers';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type CpuRequest = { id: number; messages: ChatMessage[] };

// GitHub Pages does not set the cross-origin isolation headers needed for WASM threads.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

let generatorPromise: Promise<TextGenerationPipelineType> | null = null;
// Narrow the many pipeline overloads for TypeScript 7's union-size limit.
const createTextGenerator = pipeline as (task: 'text-generation', model: string, options: {
  device: 'wasm'; dtype: 'q4'; progress_callback: (progress: { status: string; progress?: number }) => void;
}) => Promise<TextGenerationPipelineType>;

self.onmessage = async (event: MessageEvent<CpuRequest>) => {
  const { id, messages } = event.data;
  try {
    generatorPromise ??= createTextGenerator('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (progress) => {
        if (progress.status === 'progress') {
          self.postMessage({ id, type: 'progress', message: `Downloading CPU model: ${Math.round(progress.progress ?? 0)}%` });
        } else if (progress.status === 'initiate') {
          self.postMessage({ id, type: 'progress', message: 'Loading CPU model files…' });
        }
      },
    });
    const generator = await generatorPromise;
    self.postMessage({ id, type: 'progress', message: 'Preparing the prompt on the CPU…' });
    let partial = '';
    let tokens = 0;
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (chunk) => {
        partial += chunk;
        self.postMessage({ id, type: 'partial', text: partial, tokens });
      },
      token_callback_function: () => {
        tokens += 1;
        if (tokens === 1 || tokens % 10 === 0) {
          self.postMessage({ id, type: 'progress', message: `Writing Mermaid text with the CPU model (${tokens} tokens)…` });
        }
      },
    });
    const result = await generator(messages, { max_new_tokens: 260, do_sample: false, streamer });
    const first = result[0];
    const generated = (Array.isArray(first) ? first[0] : first)?.generated_text;
    const reply = typeof generated === 'string' ? generated : generated?.at(-1)?.content ?? '';
    self.postMessage({ id, type: 'result', reply });
  } catch (error) {
    generatorPromise = null;
    self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
