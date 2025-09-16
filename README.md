# Flight MCP Server

A Model Context Protocol (MCP) server for flight queries, providing real-time flight search, airport information, flight status, and airline details through the Amadeus API.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

## Features

- **Real Flight Search** - Search flights worldwide using Amadeus API
- **Airport Information** - Get detailed airport data by IATA code  
- **Flight Status** - Check real-time flight status and delays
- **Airline Information** - Retrieve comprehensive airline details
- **Live Data** - Real-time data from Amadeus Flight API
- **Smart Fallback** - Automatically switches to mock data if API unavailable
- **Secure** - Environment-based credential management

## Quick Start

### 1. Clone and Install

\`\`\`bash
git clone https://github.com/technicalerikchan/flight-mcp-server.git
cd flight-mcp-server
npm install
\`\`\`

### 2. Configure API Credentials

1. **Get Amadeus API Credentials**:
   - Visit [developers.amadeus.com](https://developers.amadeus.com)
   - Create a free account
   - Create a new application
   - Copy your API Key and Secret

2. **Setup Environment**:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
3. **Edit \`.env\` file**:
   \`\`\`env
   AMADEUS_API_KEY=your_actual_api_key_here
   AMADEUS_API_SECRET=your_actual_api_secret_here
   \`\`\`

### 3. Test the Server

\`\`\`bash
# Start the server
npm start

# Test functionality
npm test

# Run Amadeus API tests
npm run test:amadeus
\`\`\`

## Integration with Claude Desktop

### Step 1: Locate Configuration File

**macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`

**Windows**: \`%APPDATA%/Claude/claude_desktop_config.json\`

### Step 2: Add Server Configuration

\`\`\`json
{
  "mcpServers": {
    "flight-server": {
      "command": "node",
      "args": ["path/to/flight-mcp-server/src/index.js"]
    }
  }
}
\`\`\`

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop application.

### Step 4: Start Querying

You can now ask Claude:
- "Search for flights from LAX to JFK tomorrow"
- "Find business class flights from NYC to LHR on December 25th"
- "What's the status of flight AA123 today?"
- "Tell me about San Francisco airport"

## Available Tools

### 1. search_flights
Search for flights between airports

**Parameters**:
- \`origin\` (required): Origin airport IATA code (e.g., "LAX", "JFK")
- \`destination\` (required): Destination airport IATA code
- \`departure_date\` (required): Date in YYYY-MM-DD format
- \`return_date\` (optional): Return date for round-trip flights
- \`adults\` (optional): Number of passengers (default: 1, max: 9)
- \`travel_class\` (optional): "economy", "premium_economy", "business", "first"

**Example**:
\`\`\`json
{
  "name": "search_flights",
  "arguments": {
    "origin": "LAX",
    "destination": "JFK", 
    "departure_date": "2024-12-25",
    "adults": 2,
    "travel_class": "business"
  }
}
\`\`\`

### 2. get_airport_info
Get detailed airport information

**Parameters**:
- \`airport_code\` (required): 3-letter IATA airport code

### 3. get_flight_status  
Check real-time flight status

**Parameters**:
- \`flight_number\` (required): Flight number (e.g., "AA123")
- \`date\` (required): Flight date in YYYY-MM-DD format

### 4. get_airline_info
Get airline company information

**Parameters**:
- \`airline_code\` (required): 2-letter IATA airline code (e.g., "AA", "DL")

## Development

### Project Structure

\`\`\`
flight-mcp-server/
├── src/
│   ├── index.js           # Main MCP server
│   ├── amadeusClient.js   # Amadeus API integration
│   └── errorHandler.js    # Error handling & validation
├── tests/
│   ├── test.js           # Basic functionality tests
│   ├── test-amadeus.js   # API integration tests
│   └── demo.js           # Interactive demo
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies
└── README.md           # This file
\`\`\`

### Running Tests

\`\`\`bash
# Basic functionality test
npm test

# Amadeus API integration test  
npm run test:amadeus

# Interactive demo
npm run demo
\`\`\`

### Adding New Features

1. Add tool definition in \`setupTools()\` method
2. Implement handler in \`CallToolRequestSchema\` 
3. Add API integration in \`amadeusClient.js\` if needed
4. Update error handling for new scenarios
5. Add tests for new functionality

## API Integration

### Amadeus API Details

- **Test Environment**: 10 requests/second, 2000 requests/month (free)
- **Production Environment**: Higher limits with paid plans
- **Supported Operations**: Flight search, airport lookup, airline information
- **Data Coverage**: Global flight data from 400+ airlines

### API Response Indicators

- **Live data from Amadeus API**: Real flight data
- **Sample data**: Mock data (fallback mode)

## Security & Privacy

- API credentials stored in environment variables
- No sensitive data logged or stored
- Automatic credential validation
- Secure fallback to mock data
- All PII masked in repository

## Error Handling

The server includes comprehensive error handling:

- **Validation Errors**: Invalid airport codes, dates, passenger counts
- **API Errors**: Authentication, rate limiting, service unavailable  
- **Network Errors**: Connection timeouts, DNS resolution
- **Graceful Fallback**: Automatic switch to mock data when API fails

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Make your changes
4. Add tests for new functionality
5. Commit your changes: \`git commit -m 'Add amazing feature'\`
6. Push to the branch: \`git push origin feature/amazing-feature\`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Common Issues

**"Client credentials are invalid"**
- Verify API credentials in \`.env\` file
- Ensure no extra spaces in credential values
- Check if using correct environment (test vs production)

**"No flights found"**  
- Verify airport codes are valid IATA codes
- Ensure departure date is in the future
- Try different routes or dates

**Rate limiting**
- Server automatically falls back to mock data
- Consider upgrading Amadeus plan for higher limits

### Getting Help

- [Amadeus API Documentation](https://developers.amadeus.com/docs)
- [Report Issues](https://github.com/technicalerikchan/flight-mcp-server/issues)
- [Discussions](https://github.com/technicalerikchan/flight-mcp-server/discussions)

## Acknowledgments

- [Amadeus for Developers](https://developers.amadeus.com) - Flight data API
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Anthropic](https://anthropic.com) - Claude Desktop integration

---

**Built for the travel and aviation community**