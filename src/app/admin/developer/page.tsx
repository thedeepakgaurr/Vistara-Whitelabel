import { requireAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
import { DeveloperPortalView, type ApiCampaignOption, type AgentOption } from '@/components/developer/DeveloperPortalView';

export default async function AdminDeveloperPage() {
  const admin = await requireAdmin();

  const appUrl = process.env.APP_URL || 'http://localhost:4000';

  // Fetch campaigns for admin inspection/testing
  const [campaignRows] = await pool.query(
    `SELECT id, name, type, agent_id, webhook_url, status
     FROM campaigns
     ORDER BY created_at DESC
     LIMIT 50`
  );

  // Fetch all agents
  const [agentRows] = await pool.query(
    `SELECT id, name
     FROM agents
     WHERE (status = 'active' OR (status IS NULL AND is_active = 1))
     ORDER BY name ASC`
  );

  return (
    <DeveloperPortalView
      apiKey={admin.api_key}
      appUrl={appUrl}
      campaigns={campaignRows as ApiCampaignOption[]}
      agents={agentRows as AgentOption[]}
      isAdmin={true}
    />
  );
}
