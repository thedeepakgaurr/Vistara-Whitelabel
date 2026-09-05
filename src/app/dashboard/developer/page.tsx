import { getCurrentUser } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { ApiKeyPanel } from '@/components/dashboard/ApiKeyPanel';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[#0b0b10] p-4 text-xs leading-relaxed text-[#e5e5ec]">
      <code>{children}</code>
    </pre>
  );
}

export default async function DeveloperPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const appUrl = process.env.APP_URL || 'http://localhost:4000';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Developer</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your API key and integration reference.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API key</CardTitle>
        </CardHeader>
        <CardBody>
          <ApiKeyPanel apiKey={user.api_key} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List your agents</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-muted-foreground">Get the numeric agent IDs to use in the call request below.</p>
          <CodeBlock>{`curl "${appUrl}/api/v1/agents" \\
  -H "x-api-key: ${user.api_key}"`}</CodeBlock>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initiate a call</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <CodeBlock>{`curl -X POST "${appUrl}/api/v1/calls" \\
  -H "x-api-key: ${user.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": 1,
    "phone": "9198XXXXXXX",
    "name": "Customer Name",
    "metadata": { "leadSource": "website" }
  }'`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            Response: <code className="rounded bg-black/[0.04] px-1 py-0.5 text-xs">{'{ "success": true, "callId": 123 }'}</code>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check call status</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <CodeBlock>{`curl "${appUrl}/api/v1/calls/123" \\
  -H "x-api-key: ${user.api_key}"`}</CodeBlock>
        </CardBody>
      </Card>
    </div>
  );
}
