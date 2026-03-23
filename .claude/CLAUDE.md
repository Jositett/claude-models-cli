# Workflow Orchestration

## 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop
- After ANY correction from the user: update 	asks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for the relevant project

## 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

# Task Management

1. **Plan First**: Write plan to 	asks/todo.md with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to 	asks/todo.md
6. **Capture Lessons**: Update 	asks/lessons.md after corrections

---

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

# Global preferences

## Environment
- OS: Windows 11
- Shell: PowerShell 7 (pwsh) — always use pwsh, never cmd or bash
- Path separator: use forward slashes wherever possible; Claude Code handles them on Windows
- Line endings: LF preferred in code files; do not add CRLF

## General rules
- Always check if a command is PowerShell-compatible before running it
- Use $env:USERPROFILE for home directory, or ~ which PowerShell resolves correctly
- Prefer winget for package installs; fallback to scoop or choco if noted
- When running npx-based MCP tools, always prefix with cmd /c (required on Windows non-WSL)
- Never assume Unix tools (grep, sed, awk) exist — use PowerShell equivalents
- For file operations use PowerShell cmdlets: Get-Content, Set-Content, Copy-Item, New-Item

## Coding preferences
- Provide Windows-compatible path examples in any code or instructions
- When writing scripts, target PowerShell 7 syntax
- Avoid hardcoded Unix paths like /usr/bin or /tmp — use C:\Users\Joedroid\AppData\Local\Temp or C:\Users\Joedroid

