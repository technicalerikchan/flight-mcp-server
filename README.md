# Flight MCP Server

A Model Context Protocol server for real-time flight queries using the Amadeus API. This project demonstrates how to build an MCP server that integrates with external APIs to provide flight search, airport information, and airline data directly to Claude Desktop.

## Features

- **Real Flight Search** - Search flights worldwide using Amadeus API
- **Airport Information** - Get detailed airport data by IATA code  
- **Flight Status** - Check real-time flight status and delays
- **Airline Information** - Retrieve comprehensive airline details
- **Smart Fallback** - Automatically switches to mock data if API unavailable

## Quick Start

### Prerequisites

- Python 3.10+
- Amadeus API credentials (free at [developers.amadeus.com](https://developers.amadeus.com))

### Installation

```bash
git clone https://github.com/technicalerikchan/flight-mcp-server.git
cd flight-mcp-server
pip install -r requirements.txt
```

### Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your Amadeus API credentials to `.env`:
```env
AMADEUS_API_KEY=your_actual_api_key_here
AMADEUS_API_SECRET=your_actual_api_secret_here
```

### Running

```bash
python -m flight_mcp_server.server
```

## Claude Desktop Integration

### Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### Add Server Configuration

```json
{
  "mcpServers": {
    "flight-server": {
      "command": "python",
      "args": ["-m", "flight_mcp_server.server"],
      "cwd": "/path/to/flight-mcp-server"
    }
  }
}
```

### Usage Examples

After restarting Claude Desktop, you can ask:

- "Search for flights from LAX to JFK tomorrow"
- "Find business class flights from NYC to LHR on December 25th"
- "What's the status of flight AA123 today?"
- "Tell me about San Francisco airport"

## Available Tools

### search_flights

Search for flights between airports.

**Parameters:**
- `origin` (required): Origin airport IATA code
- `destination` (required): Destination airport IATA code
- `departure_date` (required): Date in YYYY-MM-DD format
- `return_date` (optional): Return date for round-trip flights
- `adults` (optional): Number of passengers (1-9, default: 1)
- `travel_class` (optional): "economy", "premium_economy", "business", "first"

### get_airport_info

Get detailed airport information by IATA code.

**Parameters:**
- `airport_code` (required): 3-letter IATA airport code

### get_flight_status

Check real-time flight status.

**Parameters:**
- `flight_number` (required): Flight number (e.g., "AA123")
- `date` (required): Flight date in YYYY-MM-DD format

### get_airline_info

Get airline company information.

**Parameters:**
- `airline_code` (required): 2-letter IATA airline code

## Project Structure

```
flight-mcp-server/
├── flight_mcp_server/
│   ├── __init__.py        # Package initialization
│   ├── server.py          # Main MCP server
│   ├── amadeus_client.py  # Amadeus API integration
│   └── error_handler.py   # Error handling & validation
├── .env.example          # Environment template
├── pyproject.toml        # Project configuration
├── requirements.txt      # Dependencies
└── README.md            # This file
```

## How It Works

1. **MCP Protocol**: Uses the Model Context Protocol to communicate with Claude Desktop
2. **API Integration**: Connects to Amadeus API for real flight data
3. **Error Handling**: Comprehensive validation and graceful fallbacks
4. **Tool System**: Exposes flight operations as callable tools

## API Integration

This server integrates with the Amadeus API:

- **Test Environment**: 10 requests/second, 2000/month (free)
- **Production Environment**: Higher limits with paid plans
- **Coverage**: Global flight data from 400+ airlines

## Error Handling

The server handles various scenarios:

- Invalid airport codes and dates
- API authentication issues
- Network connectivity problems
- Automatic fallback to mock data when API unavailable

## Troubleshooting

**"Client credentials are invalid"**
- Verify API credentials in `.env` file
- Check for extra spaces in credential values

**"No flights found"**
- Verify airport codes are valid IATA codes
- Ensure departure date is in the future

**Connection issues**
- Server automatically falls back to mock data
- Check network connectivity to api.amadeus.com

## Tech Stack

- **Python 3.10+** - Runtime environment
- **MCP SDK** - Model Context Protocol implementation
- **Amadeus API** - Flight data provider
- **Asyncio** - Asynchronous programming support

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Tech Share Project by Erik Chan**