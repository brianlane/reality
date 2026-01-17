type AdminInviteProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInvitePage({ params }: AdminInviteProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Invitees for {id}
      </h1>
      <p className="text-slate-600">Select applicants to invite.</p>
    </div>
  );
}
