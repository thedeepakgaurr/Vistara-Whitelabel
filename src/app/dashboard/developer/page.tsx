import { getCurrentUser } from '@/lib/auth';
import { pool } from '@/lib/db';
import { DeveloperPortalView, type ApiCampaignOption, type AgentOption } from '@/components/developer/DeveloperPortalView';

export default async function DeveloperPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const appUrl = process.env.APP_URL || 'http://localhost:4000';

  // Fetch user's campaigns
  const [campaignRows] = await pool.query(
    `SELECT id, name, type, agent_id, webhook_url, status
     FROM campaigns
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user.id]
  );

  // Fetch available agents for user
  const [agentRows] = await pool.query(
    `SELECT id, name
     FROM agents
     WHERE (user_id = ? OR user_id IS NULL) AND (status = 'active' OR (status IS NULL AND is_active = 1))
     ORDER BY name ASC`,
    [user.id]
  );

  return (
    <DeveloperPortalView
      apiKey={user.api_key}
      appUrl={appUrl}
      campaigns={campaignRows as ApiCampaignOption[]}
      agents={agentRows as AgentOption[]}
      isAdmin={false}
    />
  );
}
