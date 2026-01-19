type AdminInviteProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInvitePage({ params }: AdminInviteProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Invitees for {id}</h1>
      <p className="text-navy-soft">Select applicants to invite.</p>
    </div>
  );
}
