export const deleteDealerAuthArtifacts = async (adminClient: any, userId: string) => {
  const { error: roleError } = await adminClient.from("user_roles").delete().eq("user_id", userId);
  if (roleError) throw new Error(`Failed to delete user roles: ${roleError.message}`);

  const { error: profileError } = await adminClient.from("profiles").delete().eq("user_id", userId);
  if (profileError) throw new Error(`Failed to delete profile: ${profileError.message}`);

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError) throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
};

export const cleanupOrphanedDealerAccountByEmail = async (
  adminClient: any,
  email: string,
  allowedClientId?: string,
) => {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: authUsersPage, error: authUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    throw new Error(`Failed to check existing auth user: ${authUsersError.message}`);
  }

  const matchedAuthUser = authUsersPage.users.find(
    (user: { id: string; email?: string | null }) => user.email?.toLowerCase() === normalizedEmail,
  );

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("user_id")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to check existing profile: ${profileError.message}`);
  }

  const userId = matchedAuthUser?.id || profile?.user_id;

  if (!userId) {
    return { success: true, cleaned: false, userId: null };
  }

  const { data: linkedClients, error: linkedClientsError } = await adminClient
    .from("clients")
    .select("id")
    .eq("user_id", userId);

  if (linkedClientsError) {
    throw new Error(`Failed to check linked organizations: ${linkedClientsError.message}`);
  }

  const blockingClient = (linkedClients || []).find((client: { id: string }) => client.id !== allowedClientId);
  if (blockingClient) {
    throw new Error("A dealer account with this email is already linked to another organization");
  }

  if (allowedClientId) {
    const { error: unlinkError } = await adminClient
      .from("clients")
      .update({ user_id: null })
      .eq("id", allowedClientId);

    if (unlinkError) {
      throw new Error(`Failed to reset organization credentials: ${unlinkError.message}`);
    }
  }

  await deleteDealerAuthArtifacts(adminClient, userId);

  return { success: true, cleaned: true, userId };
};