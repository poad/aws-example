# Review Rules

- Comments should be provided in Japanese by default, while maintaining English-based technical analysis to ensure review quality.
- When you find a problem, suggest a solution.
- If you find a problem that is not in the code, point it out.

## Security review

- Always evaluate security implications of code changes.
- Check for potential vulnerabilities and secure coding practices.
- Verify no hardcoded credentials or secrets
- Ensure proper input validation and sanitization
- Check dependencies for known vulnerabilities
  - Use GitHub Dependabot alerts and `pnpm audit`
