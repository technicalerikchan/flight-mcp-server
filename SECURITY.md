# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public issue

Please do not report security vulnerabilities through public GitHub issues.

### 2. Report privately

Send an email to: **security@technicalerikchan.com** (or create a private vulnerability report on GitHub)

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

### 3. Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Depends on severity and complexity

## Security Best Practices

### For Users

1. **Protect your API credentials**:
   - Never commit `.env` files to version control
   - Use environment variables for sensitive data
   - Regularly rotate your Amadeus API keys

2. **Keep dependencies updated**:
   - Run `npm audit` regularly
   - Update dependencies with security patches
   - Monitor security advisories

3. **Network security**:
   - Use HTTPS for all API communications
   - Implement proper firewall rules
   - Consider using VPN for sensitive environments

### For Developers

1. **Input validation**:
   - All user inputs are validated and sanitized
   - Airport codes are verified against IATA standards
   - Date formats are strictly enforced

2. **Error handling**:
   - No sensitive information in error messages
   - Proper logging without exposing credentials
   - Graceful fallback mechanisms

3. **Dependencies**:
   - Regular security audits of npm packages
   - Minimal dependency footprint
   - Lock file version control

## Known Security Considerations

### API Rate Limiting

The server implements built-in rate limiting and fallback mechanisms to prevent:
- API abuse
- Credential exposure through error messages
- Service disruption

### Data Privacy

- No flight search data is stored locally
- API credentials are handled securely through environment variables
- All communications use encrypted channels (HTTPS)

### Third-party Dependencies

We regularly monitor and update:
- Amadeus SDK for security patches
- Node.js runtime for vulnerabilities
- All npm dependencies for known issues

## Disclosure Policy

When we receive a security vulnerability report:

1. We will confirm receipt within 48 hours
2. We will provide a detailed response within 7 days
3. We will work on a fix and coordinate disclosure
4. We will credit the reporter (if desired) in our security advisory

## Security Updates

Security updates will be released as:
- Patch releases for minor vulnerabilities
- Minor releases for moderate vulnerabilities  
- Major releases for significant security changes

All security updates will be documented in:
- GitHub Security Advisories
- Release notes
- CHANGELOG.md

## Contact

For security-related questions or concerns:
- Email: security@technicalerikchan.com
- GitHub: Create a private vulnerability report

Thank you for helping keep Flight MCP Server secure!