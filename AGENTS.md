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

- Use `controleerTweedeStap` for administrator MFA authorization; RPC failures must deny admin actions while account access remains available.
- Serialize user-role writes through the private guard-row statement trigger before checking the last administrator; concurrent transactions must not bypass the invariant.
