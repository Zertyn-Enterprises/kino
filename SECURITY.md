# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Instead, report them
privately to the maintainer (via the GitHub repository's "Report a vulnerability"
/ private advisory feature, or by contacting the owner directly).

Include: what you found, how to reproduce it, and the potential impact. You'll
get an acknowledgement and, where applicable, a fix and disclosure timeline.

## Scope

This is a video-generation toolkit. The most relevant concerns are: never commit
real API keys (`.env` is gitignored — keep it that way) and never capture or
commit real customer data when producing videos (use seeded QA/demo data only).
