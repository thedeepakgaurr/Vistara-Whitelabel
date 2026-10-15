'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Sliders,
  FileText,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { CopyableAgentId } from '@/components/admin/CopyableAgentId';
import { VISTARA_VOICES, type CallingMethod, type DeliverableItem } from '@/lib/vistara';
import { formatDuration } from '@/lib/format';

export interface UserOption {
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
- Project: {{project_name}}
- Location: {{location}}

# 4. CONVERSATION FLOW
1. आदरपूर्वक नमस्कार करें और उनका हालचाल पूछें।
2. बताएं कि {{location}} में हमारे नए गेटेड कम्युनिटी प्रोजेक्ट पर एक्सक्लूसिव प्री-लॉन्च ऑफर्स चल रहे हैं।
3. पूछें कि क्या वे अभी इन्वेस्टमेंट या खुद रहने के लिए कोई प्रॉपर्टी देख रहे हैं।
4. इस शनिवार या रविवार को फ्री साइट विज़िट और पिक-एंड-ड्रॉप के लिए इनवाइट करें।
5. समय तय करें और धन्यवाद दें।

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
Politely remind {{user_name}} about invoice #{{invoice_number}} totaling {{amount}} due on {{due_date}}, and verify payment status.

# 3. CONTEXT & VARIABLES
- Customer: {{user_name}}
- Invoice Number: {{invoice_number}}
- Amount: {{amount}}
- Due Date: {{due_date}}

# 4. CONVERSATION FLOW
1. Greet courteously and identify yourself and company.
2. Politely inform them about invoice #{{invoice_number}} of {{amount}}.
3. Ask if they have already initiated the transfer or need the payment link resent over WhatsApp/Email.
4. Note down their expected payment date if delayed.
5. Thank them for their partnership.

# 5. DELIVERABLES
- payment_status (fixed, options: "already_paid, will_pay_today, promised_later, dispute")
- promised_date (short)
- notes (text)`,
    deliverables: [
      { question: 'Payment status', type: 'fixed', options: 'already_paid, will_pay_today, promised_later, dispute', isGoal: true, goalValue: 'will_pay_today' },
      { question: 'Promised payment date', type: 'short' },
      { question: 'Customer feedback or dispute notes', type: 'text' },
    ],
  },
  feedback_survey: {
    name: 'Customer Satisfaction (CSAT) Survey',
    firstMessage: 'Hi {{user_name}}! This is Kabir calling on behalf of {{company}}. We noticed you recently completed your order with us.',
    systemInstruction: `# 1. PERSONA & TONE
You are Kabir, customer experience specialist at {{company}}. You are upbeat, friendly, polite, and attentive.

# 2. OBJECTIVE
Collect a 1-minute feedback rating on their recent experience to help our team improve.

# 3. CONVERSATION FLOW
1. Greet {{user_name}} and ask for 45 seconds of their time.
2. Ask: "On a scale of 1 to 5, how satisfied were you with your overall experience?"
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

interface VoiceAgentFormProps {
  users: UserOption[];
  agent?: AgentData;
}

export function VoiceAgentForm({ users, agent }: VoiceAgentFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(agent);

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

  function handleCallingMethodChange(newMethod: CallingMethod) {
    setCallingMethod(newMethod);
    const validVoices = VISTARA_VOICES[newMethod].map((v) => v.id);
    if (!validVoices.includes(voice)) {
      setVoice(newMethod === 'gemini_live' ? 'Aoede' : 'meera');
    }
  }

  function applyTemplate(templateKey: string) {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    setFirstMessage(t.firstMessage);
    setSystemInstruction(t.systemInstruction);
    setDeliverables(t.deliverables);
    toast.info(`Loaded "${t.name}" template`);
  }

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
        // Redirect to edit page with test tab active
        router.push(`/admin/agents/${data.id}?tab=test`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function triggerTestCall() {
    if (!testPhone.trim()) {
      toast.error('Enter a valid phone number (+91...)');
      return;
    }
    const agentIdToCall = agent?.id;
    if (!agentIdToCall) {
      toast.error('Please save and publish the agent first before placing a test call');
      return;
    }

    setTestCalling(true);
    setTestCallRecord(null);

    try {
      const resp = await fetch(`/api/admin/agents/${agentIdToCall}/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone.trim(),
          name: testCallerName || 'Test Lead',
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to trigger test call');
        setTestCalling(false);
        return;
      }

      setTestCallId(String(data.callId || data.vistaraCallId));
      toast.success('Test call placed! Ringing phone...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger test call');
      setTestCalling(false);
    }
  }

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
            toast.info(`Test call finished: ${c.status}`);
          }
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [testCallId, testCalling, toast]);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <Link
            href="/admin/agents"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Voice Agents
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? `Edit Agent: ${agent?.name}` : 'Create Voice Agent'}
            </h1>
            {isEdit && (
              <Badge tone={isActive ? 'success' : 'neutral'} className="capitalize">
                {status}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'Configure persona instructions, speech engine, deliverables, and test live calls.'
                : 'Build, configure, and publish an AI voice agent ready for outbound campaigns.'}
            </p>
            {isEdit && agent?.vistara_agent_id && (
              <CopyableAgentId id={agent.vistara_agent_id} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/agents">
            <Button variant="outline" size="sm" type="button">
              Discard
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => onSubmit()}
            loading={loading}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Save className="size-3.5" />
            {isEdit ? 'Save Changes' : 'Publish & Create Agent'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger border border-danger/20">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('persona')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors ${
            activeTab === 'persona'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="size-4" />
          1. Persona & Voice
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors ${
            activeTab === 'prompt'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="size-4" />
          2. Prompt & First Message
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deliverables')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors ${
            activeTab === 'deliverables'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="size-4" />
          3. Deliverables ({deliverables.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px transition-colors ${
            activeTab === 'test'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PhoneCall className="size-4" />
          4. Live Test Call Console
          {testCalling && (
            <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Content Form Body */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* TAB 1: PERSONA & VOICE */}
        {activeTab === 'persona' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="agent-name">Agent Name *</Label>
                    <Input
                      id="agent-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maya — Real Estate Advisor"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="agent-user">Assign to Client Account</Label>
                    <Select
                      id="agent-user"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="mt-1"
                    >
                      <option value="">Unassigned (Platform Admin only)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="agent-desc">Internal Description (optional)</Label>
                  <Textarea
                    id="agent-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of this voice agent's role and campaign goals"
                    className="mt-1"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voice Engine & Language</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="calling-method">Voice Engine / Calling Method</Label>
                    <Select
                      id="calling-method"
                      value={callingMethod}
                      onChange={(e) => handleCallingMethodChange(e.target.value as CallingMethod)}
                      className="mt-1"
                    >
                      <option value="traditional">Traditional Telephony Engine (Stable, Indic Accents)</option>
                      <option value="gemini_live">Gemini Live Native Audio (Real-time Interruptions)</option>
                    </Select>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {callingMethod === 'traditional'
                        ? 'Optimized for high-throughput telephonic reliability with authentic Indian English and Hindi pronunciations.'
                        : 'Ultra-low latency conversational audio streaming directly with Gemini Multimodal Live.'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="agent-lang">Primary Language</Label>
                    <Select
                      id="agent-lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="mt-1"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </Select>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Agent will adapt its dialect and vocabulary to match your chosen primary language.
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Voice Persona Selection</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {VISTARA_VOICES[callingMethod].map((v) => {
                      const isSelected = voice === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setVoice(v.id)}
                          className={`cursor-pointer rounded-lg border p-3 text-left transition-all relative ${
                            isSelected
                              ? 'border-primary bg-primary-soft/40 ring-2 ring-primary/60'
                              : 'border-border bg-surface hover:bg-surface-hover/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">{v.label.split(' ')[0]}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">
                              {v.gender}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground truncate">{v.label}</p>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="size-3.5 text-primary" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="status">Agent Status</Label>
                    <Select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'paused')}
                      className="mt-1 w-36"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </Select>
                  </div>

                  {isEdit && (
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id="is-active"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary size-4"
                      />
                      <label htmlFor="is-active" className="text-xs text-foreground font-medium cursor-pointer">
                        Enabled for Outbound Campaigns
                      </label>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB 2: PROMPT & FIRST MESSAGE */}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Prompt Configuration</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define how your agent greets the customer and conducts the conversation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onChange={(e) => applyTemplate(e.target.value)}
                    defaultValue=""
                    className="h-8 text-xs w-56"
                  >
                    <option value="" disabled>
                      Load a Pre-built Template...
                    </option>
                    {Object.entries(TEMPLATES).map(([k, t]) => (
                      <option key={k} value={k}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardHeader>

              <CardBody className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="first-msg">First Greeting Message *</Label>
                    <span className="text-[11px] text-muted-foreground">Spoken immediately on answer</span>
                  </div>
                  <Input
                    id="first-msg"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="Hello {{user_name}}, this is Sarah calling from {{company}}..."
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Supported dynamic variables: <code className="bg-surface-hover px-1 rounded">{'{{user_name}}'}</code>,{' '}
                    <code className="bg-surface-hover px-1 rounded">{'{{company}}'}</code>,{' '}
                    <code className="bg-surface-hover px-1 rounded">{'{{service}}'}</code>,{' '}
                    <code className="bg-surface-hover px-1 rounded">{'{{amount}}'}</code>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <Label htmlFor="sys-prompt">System Instruction & Persona Prompt *</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Structured markdown detailing persona, conversation flow, objection handling, and guardrails.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => applyTemplate('sales_lead')}
                      className="gap-1"
                    >
                      <Sparkles className="size-3 text-amber-400" />
                      Sales Lead Template
                    </Button>
                  </div>

                  <Textarea
                    id="sys-prompt"
                    rows={18}
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    placeholder={`# 1. PERSONA & TONE\nYou are Alex, an expert representative...\n\n# 2. OBJECTIVE\nQualify the prospect and schedule a follow-up demo.\n\n# 3. CONVERSATION FLOW\n1. Confirm if convenient\n2. Share value proposition\n3. Inquire about needs\n\n# 4. GUARDRAILS\n- Keep answers concise (1-2 sentences).`}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB 3: DELIVERABLES */}
        {activeTab === 'deliverables' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Conversation Deliverables & Goals</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Structured questions automatically evaluated and extracted from the call transcript.
                  </p>
                </div>
                <Button type="button" size="xs" onClick={addDeliverable} className="gap-1">
                  <Plus className="size-3" />
                  Add Deliverable
                </Button>
              </CardHeader>

              <CardBody className="space-y-4">
                {deliverables.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <CheckCircle2 className="size-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-foreground">No deliverables configured yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Deliverables allow your AI agent to extract specific outcomes like demo interest, appointment
                      dates, or customer answers.
                    </p>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={addDeliverable}
                      className="mt-3 gap-1"
                    >
                      <Plus className="size-3" />
                      Add your first deliverable
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliverables.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-surface p-4 space-y-3 relative hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-xs text-muted-foreground font-semibold">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDeliverable(idx)}
                            className="text-muted-foreground hover:text-danger transition-colors p-1"
                            title="Remove deliverable"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <Label className="text-xs">Question / Extraction Target</Label>
                            <Input
                              value={item.question}
                              onChange={(e) => updateDeliverable(idx, { question: e.target.value })}
                              placeholder="e.g. Is the customer interested in a site visit?"
                              className="mt-1 text-xs"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Data Type</Label>
                            <Select
                              value={item.type}
                              onChange={(e) =>
                                updateDeliverable(idx, {
                                  type: e.target.value as DeliverableItem['type'],
                                })
                              }
                              className="mt-1 text-xs"
                            >
                              <option value="boolean">Boolean (Yes / No)</option>
                              <option value="short">Short text</option>
                              <option value="number">Number</option>
                              <option value="fixed">Fixed Options</option>
                              <option value="text">Long text</option>
                            </Select>
                          </div>
                        </div>

                        {item.type === 'fixed' && (
                          <div>
                            <Label className="text-xs">Comma-separated options</Label>
                            <Input
                              value={item.options || ''}
                              onChange={(e) => updateDeliverable(idx, { options: e.target.value })}
                              placeholder="e.g. 2BHK, 3BHK, Villa"
                              className="mt-1 text-xs"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t border-border/60">
                          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.isGoal)}
                              onChange={(e) => updateDeliverable(idx, { isGoal: e.target.checked })}
                              className="rounded border-border text-primary focus:ring-primary size-3.5"
                            />
                            <span>Count as primary campaign goal</span>
                          </label>

                          {item.isGoal && item.type === 'boolean' && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground">Goal Value:</span>
                              <Select
                                value={item.goalValue || 'true'}
                                onChange={(e) => updateDeliverable(idx, { goalValue: e.target.value })}
                                className="h-7 text-xs w-24"
                              >
                                <option value="true">True (Yes)</option>
                                <option value="false">False (No)</option>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB 4: LIVE TEST CALL CONSOLE */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="size-5 text-emerald-500" />
                    <CardTitle>Interactive Live Test Call Dispatch</CardTitle>
                  </div>
                  <Badge tone="success">Test Concurrency Ready</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dial an instant test call to your personal phone to experience audio latency, pronunciation, and
                  conversation flow in real time.
                </p>
              </CardHeader>

              <CardBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="test-phone">Phone Number (+91 format) *</Label>
                    <Input
                      id="test-phone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-name">Caller Name</Label>
                    <Input
                      id="test-name"
                      value={testCallerName}
                      onChange={(e) => setTestCallerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    onClick={triggerTestCall}
                    loading={testCalling}
                    disabled={!isEdit && !agent?.id}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <PhoneCall className="size-4" />
                    {testCalling ? 'Calling phone now...' : 'Dispatch Live Test Call'}
                  </Button>

                  {!isEdit && !agent?.id && (
                    <span className="text-xs text-amber-500 font-medium">
                      * Please click &quot;Publish & Create Agent&quot; once before placing test calls.
                    </span>
                  )}
                </div>

                {/* Real-time Call Tracker */}
                {testCallRecord && (
                  <div className="mt-4 rounded-lg border border-border bg-surface-hover/30 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Call Session Monitor</span>
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

                    {testCallRecord.recording_url && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Call Audio Recording:
                        </span>
                        <audio
                          controls
                          src={testCallRecord.recording_url}
                          className="w-full h-8 rounded"
                        />
                      </div>
                    )}

                    {testCallRecord.sentiment && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Customer Sentiment:</span>
                        <span className="font-medium text-foreground capitalize">
                          {testCallRecord.sentiment}
                        </span>
                      </div>
                    )}

                    {testCallRecord.summary && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                          AI Executive Summary:
                        </span>
                        <p className="text-xs text-foreground bg-surface p-3 rounded border border-border leading-relaxed">
                          {testCallRecord.summary}
                        </p>
                      </div>
                    )}

                    {testCallRecord.transcript && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                          Verbatim Transcript:
                        </span>
                        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-black/[0.03] dark:bg-white/[0.03] p-3 font-mono text-[11px] text-foreground border border-border leading-relaxed">
                          {testCallRecord.transcript}
                        </div>
                      </div>
                    )}

                    {testCallRecord.answers && Object.keys(testCallRecord.answers).length > 0 && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Extracted Deliverables:
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(testCallRecord.answers).map(([k, v]) => (
                            <div key={k} className="rounded bg-surface p-2.5 border border-border text-xs">
                              <span className="text-muted-foreground font-medium block text-[10px]">{k}</span>
                              <span className="font-semibold text-foreground">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Link href="/admin/agents">
            <Button type="button" variant="outline" size="sm">
              Back to Agents
            </Button>
          </Link>

          <Button
            type="submit"
            size="sm"
            loading={loading}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Check className="size-3.5" />
            {isEdit ? 'Save Agent Changes' : 'Publish & Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
}
