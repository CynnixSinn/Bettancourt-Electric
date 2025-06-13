'use server';

/**
 * @fileOverview Analyzes a work order and estimates the parts, tools, and man-hours needed.
 *
 * - analyzeWorkOrder - A function that handles the work order analysis process.
 * - AnalyzeWorkOrderInput - The input type for the analyzeWorkOrder function.
 * - AnalyzeWorkOrderOutput - The return type for the analyzeWorkOrder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeWorkOrderInputSchema = z.object({
  jobDescription: z.string().describe('The description of the work order job.'),
  customerDetails: z.string().describe('Details about the customer.'),
  urgency: z.string().describe('The urgency level of the work order.'),
  location: z.string().describe('The location of the job.'),
});
export type AnalyzeWorkOrderInput = z.infer<typeof AnalyzeWorkOrderInputSchema>;

const AnalyzeWorkOrderOutputSchema = z.object({
  partList: z.string().describe('A list of parts needed for the job.'),
  jobDurationEstimate: z.string().describe('An estimate of the job duration.'),
  urgencyLevel: z.string().describe('The urgency level of the job.'),
  toolsNeeded: z.string().describe('A list of tools needed for the job.'),
  manHoursNeeded: z.string().describe('An estimate of the man-hours needed for the job.'),
});
export type AnalyzeWorkOrderOutput = z.infer<typeof AnalyzeWorkOrderOutputSchema>;

export async function analyzeWorkOrder(input: AnalyzeWorkOrderInput): Promise<AnalyzeWorkOrderOutput> {
  return analyzeWorkOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWorkOrderPrompt',
  input: {schema: AnalyzeWorkOrderInputSchema},
  output: {schema: AnalyzeWorkOrderOutputSchema},
  prompt: `You are an AI assistant that analyzes work orders and estimates the parts, tools, and man-hours needed.\n\nAnalyze the following work order:\n\nCustomer Details: {{{customerDetails}}}\nJob Description: {{{jobDescription}}}\nUrgency: {{{urgency}}}\nLocation: {{{location}}}\n\nProvide a list of parts needed, an estimate of the job duration, the urgency level, a list of tools needed, and an estimate of the man-hours needed.\n\nParts Database:\n[Assume a comprehensive parts database is available]\n\nPrior Job Examples:\n[Assume access to prior job examples for reference]`,
});

const analyzeWorkOrderFlow = ai.defineFlow(
  {
    name: 'analyzeWorkOrderFlow',
    inputSchema: AnalyzeWorkOrderInputSchema,
    outputSchema: AnalyzeWorkOrderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
