// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B ',
    apiIdentifier: 'llama-3.3-70b-versatile',
    description: 'For complex, multi-step tasks',
  },
  {
    id: 'gpt-4o',
    label: 'GPT 4o',
    apiIdentifier: 'gpt-4o',
    description: 'For complex, multi-step tasks',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'llama-3.3-70b-versatile';
