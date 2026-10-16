<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Rules
- Admin status lives in `user_roles` (checked via `has_role`), never on `profiles` — prevents privilege escalation.
- Users may only UPDATE study columns on `profiles` (column grants); devices, subscriptions and admin actions go through SECURITY DEFINER RPCs — stops users granting themselves a pass.
- Word access is enforced by RLS on `words_vault` (free-trial rows or active pass) — paywall can't be bypassed client-side.
- Workspace pages live under `src/routes/_authenticated/_ws/` sharing `WorkspaceProvider` — one place loads profile, words and paywall state.
