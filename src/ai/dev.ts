import { config } from 'dotenv';
config();

import '@/ai/flows/voice-to-text-work-order.ts';
import '@/ai/flows/ai-agent-coordinator.ts';
import '@/ai/flows/invoice-generator.ts';
import '@/ai/flows/ai-job-analysis.ts';