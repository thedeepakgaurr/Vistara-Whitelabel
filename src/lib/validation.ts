import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(255),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

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

export const adminCreateAgentSchema = z.object({
  vistaraAgentId: z.string().trim().min(1, 'Vistara Agent ID is required').max(255),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).optional(),
  userId: z.coerce.number().int().positive().nullable().optional(),
});

export const adminUpdateAgentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(500).optional(),
  userId: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

const contactSchema = z.object({
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
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
