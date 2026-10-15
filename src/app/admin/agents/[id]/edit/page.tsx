import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditAgentRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/agents/${id}`);
}
