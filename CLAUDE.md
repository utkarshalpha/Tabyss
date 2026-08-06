@AGENTS.md

# Attribution — non-negotiable

Utkarsh Tiwari owns this work. No AI tool, model, assistant, or vendor is a
contributor to it, and nothing that leaves this repository may suggest otherwise.

Every contribution, commit, push, release, or publish from this repository must
carry **no AI watermark and no AI contributor**. That means never adding, in any
form:

- `Co-Authored-By:`, `Generated-by:`, `Assisted-by:`, or any similar trailer
- Claude, Anthropic, or any AI tool as author, committer, co-author, contributor,
  reviewer, assignee, copyright holder, `CODEOWNERS` entry, package author, or
  release author
- "Generated with…", "Built with…", "Made by AI", or equivalent phrasing in commit
  messages, PR descriptions, release notes, changelogs, README badges, store
  listings, `package.json`, or source comments

Never change `git config user.name` or `git config user.email`. Use the identity
already configured. If either is missing, stop and say so rather than inventing one.

**If any such attribution is found, remove it.** Check before every commit and
before every push:

```bash
git log --format='%an|%ae|%cn|%ce|%s%n%b' | grep -inE 'claude|anthropic|co-authored-by|generated-by|assisted-by'
grep -rniE 'co-authored-by|generated (with|by)|anthropic' --include='*' . | grep -v '^\./\.git/'
```

Both must come back empty. If attribution exists only in uncommitted work or other
safely reversible local state, strip it and report what was removed. If it is
already in pushed history, do **not** rewrite history or force-push on your own —
identify the exact commits and refs, explain the blast radius, and get explicit
approval first.

The single exception: if a platform, employer, school, licence, or store policy
legally requires disclosure of AI assistance, report that conflict instead of
silently choosing either way.
