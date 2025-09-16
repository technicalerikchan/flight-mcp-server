# Contributing to Flight MCP Server

We love your input! We want to make contributing to Flight MCP Server as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Setting Up Development Environment

1. **Clone your fork**:
   \`\`\`bash
   git clone https://github.com/technicalerikchan/flight-mcp-server.git
   cd flight-mcp-server
   \`\`\`

2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment**:
   \`\`\`bash
   cp .env.example .env
   # Add your Amadeus API credentials
   \`\`\`

4. **Run tests**:
   \`\`\`bash
   npm test
   npm run test:amadeus
   \`\`\`

## Code Style

We use ESLint and Prettier for code formatting. Make sure your code follows our style guidelines:

- Use meaningful variable names
- Add comments for complex logic
- Follow the existing code structure
- Keep functions small and focused

## Testing

- Write tests for new features
- Ensure all existing tests pass
- Test both with and without API credentials
- Include edge cases and error scenarios

### Running Tests

\`\`\`bash
# Basic functionality tests
npm test

# Amadeus API integration tests
npm run test:amadeus

# Interactive demo
npm run demo
\`\`\`

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/technicalerikchan/flight-mcp-server/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists
2. Check if someone else has already requested it
3. Provide a clear description of the feature
4. Explain why this feature would be useful
5. Consider submitting a pull request

## Adding New Tools

When adding new MCP tools:

1. **Define the tool** in `src/index.js` `setupTools()` method
2. **Implement the handler** in the `CallToolRequestSchema` handler
3. **Add API integration** in `src/amadeusClient.js` if needed
4. **Update error handling** in `src/errorHandler.js`
5. **Add validation** for input parameters
6. **Write tests** for the new functionality
7. **Update documentation** in README.md

### Tool Structure

\`\`\`javascript
{
  name: "tool_name",
  description: "Clear description of what this tool does",
  inputSchema: {
    type: "object",
    properties: {
      parameter_name: {
        type: "string",
        description: "Description of this parameter"
      }
    },
    required: ["parameter_name"]
  }
}
\`\`\`

## API Integration Guidelines

When working with external APIs:

1. **Handle errors gracefully** - always provide fallback options
2. **Validate inputs** - ensure data is clean before API calls
3. **Rate limiting** - respect API limits and implement backoff
4. **Security** - never log or expose API credentials
5. **Testing** - test with both valid and invalid credentials

## Documentation

- Update README.md for user-facing changes
- Add inline comments for complex logic
- Update API documentation for new tools
- Include examples in documentation

## Git Commit Guidelines

We follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semi colons, etc
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding missing tests
- `chore:` maintain

Example: `feat: add flight status checking tool`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Questions?

Feel free to [open an issue](https://github.com/technicalerikchan/flight-mcp-server/issues/new) if you have questions about contributing!