import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bot, Mic, Sparkles } from 'lucide-react';
import type { AgentRow } from '@/types';

export default async function DashboardAgentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows] = await pool.query('SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  const agents = rows as AgentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Voice Agents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Voice agents configured for your account to handle outbound campaigns and ad-hoc calls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Card key={a.id} className="p-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Bot className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm text-foreground">{a.name}</p>
                    <span className="font-mono text-[10px] text-muted-foreground">ID #{a.id}</span>
                  </div>
                </div>
                <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status === 'paused' ? 'Paused' : 'Active'}</Badge>
              </div>

              {a.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{a.description}</p>}

              {a.first_message && (
                <div className="mt-3 rounded-md bg-surface-hover/70 p-2 text-[11px] text-muted-foreground italic border border-border/50 line-clamp-2">
                  &ldquo;{a.first_message}&rdquo;
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mic className="size-3 text-primary" />
                <span className="capitalize font-medium text-foreground">{a.voice || 'Meera'}</span>
                <span>•</span>
                <span>{a.language || 'English'}</span>
              </div>
            </div>
          </Card>
        ))}

        {agents.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardBody className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Sparkles className="size-8 text-muted-foreground/60" />
                <p>No voice agents assigned to your account yet.</p>
                <p className="text-xs">Contact your administrator to have an agent allocated to you.</p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
