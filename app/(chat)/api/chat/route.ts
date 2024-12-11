import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamObject,
  streamText,
} from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  renameTitleById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from '@/lib/db/queries';
import type { Suggestion } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { error } from 'console';

export const maxDuration = 60;

type AllowedTools =
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];

// Saved URL for API Call to FastAPI
const fastapiUrl = process.env.VERCEL_URL 
? `https://${process.env.VERCEL_URL}/infer` 
: 'http://127.0.0.1:8000/infer';

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

// export async function POST(request: Request) {
//   const {
//     id,
//     messages,
//     modelId,
//   }: { id: string; messages: Array<Message>; modelId: string } =
//     await request.json();

//   const session = await auth();

//   if (!session || !session.user || !session.user.id) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   const model = models.find((model) => model.id === modelId);

//   if (!model) {
//     return new Response('Model not found', { status: 404 });
//   }

//   const coreMessages = convertToCoreMessages(messages);
//   const userMessage = getMostRecentUserMessage(coreMessages);

//   if (!userMessage) {
//     return new Response('No user message found', { status: 400 });
//   }

//   const chat = await getChatById({ id });

//   if (!chat) { 
//     //const title = await generateTitleFromUserMessage({ message: userMessage });
//     //const title = renameTitleById({chatId : id});
//     const title = 'New Patient';
//     await saveChat({ id, userId: session.user.id, title });
//   }

//   const userMessageId = generateUUID();

//   await saveMessages({
//     messages: [
//       { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
//     ],
//   });

//   const streamingData = new StreamData();

//   streamingData.append({
//     type: 'user-message-id',
//     content: userMessageId,
//   });

//   const result = streamText({
//     model: customModel(model.apiIdentifier),
//     system: systemPrompt,
//     messages: coreMessages,
  

    //maxSteps: 5,
    //experimental_activeTools: allTools,
    // tools: {
    //   getWeather: {
    //     description: 'Get the current weather at a location',
    //     parameters: z.object({
    //       latitude: z.number(),
    //       longitude: z.number(),
    //     }),
    //     execute: async ({ latitude, longitude }) => {
    //       const response = await fetch(
    //         `fastapiUrl`,
    //       );

    //       const weatherData = await response.json();
    //       return weatherData;
    //     },
    //   },
    //   createDocument: {
    //     description: 'Create a document for a writing activity',
    //     parameters: z.object({
    //       title: z.string(),
    //     }),
    //     execute: async ({ title }) => {
    //       const id = generateUUID();
    //       let draftText = '';

    //       streamingData.append({
    //         type: 'id',
    //         content: id,
    //       });

    //       streamingData.append({
    //         type: 'title',
    //         content: title,
    //       });

    //       streamingData.append({
    //         type: 'clear',
    //         content: '',
    //       });

    //       const { fullStream } = streamText({
    //         model: customModel(model.apiIdentifier),
    //         system:
    //           'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
    //         prompt: title,
    //       });

    //       for await (const delta of fullStream) {
    //         const { type } = delta;

    //         if (type === 'text-delta') {
    //           const { textDelta } = delta;

    //           draftText += textDelta;
    //           streamingData.append({
    //             type: 'text-delta',
    //             content: textDelta,
    //           });
    //         }
    //       }

    //       streamingData.append({ type: 'finish', content: '' });

    //       if (session.user?.id) {
    //         await saveDocument({
    //           id,
    //           title,
    //           content: draftText,
    //           userId: session.user.id,
    //         });
    //       }

    //       return {
    //         id,
    //         title,
    //         content: 'A document was created and is now visible to the user.',
    //       };
    //     },
    //   },
    //   updateDocument: {
    //     description: 'Update a document with the given description',
    //     parameters: z.object({
    //       id: z.string().describe('The ID of the document to update'),
    //       description: z
    //         .string()
    //         .describe('The description of changes that need to be made'),
    //     }),
    //     execute: async ({ id, description }) => {
    //       const document = await getDocumentById({ id });

    //       if (!document) {
    //         return {
    //           error: 'Document not found',
    //         };
    //       }

    //       const { content: currentContent } = document;
    //       let draftText = '';

    //       streamingData.append({
    //         type: 'clear',
    //         content: document.title,
    //       });

    //       const { fullStream } = streamText({
    //         model: customModel(model.apiIdentifier),
    //         system:
    //           'You are a helpful writing assistant. Based on the description, please update the piece of writing.',
    //         experimental_providerMetadata: {
    //           openai: {
    //             prediction: {
    //               type: 'content',
    //               content: currentContent,
    //             },
    //           },
    //         },
    //         messages: [
    //           {
    //             role: 'user',
    //             content: description,
    //           },
    //           { role: 'user', content: currentContent },
    //         ],
    //       });

    //       for await (const delta of fullStream) {
    //         const { type } = delta;

    //         if (type === 'text-delta') {
    //           const { textDelta } = delta;

    //           draftText += textDelta;
    //           streamingData.append({
    //             type: 'text-delta',
    //             content: textDelta,
    //           });
    //         }
    //       }

    //       streamingData.append({ type: 'finish', content: '' });

    //       if (session.user?.id) {
    //         await saveDocument({
    //           id,
    //           title: document.title,
    //           content: draftText,
    //           userId: session.user.id,
    //         });
    //       }
    
    //       return {
    //         id,
    //         title: document.title,
    //         content: 'The document has been updated successfully.',
    //       };
    //     },
    //   },
    //   requestSuggestions: {
    //     description: 'Request suggestions for a document',
    //     parameters: z.object({
    //       documentId: z
    //         .string()
    //         .describe('The ID of the document to request edits'),
    //     }),
    //     execute: async ({ documentId }) => {
    //       const document = await getDocumentById({ id: documentId });

    //       if (!document || !document.content) {
    //         return {
    //           error: 'Document not found',
    //         };
    //       }

    //       const suggestions: Array<
    //         Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
    //       > = [];

    //       const { elementStream } = streamObject({
    //         model: customModel(model.apiIdentifier),
    //         system:
    //           'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
    //         prompt: document.content,
    //         output: 'array',
    //         schema: z.object({
    //           originalSentence: z.string().describe('The original sentence'),
    //           suggestedSentence: z.string().describe('The suggested sentence'),
    //           description: z
    //             .string()
    //             .describe('The description of the suggestion'),
    //         }),
    //       });

    //       for await (const element of elementStream) {
    //         const suggestion = {
    //           originalText: element.originalSentence,
    //           suggestedText: element.suggestedSentence,
    //           description: element.description,
    //           id: generateUUID(),
    //           documentId: documentId,
    //           isResolved: false,
    //         };

    //         streamingData.append({
    //           type: 'suggestion',
    //           content: suggestion,
    //         });

    //         suggestions.push(suggestion);
    //       }

    //       if (session.user?.id) {
    //         const userId = session.user.id;

    //         await saveSuggestions({
    //           suggestions: suggestions.map((suggestion) => ({
    //             ...suggestion,
    //             userId,
    //             createdAt: new Date(),
    //             documentCreatedAt: document.createdAt,
    //           })),
    //         });
    //       }

    //       return {
    //         id: documentId,
    //         title: document.title,
    //         message: 'Suggestions have been added to the document',
    //       };
    //     },
    //   },
    // },


//     onFinish: async ({ response }) => {
//       if (session.user?.id) {
//         try {
//           const responseMessagesWithoutIncompleteToolCalls =
//             sanitizeResponseMessages(response.messages);

//           await saveMessages({
//             messages: responseMessagesWithoutIncompleteToolCalls.map(
//               (message) => {
//                 const messageId = generateUUID();

//                 if (message.role === 'assistant') {
//                   streamingData.appendMessageAnnotation({
//                     messageIdFromServer: messageId,
//                   });
//                 }

//                 return {
//                   id: messageId,
//                   chatId: id,
//                   role: message.role,
//                   content: message.content,
//                   createdAt: new Date(),
//                 };
//               },
//             ),
//           });
//         } catch (error) {
//           console.error('Failed to save chat');
//         }
//       }

//       streamingData.close();
//     },
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: 'stream-text',
//     },
//   });

//   return result.toDataStreamResponse({
//     data: streamingData,
//   });
// }

export async function POST(request: Request) {
  const { id, messages, modelId }: { id: string; messages: Array<Message>; modelId: string } = await request.json();

  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const coreMessages = convertToCoreMessages(messages);
    const userMessage = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = 'New Patient';
      await saveChat({ id, userId: session.user.id, title });
    }

    const userMessageId = generateUUID();

    await saveMessages({
      messages: [
        { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
      ],
    });

    console.log('Sending request to FastAPI:', userMessage);

    if (!fastapiUrl) {
      throw new Error('FASTAPI_URL is not defined');
    }

    const result = streamText({
      model: {
        invoke: async ({ messages }) => {
          const response = await fetch(`${fastapiUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
          });

          if (!response.ok) {
            throw new Error(`FastAPI request failed with status ${response.status}`);
          }

          const data = response.body;
          if (!data) {
            throw new Error('No data received from FastAPI');
          }

          return data;
        },
      },
      messages: coreMessages,
      onFinish: async ({ text }) => {
        await saveMessages({
          messages: [
            {
              id: generateUUID(),
              createdAt: new Date(),
              content: text,
              role: 'assistant',
              chatId: id,
            },
          ],
        });
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in POST function:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}


// const response = await fetch(fastapiUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({ user_input: userMessage.content }).toString(),
    // });
    
    // if (!response.ok) {
    //   throw new Error(`API call failed: ${response.statusText}`);
    // }
    
    // const { message } = await response.json();
    // streamingData.append({ type: 'response', content: message });

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

function splitIntoChunks(text: string, chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}