import OpenAI from 'openai';

const provider = (process.env.EMBEDDINGS_PROVIDER || 'openai').toLowerCase();
const embeddingsEnabled = (process.env.EMBEDDINGS_ENABLED || 'true').toLowerCase() !== 'false';
const embedAgentMessages = (process.env.EMBED_AGENT_MESSAGES || 'false').toLowerCase() === 'true';
const defaultModel = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';

let openaiClient;

const providerUnavailableMessage = 'Embeddings provider is not configured. Set OPENAI_API_KEY or the relevant provider key.';

function isProviderReady() {
  if (!embeddingsEnabled) return false;
  if (provider === 'openai') {
    return Boolean(process.env.OPENAI_API_KEY);
  }
  return false;
}

async function getClient() {
  if (!isProviderReady()) {
    throw new Error(providerUnavailableMessage);
  }
  if (provider === 'openai') {
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
  }
  throw new Error(`Unsupported embeddings provider: ${provider}`);
}

export async function getEmbeddingForText(text, options = {}) {
  if (!isProviderReady()) return null;
  if (!text || !text.trim()) return null;

  if (provider === 'openai') {
    const client = await getClient();
    const response = await client.embeddings.create({
      input: text,
      model: options.model || defaultModel
    });
    return response.data[0]?.embedding || null;
  }

  throw new Error(`Unsupported embeddings provider: ${provider}`);
}

export const embeddingsConfig = {
  enabled: embeddingsEnabled,
  provider,
  model: defaultModel,
  embedAgentMessages
};
