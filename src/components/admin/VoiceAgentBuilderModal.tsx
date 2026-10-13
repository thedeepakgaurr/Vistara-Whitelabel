'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  Sliders,
  FileText,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Plus,
  Play,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { VISTARA_VOICES, type CallingMethod, type DeliverableItem } from '@/lib/vistara';
import { formatDuration } from '@/lib/format';

interface UserOption {
  id: number;
  name: string;
  email: string;
}

export interface AgentData {
  id: number;
  vistara_agent_id: string;
  name: string;
  description: string | null;
  userId?: number | null;
  user_id?: number | null;
  language?: string;
  calling_method?: string;
  voice?: string;
  first_message?: string | null;
  system_instruction?: string | null;
  deliverables?: unknown;
  status?: string;
  is_active?: number | boolean;
}

const TEMPLATES: Record<
  string,
  {
    name: string;
    firstMessage: string;
    systemInstruction: string;
    deliverables: DeliverableItem[];
  }
> = {
  sales_lead: {
    name: 'B2B Sales Lead Qualification',
    firstMessage: 'Hi {{user_name}}, this is Alex from {{company}}. Do you have two minutes to chat about {{service}}?',
    systemInstruction: `# 1. PERSONA & TONE
You are Alex, a consultative sales specialist at {{company}}. You speak in a confident, warm, professional, and natural tone. Speak in short, conversational sentences (1-2 sentences at a time). Never sound like a recorded bot.

# 2. OBJECTIVE
Qualify {{user_name}} to see if they are interested in {{service}} and schedule a 15-minute discovery demo.

# 3. DYNAMIC CONTEXT & VARIABLES
- Prospect: {{user_name}}
- Company: {{company}}
- Primary Offering: {{service}}

# 4. CONVERSATION FLOW
1. Greet {{user_name}} and confirm if it is a convenient moment.
2. Share a 15-second value proposition highlighting how {{service}} saves time and boosts efficiency.
3. Inquire about their current workflow or pain points.
4. If interested, propose a quick 15-minute product walk-through this week.
5. Confirm preferred date and time slot.

# 5. OBJECTION HANDLING
- "I'm busy right now": "Completely understand! Would tomorrow morning or afternoon work better for a brief catch-up?"
- "How much does it cost?": "Pricing scales based on your exact usage. Our team will show you tailored tiers on the demo. Would Tuesday or Thursday work best?"
- "Not interested": "No problem at all! Thanks for your time and have a wonderful day."

# 6. DELIVERABLES
- is_qualified (boolean)
- current_pain_point (text)
- preferred_demo_slot (text)

# 7. GUARDRAILS
- Never make up facts or commit to unauthorized pricing.
- Keep responses under 30 words. Always pause for the prospect to answer.`,
    deliverables: [
      { question: 'Is the lead interested in scheduling a demo?', type: 'boolean', isGoal: true, goalValue: 'true' },
      { question: 'What is their main current challenge?', type: 'text' },
      { question: 'Preferred day and time for demo?', type: 'short' },
    ],
  },
  hindi_real_estate: {
    name: 'Hindi Real Estate Pitch (देवनागरी)',
    firstMessage: 'नमस्ते {{user_name}} जी! मैं प्रिया बात कर रही हूँ {{company}} से। क्या अभी दो मिनट बात करने का सही समय है?',
    systemInstruction: `# 1. PERSONA & TONE
आप प्रिया हैं, {{company}} की तरफ से एक फ्रेंडली और प्रोफेशनल रियल एस्टेट कंसलटेंट। आपकी भाषा नेचुरल और फ्लूएंट हिंग्लिश/हिंदी है। आपकी आवाज़ में अपनापन और रिस्पेक्ट होना चाहिए।

# 2. OBJECTIVE
{{user_name}} को हमारे नए प्रीमियम प्रोजेक्ट के बारे में बताना और वीकेंड साइट विज़िट के लिए उनका इंटरेस्ट जानना।

# 3. CONTEXT & VARIABLES
- Customer: {{user_name}}
- Company: {{company}}
- Location: {{location}}

# 4. CONVERSATION FLOW (DEVANAGARI SCRIPT)
1. नमस्ते {{user_name}} जी! मैं {{company}} से बोल रही हूँ। आशा है आप अच्छे होंगे।
2. हमारे नए गेटेड कम्युनिटी प्रोजेक्ट के लॉन्च के सिलसिले में मैंने कॉल किया था। क्या आप अभी किसी इन्वेस्टमेंट या नए घर की तलाश में हैं?
3. अगर कस्टमर हाँ बोलें: तो 2BHK और 3BHK के ऑप्शन्स और वर्ल्ड-क्लास क्लबहाउस के बारे में संक्षेप में बताएं।
4. वीकेंड पर फ्री पिकअप और साइट विज़िट का न्योता दें।

# 5. OBJECTION HANDLING
- "अभी बिजी हूँ": "कोई बात नहीं सर, मैं आपको व्हाट्सएप पर ब्रोशर शेयर कर देती हूँ और कल दोपहर में कॉल करूँगी।"
- "प्राइस क्या है?": "स्टार्टिंग प्राइस 65 लाख से है और आसान ईएमआई प्लान्स भी उपलब्ध हैं।"

# 6. DELIVERABLES
- interested (boolean)
- bhk_preference (fixed, options: "2BHK, 3BHK, Villa")
- site_visit_date (short)`,
    deliverables: [
      { question: 'Customer interested in project?', type: 'boolean', isGoal: true, goalValue: 'true' },
      { question: 'Preferred BHK unit', type: 'fixed', options: '2BHK, 3BHK, Villa' },
      { question: 'Site visit preferred date', type: 'short' },
    ],
  },
  appointment_booking: {
    name: 'Healthcare / Service Appointment Booking',
    firstMessage: 'Hello {{user_name}}, this is Sarah from {{clinic_name}}. I am calling regarding your consultation with Dr. {{doctor_name}}.',
    systemInstruction: `# 1. PERSONA & TONE
You are Sarah, patient care coordinator at {{clinic_name}}. You are warm, empathetic, respectful, and organized.

# 2. OBJECTIVE
Confirm or schedule a consultation slot for {{user_name}} with Dr. {{doctor_name}}.

# 3. CONTEXT & VARIABLES
- Patient: {{user_name}}
- Clinic: {{clinic_name}}
- Doctor: {{doctor_name}}

# 4. CONVERSATION FLOW
1. Greet {{user_name}} warmly and explain the purpose of your call.
2. Inquire if they wish to book an in-clinic visit or a tele-consultation.
3. Offer two specific slots (e.g., Tomorrow at 11:30 AM or Thursday at 4:00 PM).
4. Verify any current symptoms or notes for the doctor.
5. Confirm appointment details and thank them.

# 5. DELIVERABLES
- booking_status (fixed, options: "confirmed, rescheduled, cancelled")
- slot_confirmed (short)
- symptoms_notes (text)`,
    deliverables: [
      { question: 'Booking status', type: 'fixed', options: 'confirmed, rescheduled, cancelled', isGoal: true, goalValue: 'confirmed' },
      { question: 'Confirmed time slot', type: 'short' },
      { question: 'Patient notes or symptoms', type: 'text' },
    ],
  },
  payment_reminder: {
    name: 'Payment & Invoice Reminder (Polite)',
    firstMessage: 'Hi {{user_name}}, this is Priya calling from the finance team at {{company}}. Hope you are having a productive day.',
    systemInstruction: `# 1. PERSONA & TONE
You are Priya from {{company}} accounts team. You are calm, courteous, professional, and understanding. Never sound accusatory or aggressive.

# 2. OBJECTIVE
Confirm receipt and payment timeline for invoice #{{invoice_number}} totaling ₹{{due_amount}} which was due on {{due_date}}.

# 3. CONVERSATION FLOW
1. Verify you are speaking with {{user_name}}.
2. Politely inform them about invoice #{{invoice_number}} of ₹{{due_amount}}.
3. Check if they have already initiated the transfer or require the payment link/invoice re-sent.
4. Inquire when we can anticipate the payment completion.
5. Thank them politely.

# 4. DELIVERABLES
- payment_status (fixed, options: "already_paid, will_pay_today, promised_later, dispute")
- promised_payment_date (short)`,
    deliverables: [
      { question: 'Payment status', type: 'fixed', options: 'already_paid, will_pay_today, promised_later, dispute' },
      { question: 'Promised payment date', type: 'short' },
    ],
  },
  customer_csat: {
    name: 'CSAT & Customer Feedback Survey',
    firstMessage: 'Hi {{user_name}}, this is Alex from {{company}} Customer Support. I hope you are doing well today!',
    systemInstruction: `# 1. PERSONA & TONE
You are Alex from {{company}}. You are energetic, grateful, and attentive.

# 2. OBJECTIVE
Gather quick 60-second feedback on {{user_name}}'s recent support experience.

# 3. CONVERSATION FLOW
1. Ask how satisfied they were with their experience on a scale of 1 to 5.
2. Ask what went well.
3. Inquire if there is one aspect we could improve.
4. Express sincere gratitude and close the call.

# 4. DELIVERABLES
- rating_score (number)
- primary_feedback (text)
- would_recommend (boolean)`,
    deliverables: [
      { question: 'Satisfaction rating (1 to 5)', type: 'number', isGoal: true, goalValue: '5' },
      { question: 'Primary feedback notes', type: 'text' },
      { question: 'Would customer recommend us?', type: 'boolean' },
    ],
  },
};

const LANGUAGES = [
  'English',
  'Hindi',
  'Hinglish',
  'Marathi',
  'Tamil',
  'Telugu',
  'Gujarati',
  'Bengali',
  'Kannada',
  'Punjabi',
  'Malayalam',
  'Spanish',
  'French',
  'German',
  'Arabic',
];

interface Props {
  users: UserOption[];
  agent?: AgentData;
  trigger?: React.ReactNode;
}

export function VoiceAgentBuilderModal({ users, agent, trigger }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(agent);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'persona' | 'prompt' | 'deliverables' | 'test'>('persona');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [userId, setUserId] = useState(agent?.user_id || agent?.userId ? String(agent?.user_id || agent?.userId) : '');
  const [language, setLanguage] = useState(agent?.language || 'English');
  const [callingMethod, setCallingMethod] = useState<CallingMethod>(
    (agent?.calling_method as CallingMethod) || 'traditional'
  );
  const [voice, setVoice] = useState(agent?.voice || (callingMethod === 'gemini_live' ? 'Aoede' : 'meera'));
  const [status, setStatus] = useState<'active' | 'paused'>((agent?.status as 'active' | 'paused') || 'active');
  const [isActive, setIsActive] = useState<boolean>(agent?.is_active !== undefined ? Boolean(agent.is_active) : true);

  const [firstMessage, setFirstMessage] = useState(agent?.first_message || '');
  const [systemInstruction, setSystemInstruction] = useState(agent?.system_instruction || '');

  // Parse deliverables
  let initialDeliverables: DeliverableItem[] = [];
  try {
    if (typeof agent?.deliverables === 'string') {
      initialDeliverables = JSON.parse(agent.deliverables);
    } else if (Array.isArray(agent?.deliverables)) {
      initialDeliverables = agent.deliverables as DeliverableItem[];
    }
  } catch {
    initialDeliverables = [];
  }
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(initialDeliverables);

  // Test call state
  const [testPhone, setTestPhone] = useState('');
  const [testCallerName, setTestCallerName] = useState('John Doe');
  const [testCalling, setTestCalling] = useState(false);
  const [testCallId, setTestCallId] = useState<string | null>(null);
  const [testCallRecord, setTestCallRecord] = useState<{
    status: string;
    duration: number;
    transcript: string | null;
    summary: string | null;
    answers: Record<string, unknown> | null;
    sentiment: string | null;
    recording_url: string | null;
  } | null>(null);

  // Reset voice when callingMethod changes
  function handleCallingMethodChange(newMethod: CallingMethod) {
    setCallingMethod(newMethod);
    const validVoices = VISTARA_VOICES[newMethod].map((v) => v.id);
    if (!validVoices.includes(voice)) {
      setVoice(newMethod === 'gemini_live' ? 'Aoede' : 'meera');
    }
  }

  // Load a prompt template
  function applyTemplate(templateKey: string) {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    setFirstMessage(t.firstMessage);
    setSystemInstruction(t.systemInstruction);
    setDeliverables(t.deliverables);
    toast.info(`Loaded "${t.name}" template`);
  }

  // Deliverables manipulation
  function addDeliverable() {
    setDeliverables([
      ...deliverables,
      { question: 'New Question or Data to Extract', type: 'text', description: '' },
    ]);
  }

  function removeDeliverable(index: number) {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  }

  function updateDeliverable(index: number, patch: Partial<DeliverableItem>) {
    setDeliverables(
      deliverables.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  // Submit Handler
  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name,
        description: description || null,
        userId: userId ? Number(userId) : null,
        language,
        calling_method: callingMethod,
        voice,
        first_message: firstMessage || undefined,
        system_instruction: systemInstruction || undefined,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        status,
        ...(isEdit ? { isActive } : {}),
      };

      const url = isEdit ? `/api/admin/agents/${agent!.id}` : '/api/admin/agents';
      const method = isEdit ? 'PATCH' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to save voice agent');
        return;
      }

      toast.success(isEdit ? 'Voice agent updated successfully' : 'Voice agent built and published!');
      router.refresh();
      if (!isEdit && data.id) {
        // Switch to test call tab
        setActiveTab('test');
      } else {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Test Call Trigger
  async function triggerTestCall() {
    if (!testPhone.trim()) {
      toast.error('Enter a valid phone number (+91...)');
      return;
    }
    const agentIdToCall = agent?.id;
    if (!agentIdToCall) {
      toast.error('Please save the agent first to initiate a test call');
      return;
    }

    setTestCalling(true);
    setTestCallRecord({
      status: 'initiating',
      duration: 0,
      transcript: null,
      summary: null,
      answers: null,
      sentiment: null,
      recording_url: null,
    });

    try {
      const resp = await fetch(`/api/admin/agents/${agentIdToCall}/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone.trim(),
          name: testCallerName.trim(),
          metadata: { test_user: true },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to trigger test call');
        setTestCalling(false);
        return;
      }

      setTestCallId(String(data.callId || data.vistaraCallId));
      toast.success('Test call placed! Ringing your phone...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger test call');
      setTestCalling(false);
    }
  }

  // Polling for test call status
  useEffect(() => {
    if (!testCallId || !testCalling) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/calls/${testCallId}/poll`);
        if (!resp.ok) return;
        const res = await resp.json();
        if (res.call) {
          const c = res.call;
          setTestCallRecord({
            status: c.status,
            duration: c.duration || 0,
            transcript: c.transcript,
            summary: c.summary,
            answers: typeof c.answers === 'string' ? JSON.parse(c.answers) : c.answers,
            sentiment: c.sentiment,
            recording_url: c.recording_url,
          });

          if (['completed', 'failed', 'busy', 'no-answer'].includes(c.status)) {
            setTestCalling(false);
            clearInterval(interval);
            toast.info(`Test call finished with status: ${c.status}`);
          }
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [testCallId, testCalling, toast]);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : isEdit ? (
        <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
          <Sliders className="size-3 mr-1" />
          Edit & Test
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 shadow-sm">
          <Sparkles className="size-3.5 text-amber-300" />
          Voice Agent Builder
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            <span>{isEdit ? `Edit Agent: ${agent?.name}` : 'Voice Agent Builder'}</span>
          </div>
        }
        className="max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-border mb-4 gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('persona')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === 'persona'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="size-3.5" />
            1. Persona & Voice
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === 'prompt'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="size-3.5" />
            2. Prompt & First Message
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliverables')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === 'deliverables'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            3. Deliverables ({deliverables.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === 'test'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PhoneCall className="size-3.5" />
            4. Live Test Call Console
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: PERSONA & VOICE */}
          {activeTab === 'persona' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya — Real Estate Advisor"
                  />
                </div>

                <div>
                  <Label htmlFor="agent-user">Assign to User</Label>
                  <Select id="agent-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
                    <option value="">Unassigned (Admin only)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="agent-desc">Description</Label>
                <Input
                  id="agent-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Internal summary of this voice agent's role"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                <div>
                  <Label htmlFor="calling-method">Voice Engine / Calling Method</Label>
                  <Select
                    id="calling-method"
                    value={callingMethod}
                    onChange={(e) => handleCallingMethodChange(e.target.value as CallingMethod)}
                  >
                    <option value="traditional">Traditional (Meera, Nisha, Siya, Rohan, Dev, Vikram)</option>
                    <option value="gemini_live">Gemini Live Ultra-low Latency (Aoede, Kore, Puck, etc.)</option>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Traditional gives reliable telephony accents. Gemini Live delivers ultra-responsive conversational flow.
                  </p>
                </div>

                <div>
                  <Label htmlFor="language">Primary Language</Label>
                  <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Native Indian languages & English are optimized for real-time speech.
                  </p>
                </div>
              </div>

              {/* Voice Catalog Selector */}
              <div>
                <Label>Voice Persona Selection</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {VISTARA_VOICES[callingMethod].map((v) => {
                    const isSelected = voice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`cursor-pointer rounded-lg border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-soft/50 ring-1 ring-primary'
                            : 'border-border bg-surface hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground">{v.label.split(' ')[0]}</span>
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {v.gender}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground truncate">{v.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-3 border-t border-border">
                <div>
                  <Label htmlFor="status">Agent Status</Label>
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
                    className="w-36"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </Select>
                </div>

                {isEdit && (
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4 rounded border-border text-primary focus:ring-primary/30"
                    />
                    Available in Client Dashboard
                  </label>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROMPT & FIRST MESSAGE */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              {/* Template Preset Selector */}
              <div className="flex items-center justify-between bg-surface-hover/50 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Load 10-Section Architecture Template:</span>
                </div>
                <Select
                  className="w-64 text-xs h-8"
                  onChange={(e) => {
                    if (e.target.value) applyTemplate(e.target.value);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a battle-tested template...
                  </option>
                  {Object.entries(TEMPLATES).map(([k, t]) => (
                    <option key={k} value={k}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* First Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="first-message">First Spoken Message (Greeting)</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Must prompt an immediate response from the caller
                  </span>
                </div>
                <Textarea
                  id="first-message"
                  required
                  rows={2}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="e.g. Hello {{user_name}}, this is Maya from {{company}}. Do you have a quick moment?"
                />
              </div>

              {/* Dynamic Variables helper */}
              <div className="rounded-lg border border-border bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Dynamic Variables Available in Campaign / CRM:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['{{user_name}}', '{{company}}', '{{service}}', '{{location}}', '{{date}}', '{{amount}}'].map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(v);
                          toast.info(`Copied ${v}`);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-mono text-foreground hover:bg-primary-soft hover:text-primary transition-colors border border-border"
                      >
                        <Copy className="size-2.5" />
                        {v}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* System Instruction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="system-instruction">System Instruction (10-Section Architecture)</Label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {systemInstruction.length} chars
                  </span>
                </div>
                <Textarea
                  id="system-instruction"
                  required
                  rows={12}
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  placeholder={`# 1. PERSONA & TONE\nYou are Alex...\n\n# 2. OBJECTIVE\nQualify lead for...\n\n# 3. CONVERSATION FLOW\n1. Greet customer...\n\n# 4. OBJECTION HANDLING\n- If busy: ...\n\n# 5. GUARDRAILS\n- Keep answers concise...`}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERABLES */}
          {activeTab === 'deliverables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Visual Deliverable Data Extractor</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Structured fields the AI extracts automatically during the voice call for CRM integration.
                  </p>
                </div>
                <Button type="button" size="xs" variant="outline" onClick={addDeliverable}>
                  <Plus className="size-3 mr-1" />
                  Add Deliverable
                </Button>
              </div>

              <div className="space-y-3">
                {deliverables.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground font-medium">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeDeliverable(idx)}
                        className="text-muted-foreground hover:text-danger p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Label className="text-[11px]">Field / Question to Extract</Label>
                        <Input
                          value={item.question}
                          onChange={(e) => updateDeliverable(idx, { question: e.target.value })}
                          placeholder="e.g. Is the client interested in a callback?"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px]">Data Type</Label>
                        <Select
                          value={item.type}
                          onChange={(e) =>
                            updateDeliverable(idx, {
                              type: e.target.value as DeliverableItem['type'],
                            })
                          }
                          className="h-8 text-xs"
                        >
                          <option value="text">Text (Detailed summary)</option>
                          <option value="short">Short (1-3 words)</option>
                          <option value="boolean">Boolean (true / false)</option>
                          <option value="number">Number</option>
                          <option value="fixed">Fixed Options</option>
                        </Select>
                      </div>
                    </div>

                    {item.type === 'fixed' && (
                      <div>
                        <Label className="text-[11px]">Allowed Options (Comma-separated)</Label>
                        <Input
                          value={item.options || ''}
                          onChange={(e) => updateDeliverable(idx, { options: e.target.value })}
                          placeholder="e.g. High, Medium, Low"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isGoal)}
                          onChange={(e) => updateDeliverable(idx, { isGoal: e.target.checked })}
                          className="size-3.5 rounded border-border text-primary"
                        />
                        Primary Call Goal
                      </label>

                      {item.isGoal && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground text-[11px]">Goal Value:</span>
                          <Input
                            value={item.goalValue || ''}
                            onChange={(e) => updateDeliverable(idx, { goalValue: e.target.value })}
                            placeholder="e.g. true or confirmed"
                            className="h-6 w-28 text-xs px-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {deliverables.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No deliverables defined yet. Add deliverables above or load a template from the Prompt tab.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE TEST CALL CONSOLE */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-hover/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="size-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground">Interactive Test Call Dispatch</span>
                  </div>
                  <Badge tone="success">x-call-type: test (24/7 Enabled)</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Places an instant call using Vistara AI test concurrency. You can verify latency, pronunciation, and
                  extract deliverables in real-time.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="test-phone">Phone Number (+91 format)</Label>
                    <Input
                      id="test-phone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="h-9 font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-name">Caller Name</Label>
                    <Input
                      id="test-name"
                      value={testCallerName}
                      onChange={(e) => setTestCallerName(e.target.value)}
                      placeholder="e.g. Deepak"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={triggerTestCall}
                    disabled={testCalling || !isEdit}
                    loading={testCalling}
                  >
                    <Play className="size-3.5 mr-1" />
                    {testCalling ? 'Call In-Progress...' : 'Place Test Call Now'}
                  </Button>
                </div>
                {!isEdit && (
                  <p className="text-[11px] text-amber-500">
                    * Please save and publish your agent once before placing a live test call.
                  </p>
                )}
              </div>

              {/* Real-time Call Tracker Drawer */}
              {testCallRecord && (
                <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">Live Call Monitor</span>
                      <Badge
                        tone={
                          testCallRecord.status === 'completed'
                            ? 'success'
                            : testCallRecord.status === 'failed'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {testCallRecord.status}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      Duration: {formatDuration(testCallRecord.duration)}
                    </span>
                  </div>

                  {testCallRecord.sentiment && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Sentiment:</span>
                      <span className="font-medium text-foreground capitalize">{testCallRecord.sentiment}</span>
                    </div>
                  )}

                  {testCallRecord.summary && (
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Call Summary:</span>
                      <p className="text-xs text-foreground bg-surface-hover p-2.5 rounded border border-border">
                        {testCallRecord.summary}
                      </p>
                    </div>
                  )}

                  {testCallRecord.transcript && (
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Transcript:</span>
                      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-black/[0.03] dark:bg-white/[0.03] p-2.5 font-mono text-[11px] text-foreground border border-border">
                        {testCallRecord.transcript}
                      </div>
                    </div>
                  )}

                  {testCallRecord.answers && Object.keys(testCallRecord.answers).length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Extracted Deliverables:
                      </span>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {Object.entries(testCallRecord.answers).map(([k, v]) => (
                          <div key={k} className="rounded bg-surface-hover p-2 border border-border text-xs">
                            <span className="text-muted-foreground font-medium block text-[10px]">{k}</span>
                            <span className="font-semibold text-foreground">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {activeTab !== 'test' && (
                <Button type="submit" size="sm" loading={loading}>
                  <Check className="size-3.5 mr-1" />
                  {isEdit ? 'Save Agent Changes' : 'Publish & Build Agent'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
