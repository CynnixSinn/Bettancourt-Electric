'use server';
/**
 * @fileOverview Converts voice input to text and extracts work order details.
 *
 * - voiceToTextWorkOrder - A function that transcribes voice input and extracts relevant work order details.
 * - VoiceToTextWorkOrderInput - The input type for the voiceToTextWorkOrder function.
 * - VoiceToTextWorkOrderOutput - The return type for the voiceToTextWorkOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceToTextWorkOrderInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data URI of the work order request.  It must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VoiceToTextWorkOrderInput = z.infer<typeof VoiceToTextWorkOrderInputSchema>;

const VoiceToTextWorkOrderOutputSchema = z.object({
  customerDetails: z.string().describe('Details of the customer making the request.'),
  jobDescription: z.string().describe('Description of the job to be done.'),
  urgency: z.string().describe('The urgency of the work order (e.g., high, medium, low).'),
  location: z.string().describe('The location where the work needs to be performed.'),
});
export type VoiceToTextWorkOrderOutput = z.infer<typeof VoiceToTextWorkOrderOutputSchema>;

export async function voiceToTextWorkOrder(input: VoiceToTextWorkOrderInput): Promise<VoiceToTextWorkOrderOutput> {
  return voiceToTextWorkOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceToTextWorkOrderPrompt',
  input: {schema: VoiceToTextWorkOrderInputSchema},
  output: {schema: VoiceToTextWorkOrderOutputSchema},
  prompt: `You are a virtual assistant tasked with processing work order requests from audio recordings.\n\n  Given the following audio transcription, extract the customer details, job description, urgency, and location.  If any information is missing, indicate that it is unknown.\n\n  Transcription: {{text url=audioDataUri}}\n\n  Present the extracted information in a structured format.\n  `,
});

const voiceToTextWorkOrderFlow = ai.defineFlow(
  {
    name: 'voiceToTextWorkOrderFlow',
    inputSchema: VoiceToTextWorkOrderInputSchema,
    outputSchema: VoiceToTextWorkOrderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
