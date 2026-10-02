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

## Project architecture

- Page components depend only on the typed `KnowledgeService`; swap its mock implementation for REST calls without changing pages.
- Keep shared navigation in the root-compatible `AppShell` and page content in TanStack file routes so every destination remains directly addressable.
- Keep this prototype frontend-only; do not add persistence, authentication, server functions, or AI integrations until explicitly requested.
