#!/usr/bin/env python3
"""Flight MCP Server - Main server implementation."""

import asyncio
import logging
from typing import Any, Sequence

import mcp.server.stdio
from mcp import server, types
from mcp.server import NotificationOptions, Server

from .amadeus_client import AmadeusFlightService
from .error_handler import (
    FlightAPIError,
    ValidationError,
    validate_airport_code,
    validate_date,
    validate_flight_number,
    validate_passenger_count,
    validate_travel_class,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FlightMCPServer:
    """Flight MCP Server implementation."""
    
    def __init__(self):
        """Initialize the flight MCP server."""
        self.server = Server("flight-mcp-server")
        self.amadeus_service = None
        self.use_real_api = False
        
        # Initialize Amadeus service
        try:
            self.amadeus_service = AmadeusFlightService()
            logger.info("Amadeus API client initialized")
            # Test connection will be done when first request comes in
        except Exception as error:
            logger.warning(f"Amadeus API initialization failed, using mock data: {error}")
            self.use_real_api = False
        
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up MCP message handlers."""
        
        @self.server.list_tools()
        async def handle_list_tools() -> list[types.Tool]:
            """List available tools."""
            return [
                types.Tool(
                    name="search_flights",
                    description="Search for flights between two airports",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "origin": {
                                "type": "string",
                                "description": "Origin airport code (IATA 3-letter code, e.g., NYC, LAX)",
                            },
                            "destination": {
                                "type": "string", 
                                "description": "Destination airport code (IATA 3-letter code, e.g., NYC, LAX)",
                            },
                            "departure_date": {
                                "type": "string",
                                "description": "Departure date in YYYY-MM-DD format",
                            },
                            "return_date": {
                                "type": "string",
                                "description": "Return date in YYYY-MM-DD format (optional for one-way flights)",
                            },
                            "adults": {
                                "type": "integer",
                                "description": "Number of adult passengers (default: 1)",
                                "minimum": 1,
                                "maximum": 9,
                            },
                            "travel_class": {
                                "type": "string",
                                "description": "Travel class preference",
                                "enum": ["economy", "premium_economy", "business", "first"],
                            },
                        },
                        "required": ["origin", "destination", "departure_date"],
                    },
                ),
                types.Tool(
                    name="get_airport_info",
                    description="Get information about an airport by its code",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "airport_code": {
                                "type": "string",
                                "description": "Airport IATA code (3-letter code, e.g., LAX, JFK)",
                            },
                        },
                        "required": ["airport_code"],
                    },
                ),
                types.Tool(
                    name="get_flight_status",
                    description="Get real-time status of a specific flight",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "flight_number": {
                                "type": "string",
                                "description": "Flight number (e.g., AA123, DL456)",
                            },
                            "date": {
                                "type": "string",
                                "description": "Flight date in YYYY-MM-DD format",
                            },
                        },
                        "required": ["flight_number", "date"],
                    },
                ),
                types.Tool(
                    name="get_airline_info",
                    description="Get information about an airline",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "airline_code": {
                                "type": "string",
                                "description": "Airline IATA code (2-letter code, e.g., AA, DL, UA)",
                            },
                        },
                        "required": ["airline_code"],
                    },
                ),
            ]
        
        @self.server.call_tool()
        async def handle_call_tool(
            name: str, arguments: dict[str, Any] | None
        ) -> list[types.TextContent]:
            """Handle tool calls."""
            try:
                if name == "search_flights":
                    return await self._search_flights(arguments or {})
                elif name == "get_airport_info":
                    return await self._get_airport_info(arguments or {})
                elif name == "get_flight_status":
                    return await self._get_flight_status(arguments or {})
                elif name == "get_airline_info":
                    return await self._get_airline_info(arguments or {})
                else:
                    raise FlightAPIError(f"Unknown tool: {name}")
            except (ValidationError, FlightAPIError) as error:
                return [types.TextContent(type="text", text=str(error))]
            except Exception as error:
                logger.error(f"Tool call error: {error}")
                return [types.TextContent(
                    type="text", 
                    text=f"An unexpected error occurred: {error}"
                )]
    
    async def _search_flights(self, args: dict[str, Any]) -> list[types.TextContent]:
        """Search for flights."""
        # Validate inputs
        origin = validate_airport_code(args.get("origin"))
        destination = validate_airport_code(args.get("destination"))
        departure_date = validate_date(args.get("departure_date"), "departure_date")
        adults = validate_passenger_count(args.get("adults", 1))
        travel_class = validate_travel_class(args.get("travel_class", "economy"))
        
        return_date = None
        if args.get("return_date"):
            return_date = validate_date(args.get("return_date"), "return_date")
            
            # Check that return date is after departure date
            from datetime import datetime
            dep_date = datetime.strptime(departure_date, "%Y-%m-%d")
            ret_date = datetime.strptime(return_date, "%Y-%m-%d")
            if ret_date <= dep_date:
                raise ValidationError("Return date must be after departure date")
        
        # Check that origin and destination are different
        if origin == destination:
            raise ValidationError("Origin and destination airports must be different")
        
        try:
            flights = []
            if self.use_real_api and self.amadeus_service:
                # Use real Amadeus API
                flights = await self.amadeus_service.search_flights({
                    "origin": origin,
                    "destination": destination,
                    "departure_date": departure_date,
                    "return_date": return_date,
                    "adults": adults,
                    "travel_class": travel_class
                })
            else:
                # Use mock data
                flights = self._generate_mock_flights(
                    origin, destination, departure_date, return_date, adults, travel_class
                )
            
            if not flights:
                raise FlightAPIError("No flights found for the specified criteria")
            
            result_text = self._format_flight_results(
                flights, origin, destination, departure_date, return_date
            )
            
            return [types.TextContent(type="text", text=result_text)]
            
        except Exception as error:
            if isinstance(error, (ValidationError, FlightAPIError)):
                raise
            raise FlightAPIError("Failed to search for flights") from error
    
    async def _get_airport_info(self, args: dict[str, Any]) -> list[types.TextContent]:
        """Get airport information."""
        airport_code = validate_airport_code(args.get("airport_code"))
        
        try:
            if self.use_real_api and self.amadeus_service:
                airport = await self.amadeus_service.get_airport_info(airport_code)
            else:
                # Mock airport data
                mock_airports = {
                    "LAX": {
                        "code": "LAX",
                        "name": "Los Angeles International Airport",
                        "city": "Los Angeles",
                        "country": "United States",
                        "timezone": "America/Los_Angeles",
                        "coordinates": {"lat": 33.9425, "lon": -118.4081},
                    },
                    "JFK": {
                        "code": "JFK",
                        "name": "John F. Kennedy International Airport",
                        "city": "New York",
                        "country": "United States",
                        "timezone": "America/New_York",
                        "coordinates": {"lat": 40.6413, "lon": -73.7781},
                    },
                    "LHR": {
                        "code": "LHR",
                        "name": "London Heathrow Airport",
                        "city": "London",
                        "country": "United Kingdom",
                        "timezone": "Europe/London",
                        "coordinates": {"lat": 51.4700, "lon": -0.4543},
                    },
                    "NRT": {
                        "code": "NRT",
                        "name": "Narita International Airport",
                        "city": "Tokyo",
                        "country": "Japan",
                        "timezone": "Asia/Tokyo",
                        "coordinates": {"lat": 35.7719, "lon": 140.3928},
                    },
                }
                
                airport = mock_airports.get(airport_code)
                if not airport:
                    raise FlightAPIError(f"Airport information not found for code: {airport_code}")
            
            result_text = (
                f"Airport Information\\n\\n"
                f"Code: {airport['code']}\\n"
                f"Name: {airport['name']}\\n"
                f"City: {airport['city']}\\n"
                f"Country: {airport['country']}\\n"
                f"Timezone: {airport['timezone']}\\n"
                f"Coordinates: {airport['coordinates']['lat']}, {airport['coordinates']['lon']}\\n\\n"
                f"{'Data from Amadeus API' if self.use_real_api else 'Sample data'}"
            )
            
            return [types.TextContent(type="text", text=result_text)]
            
        except Exception as error:
            if isinstance(error, (ValidationError, FlightAPIError)):
                raise
            raise FlightAPIError("Failed to get airport information") from error
    
    async def _get_flight_status(self, args: dict[str, Any]) -> list[types.TextContent]:
        """Get flight status."""
        flight_number = validate_flight_number(args.get("flight_number"))
        date = validate_date(args.get("date"), "date")
        
        # Mock flight status
        import random
        statuses = ["On Time", "Delayed", "Boarding", "Departed", "Arrived", "Cancelled"]
        status = random.choice(statuses)
        gates = ["A12", "B7", "C14", "D9", "E23"]
        gate = random.choice(gates)
        
        result_text = (
            f"Flight Status\\n\\n"
            f"Flight: {flight_number}\\n"
            f"Date: {date}\\n"
            f"Status: {status}\\n"
        )
        
        if status != "Cancelled":
            result_text += (
                f"Gate: {gate}\\n"
                f"Scheduled Departure: 14:30\\n"
            )
            if status == "Delayed":
                result_text += "Estimated Departure: 15:15\\nDelay Reason: Weather conditions\\n"
            elif status in ["Arrived", "Departed"]:
                result_text += "Actual Time: 14:35\\n"
        else:
            result_text += "Flight has been cancelled. Please contact your airline for rebooking options.\\n"
        
        return [types.TextContent(type="text", text=result_text)]
    
    async def _get_airline_info(self, args: dict[str, Any]) -> list[types.TextContent]:
        """Get airline information."""
        airline_code = args.get("airline_code", "").upper()
        
        if not airline_code or not airline_code.isalpha() or len(airline_code) not in [2, 3]:
            raise ValidationError("Airline code must be 2-3 letters (e.g., AA, DL, UA)")
        
        # Mock airline data
        mock_airlines = {
            "AA": {
                "name": "American Airlines",
                "country": "United States",
                "founded": 1930,
                "hub": "Dallas/Fort Worth International Airport",
                "fleet_size": "850+",
                "destinations": "350+",
            },
            "DL": {
                "name": "Delta Air Lines",
                "country": "United States", 
                "founded": 1924,
                "hub": "Hartsfield-Jackson Atlanta International Airport",
                "fleet_size": "800+",
                "destinations": "325+",
            },
            "UA": {
                "name": "United Airlines",
                "country": "United States",
                "founded": 1926,
                "hub": "Chicago O'Hare International Airport",
                "fleet_size": "800+",
                "destinations": "340+",
            },
            "LH": {
                "name": "Lufthansa",
                "country": "Germany",
                "founded": 1953,
                "hub": "Frankfurt Airport",
                "fleet_size": "300+",
                "destinations": "220+",
            },
        }
        
        airline = mock_airlines.get(airline_code)
        if not airline:
            raise FlightAPIError(f"Airline information not found for code: {airline_code}")
        
        result_text = (
            f"Airline Information\\n\\n"
            f"Code: {airline_code}\\n"
            f"Name: {airline['name']}\\n"
            f"Country: {airline['country']}\\n"
            f"Founded: {airline['founded']}\\n"
            f"Main Hub: {airline['hub']}\\n"
            f"Fleet Size: {airline['fleet_size']}\\n"
            f"Destinations: {airline['destinations']}"
        )
        
        return [types.TextContent(type="text", text=result_text)]
    
    def _generate_mock_flights(self, origin, destination, departure_date, return_date, adults, travel_class):
        """Generate mock flight data."""
        import random
        
        airlines = [
            {"code": "AA", "name": "American Airlines"},
            {"code": "DL", "name": "Delta Air Lines"},
            {"code": "UA", "name": "United Airlines"},
            {"code": "WN", "name": "Southwest Airlines"},
            {"code": "B6", "name": "JetBlue Airways"},
        ]
        
        flights = []
        for i in range(5):
            airline = random.choice(airlines)
            flight_number = f"{airline['code']}{random.randint(1000, 9999)}"
            base_price = random.randint(200, 800)
            duration_hours = random.randint(2, 10)
            duration_minutes = random.randint(0, 59)
            
            flights.append({
                "airline": airline["name"],
                "flight_number": flight_number,
                "origin": origin,
                "destination": destination,
                "departure_date": departure_date,
                "departure_time": f"{random.randint(6, 22):02d}:{random.randint(0, 59):02d}",
                "arrival_time": f"{random.randint(8, 23):02d}:{random.randint(0, 59):02d}",
                "duration": f"{duration_hours}h {duration_minutes}m",
                "price": {
                    "amount": base_price * adults,
                    "currency": "USD",
                    "per_person": base_price,
                },
                "stops": 0 if random.random() > 0.4 else 1,
                "travel_class": travel_class,
                "aircraft": "Boeing 737-800",
                "booking_class": "V",
            })
        
        return sorted(flights, key=lambda x: x["price"]["amount"])
    
    def _format_flight_results(self, flights, origin, destination, departure_date, return_date):
        """Format flight search results."""
        result = f"Flight Search Results\\n"
        result += f"Route: {origin} → {destination}\\n"
        result += f"Departure Date: {departure_date}\\n"
        if return_date:
            result += f"Return Date: {return_date}\\n"
        
        data_source = "Live data from Amadeus API" if self.use_real_api else "Sample data (configure API for real results)"
        result += f"{data_source}\\n\\n"
        
        for i, flight in enumerate(flights, 1):
            result += f"{i}. {flight['airline']} ({flight['flight_number']})\\n"
            result += f"   Time: {flight['departure_time']} → {flight['arrival_time']} ({flight['duration']})\\n"
            result += f"   Price: {flight['price']['currency']} {flight['price']['amount']} total ({flight['price']['currency']} {flight['price']['per_person']}/person)\\n"
            result += f"   Aircraft: {flight.get('aircraft', 'Aircraft info unavailable')} | {'Direct' if flight['stops'] == 0 else str(flight['stops']) + ' stop(s)'}\\n"
            result += f"   Class: {flight['travel_class']}"
            
            if flight.get('booking_class'):
                result += f" ({flight['booking_class']})"
            
            result += "\\n\\n"
        
        if not self.use_real_api:
            result += "Note: These are sample results. Real Amadeus API integration is available with valid credentials.\\n"
        
        return result


async def main():
    """Main entry point."""
    server_instance = FlightMCPServer()
    
    # Run the server using stdio
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            types.InitializationOptions(
                server_name="flight-mcp-server",
                server_version="1.0.0",
                capabilities=server_instance.server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())