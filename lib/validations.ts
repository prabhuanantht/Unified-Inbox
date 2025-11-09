import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().transform((v) => (v === '' ? undefined : v)),
  email: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  phones: z.array(z.string()).optional(),
  emails: z.array(z.string().email()).optional(),
  socialHandles: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const messageSchema = z.object({
  contactId: z.string().cuid(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK', 'INSTAGRAM', 'SLACK']),
  content: z.string().optional(),
  subject: z.string().optional(), // For EMAIL channel
  mediaUrls: z.array(z.string()).optional(),
  replyToMessageId: z.string().optional(),
  scheduledFor: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val) return undefined;
    return typeof val === 'string' ? val : val.toISOString();
  }),
}).refine((data) => {
  // For EMAIL, either content or subject+content must be provided
  // For other channels, either content or mediaUrls must be provided
  if (data.channel === 'EMAIL') {
    return (data.content && data.content.trim().length > 0) || 
           (data.mediaUrls && data.mediaUrls.length > 0);
  }
  return (data.content && data.content.trim().length > 0) || (data.mediaUrls && data.mediaUrls.length > 0);
}, {
  message: 'Either message content or media attachment is required',
  path: ['content'],
});

export const noteSchema = z.object({
  contactId: z.string().cuid(),
  content: z.string().min(1, 'Note content is required'),
  isPrivate: z.boolean().default(false),
  mentions: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
