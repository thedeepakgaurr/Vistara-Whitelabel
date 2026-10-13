import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  ratePerConnectedMinute: z.coerce.number().min(0).default(2),
  ratePerUnconnectedCall: z.coerce.number().min(0).default(0),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  ratePerConnectedMinute: z.coerce.number().min(0).optional(),
  ratePerUnconnectedCall: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const walletAdjustSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().trim().max(255).optional(),
});

export const deliverableItemSchema = z.object({
  question: z.string().trim().min(1, 'Question/Field is required'),
  type: z.enum(['fixed', 'short', 'text', 'number', 'boolean']),
  options: z.string().trim().optional(),
  description: z.string().trim().optional(),
  isGoal: z.boolean().optional(),
  goalValue: z.string().trim().optional(),
});

export const adminCreateAgentSchema = z
  .object({
    vistaraAgentId: z.string().trim().max(255).optional(),
    name: z.string().trim().min(1, 'Agent name is required').max(255),
    description: z.string().trim().max(500).optional().nullable(),
    userId: z.coerce.number().int().positive().nullable().optional(),
    language: z.string().trim().default('English'),
    calling_method: z.enum(['traditional', 'gemini_live']).default('traditional'),
    voice: z.string().trim().default('meera'),
    first_message: z.string().trim().max(2000).optional(),
    system_instruction: z.string().trim().max(25000).optional(),
    deliverables: z.array(deliverableItemSchema).optional(),
    status: z.enum(['active', 'paused']).default('active'),
    tts_pace: z.coerce.number().min(0.5).max(2.0).optional(),
    filler_enabled: z.boolean().optional(),
    background_ambience: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => Boolean(data.vistaraAgentId || (data.first_message && data.system_instruction)),
    {
      message: 'Either provide an existing Vistara Agent ID or specify both First Message and System Instruction',
      path: ['first_message'],
    }
  );

export const adminUpdateAgentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  userId: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'paused']).optional(),
  language: z.string().trim().optional(),
  calling_method: z.enum(['traditional', 'gemini_live']).optional(),
  voice: z.string().trim().optional(),
  first_message: z.string().trim().max(2000).optional(),
  system_instruction: z.string().trim().max(25000).optional(),
  deliverables: z.array(deliverableItemSchema).optional(),
  tts_pace: z.coerce.number().min(0.5).max(2.0).optional(),
  filler_enabled: z.boolean().optional(),
  background_ambience: z.coerce.number().min(0).max(100).optional(),
});

const contactSchema = z.object({
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(255),
  agentId: z.coerce.number().int().positive('Select an agent'),
  contacts: z.array(contactSchema).min(1, 'Add at least one contact'),
});

export const adminCreateCampaignSchema = z.object({
  userId: z.coerce.number().int().positive('Select a user'),
  agentId: z.coerce.number().int().positive('Select an agent'),
  name: z.string().trim().min(1, 'Campaign name is required').max(255),
  contacts: z.array(contactSchema).min(1, 'Add at least one contact'),
});

export const createAdhocCallSchema = z.object({
  agentId: z.coerce.number().int().positive('Select an agent'),
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
});

export const publicInitiateCallSchema = z.object({
  agentId: z.coerce.number().int().positive('agentId is required'),
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
