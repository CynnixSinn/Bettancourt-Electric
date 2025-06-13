'use server';

/**
 * @fileOverview The AI Agent Coordinator flow. This flow monitors all subsystems and takes proactive actions.
 *
 * - aiAgentCoordinator - A function that initiates the AI agent to monitor and coordinate subsystems.
 * - AiAgentCoordinatorInput - The input type for the aiAgentCoordinator function.
 * - AiAgentCoordinatorOutput - The return type for the aiAgentCoordinator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAgentCoordinatorInputSchema = z.object({
  jobStatus: z
    .string()
    .describe('The current status of the job (e.g., delayed, on schedule).'),
  partsOrderStatus: z
    .string()
    .describe('The status of the parts order (e.g., pending, shipped, delivered).'),
  emailStatus: z
    .string()
    .describe('The status of the email notifications (e.g., sent, failed).'),
  paymentStatus: z
    .string()
    .describe('The status of the payment (e.g., pending, received).'),
  deadlineStatus: z
    .string()
    .describe('The status of the job deadline (e.g., approaching, missed).'),
});

export type AiAgentCoordinatorInput = z.infer<typeof AiAgentCoordinatorInputSchema>;

const AiAgentCoordinatorOutputSchema = z.object({
  actionTaken: z
    .string()
    .describe(
      'The action taken by the AI agent to address any issues (e.g., updated customer, rescheduled job).
'    ),
  reason: z.string().describe('The reasoning behind the action taken.'),
});

export type AiAgentCoordinatorOutput = z.infer<typeof AiAgentCoordinatorOutputSchema>;

export async function aiAgentCoordinator(input: AiAgentCoordinatorInput): Promise<AiAgentCoordinatorOutput> {
  return aiAgentCoordinatorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAgentCoordinatorPrompt',
  input: {schema: AiAgentCoordinatorInputSchema},
  output: {schema: AiAgentCoordinatorOutputSchema},
  prompt: `You are a central AI agent monitoring various subsystems to ensure smooth operations.

  Based on the status of the subsystems, take proactive actions to avoid intervention.

  Job Status: {{{jobStatus}}}
  Parts Order Status: {{{partsOrderStatus}}}
  Email Status: {{{emailStatus}}}
  Payment Status: {{{paymentStatus}}}
  Deadline Status: {{{deadlineStatus}}}

  What action will you take and why?

  Action Taken: 
  Reason:
  `,
});

const aiAgentCoordinatorFlow = ai.defineFlow(
  {
    name: 'aiAgentCoordinatorFlow',
    inputSchema: AiAgentCoordinatorInputSchema,
    outputSchema: AiAgentCoordinatorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
