#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import AmadeusFlightService from "./amadeusClient.js";
import {
  FlightAPIError,
  ValidationError,
  errorCodes,
  validateAirportCode,
  validateDate,
  validateFlightNumber,
  validatePassengerCount,
  validateTravelClass,
  formatError,
} from "./errorHandler.js";

dotenv.config();

class FlightMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "flight-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Amadeus service
    try {
      this.amadeusService = new AmadeusFlightService();
      console.error("Amadeus API client initialized");
      
      // Test the API connection with a simple request
      this.testAmadeusConnection();
    } catch (error) {
      console.error("WARNING: Amadeus API initialization failed, using mock data:", error.message);
      this.useRealAPI = false;
    }

    this.setupTools();
    this.setupTransport();
  }

  async testAmadeusConnection() {
    try {
      // Test with a simple flight search first as it's more reliable
      const testSearchParams = {
        origin: 'NYC',
        destination: 'LAX', 
        departure_date: '2025-12-25',
        adults: 1,
        travel_class: 'economy'
      };
      
      const flights = await this.amadeusService.searchFlights(testSearchParams);
      
      if (flights && flights.length > 0) {
        this.useRealAPI = true;
        console.error("Amadeus API connection successful - using live flight data");
      } else {
        throw new Error("No flight data returned");
      }
    } catch (error) {
      this.useRealAPI = false;
      console.error("WARNING: Amadeus API connection failed - using mock data");
      console.error("API Error:", error.message);
      
      if (error.message.includes('invalid_client') || error.message.includes('credentials')) {
        console.error("Please verify your Amadeus API credentials in .env file");
      }
    }
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_flights",
          description: "Search for flights between two airports",
          inputSchema: {
            type: "object",
            properties: {
              origin: {
                type: "string",
                description: "Origin airport code (IATA 3-letter code, e.g., NYC, LAX)",
              },
              destination: {
                type: "string",
                description: "Destination airport code (IATA 3-letter code, e.g., NYC, LAX)",
              },
              departure_date: {
                type: "string",
                description: "Departure date in YYYY-MM-DD format",
              },
              return_date: {
                type: "string",
                description: "Return date in YYYY-MM-DD format (optional for one-way flights)",
              },
              adults: {
                type: "integer",
                description: "Number of adult passengers (default: 1)",
                minimum: 1,
                maximum: 9,
              },
              travel_class: {
                type: "string",
                description: "Travel class preference",
                enum: ["economy", "premium_economy", "business", "first"],
              },
            },
            required: ["origin", "destination", "departure_date"],
          },
        },
        {
          name: "get_airport_info",
          description: "Get information about an airport by its code",
          inputSchema: {
            type: "object",
            properties: {
              airport_code: {
                type: "string",
                description: "Airport IATA code (3-letter code, e.g., LAX, JFK)",
              },
            },
            required: ["airport_code"],
          },
        },
        {
          name: "get_flight_status",
          description: "Get real-time status of a specific flight",
          inputSchema: {
            type: "object",
            properties: {
              flight_number: {
                type: "string",
                description: "Flight number (e.g., AA123, DL456)",
              },
              date: {
                type: "string",
                description: "Flight date in YYYY-MM-DD format",
              },
            },
            required: ["flight_number", "date"],
          },
        },
        {
          name: "get_airline_info",
          description: "Get information about an airline",
          inputSchema: {
            type: "object",
            properties: {
              airline_code: {
                type: "string",
                description: "Airline IATA code (2-letter code, e.g., AA, DL, UA)",
              },
            },
            required: ["airline_code"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "search_flights":
            return await this.searchFlights(request.params.arguments);
          case "get_airport_info":
            return await this.getAirportInfo(request.params.arguments);
          case "get_flight_status":
            return await this.getFlightStatus(request.params.arguments);
          case "get_airline_info":
            return await this.getAirlineInfo(request.params.arguments);
          default:
            throw new FlightAPIError(`Unknown tool: ${request.params.name}`, errorCodes.GENERAL_ERROR);
        }
      } catch (error) {
        return formatError(error);
      }
    });
  }

  async searchFlights(args) {
    // Validate input parameters
    const validatedOrigin = validateAirportCode(args.origin);
    const validatedDestination = validateAirportCode(args.destination);
    const validatedDepartureDate = validateDate(args.departure_date, "departure_date");
    const validatedAdults = validatePassengerCount(args.adults);
    const validatedTravelClass = validateTravelClass(args.travel_class);
    
    let validatedReturnDate = null;
    if (args.return_date) {
      validatedReturnDate = validateDate(args.return_date, "return_date");
      
      // Check that return date is after departure date
      if (new Date(validatedReturnDate) <= new Date(validatedDepartureDate)) {
        throw new ValidationError(
          "Return date must be after departure date",
          "return_date",
          args.return_date
        );
      }
    }

    // Check that origin and destination are different
    if (validatedOrigin === validatedDestination) {
      throw new ValidationError(
        "Origin and destination airports must be different",
        "destination",
        args.destination
      );
    }

    try {
      let flights;
      
      if (this.useRealAPI) {
        // Use real Amadeus API
        flights = await this.amadeusService.searchFlights({
          origin: validatedOrigin,
          destination: validatedDestination,
          departure_date: validatedDepartureDate,
          return_date: validatedReturnDate,
          adults: validatedAdults,
          travel_class: validatedTravelClass
        });
      } else {
        // Fallback to mock data
        flights = this.generateMockFlights(
          validatedOrigin,
          validatedDestination,
          validatedDepartureDate,
          validatedReturnDate,
          validatedAdults,
          validatedTravelClass
        );
      }

      if (flights.length === 0) {
        throw new FlightAPIError(
          "No flights found for the specified criteria",
          errorCodes.FLIGHT_NOT_FOUND,
          { origin: validatedOrigin, destination: validatedDestination, date: validatedDepartureDate }
        );
      }

      const resultText = this.formatFlightSearchResults(
        flights,
        validatedOrigin,
        validatedDestination,
        validatedDepartureDate,
        validatedReturnDate
      );

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof FlightAPIError) {
        throw error;
      }
      throw new FlightAPIError(
        "Failed to search for flights",
        errorCodes.API_UNAVAILABLE,
        { originalError: error.message }
      );
    }
  }

  generateMockFlights(origin, destination, departureDate, returnDate, adults, travelClass) {
    const airlines = [
      { code: "AA", name: "American Airlines" },
      { code: "DL", name: "Delta Air Lines" },
      { code: "UA", name: "United Airlines" },
      { code: "WN", name: "Southwest Airlines" },
      { code: "B6", name: "JetBlue Airways" },
    ];

    const flights = [];
    
    for (let i = 0; i < 5; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNumber = airline.code + Math.floor(Math.random() * 9000 + 1000);
      const basePrice = Math.floor(Math.random() * 800 + 200);
      const duration = Math.floor(Math.random() * 8 + 2); // 2-10 hours
      
      flights.push({
        airline: airline.name,
        flight_number: flightNumber,
        origin: origin,
        destination: destination,
        departure_date: departureDate,
        departure_time: this.generateRandomTime(),
        arrival_time: this.generateRandomTime(),
        duration: `${duration}h ${Math.floor(Math.random() * 60)}m`,
        price: {
          amount: basePrice * adults,
          currency: "USD",
          per_person: basePrice,
        },
        stops: Math.random() > 0.6 ? 0 : 1,
        travel_class: travelClass,
        aircraft: "Boeing 737-800",
        booking_class: "V",
      });
    }

    return flights.sort((a, b) => a.price.amount - b.price.amount);
  }

  generateRandomTime() {
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  formatFlightSearchResults(flights, origin, destination, departureDate, returnDate) {
    let result = `Flight Search Results\\n`;
    result += `Route: ${origin} → ${destination}\\n`;
    result += `Departure Date: ${departureDate}\\n`;
    if (returnDate) {
      result += `Return Date: ${returnDate}\\n`;
    }
    result += `${this.useRealAPI ? 'Live data from Amadeus API' : 'Sample data (configure API for real results)'}\\n\\n`;

    flights.forEach((flight, index) => {
      result += `${index + 1}. ${flight.airline} (${flight.flight_number})\\n`;
      result += `   Time: ${flight.departure_time} → ${flight.arrival_time} (${flight.duration})\\n`;
      result += `   Price: ${flight.price.currency} ${flight.price.amount} total (${flight.price.currency} ${flight.price.per_person}/person)\\n`;
      result += `   Aircraft: ${flight.aircraft || 'Aircraft info unavailable'} | ${flight.stops === 0 ? 'Direct' : flight.stops + ' stop(s)'}\\n`;
      result += `   Class: ${flight.travel_class}`;
      
      if (flight.booking_class) {
        result += ` (${flight.booking_class})`;
      }
      
      if (flight.segments && flight.segments > 1) {
        result += ` | ${flight.segments} segments`;
      }
      
      result += `\\n\\n`;
    });

    if (!this.useRealAPI) {
      result += `Note: These are sample results. Real Amadeus API integration is available with valid credentials.\\n`;
    }

    return result;
  }

  async getAirportInfo(args) {
    const validatedAirportCode = validateAirportCode(args.airport_code);

    try {
      let airport;
      
      if (this.useRealAPI) {
        // Use real Amadeus API
        airport = await this.amadeusService.getAirportInfo(validatedAirportCode);
      } else {
        // Fallback to mock data
        const mockAirports = {
          LAX: {
            code: "LAX",
            name: "Los Angeles International Airport",
            city: "Los Angeles",
            country: "United States",
            timezone: "America/Los_Angeles",
            coordinates: { lat: 33.9425, lon: -118.4081 },
          },
          JFK: {
            code: "JFK",
            name: "John F. Kennedy International Airport",
            city: "New York",
            country: "United States",
            timezone: "America/New_York",
            coordinates: { lat: 40.6413, lon: -73.7781 },
          },
          LHR: {
            code: "LHR",
            name: "London Heathrow Airport",
            city: "London",
            country: "United Kingdom",
            timezone: "Europe/London",
            coordinates: { lat: 51.4700, lon: -0.4543 },
          },
          NRT: {
            code: "NRT",
            name: "Narita International Airport",
            city: "Tokyo",
            country: "Japan",
            timezone: "Asia/Tokyo",
            coordinates: { lat: 35.7719, lon: 140.3928 },
          },
        };

        airport = mockAirports[validatedAirportCode];
        
        if (!airport) {
          throw new FlightAPIError(
            `Airport information not found for code: ${validatedAirportCode}`,
            errorCodes.INVALID_AIRPORT_CODE,
            { airport_code: validatedAirportCode }
          );
        }
      }

      const resultText = `Airport Information\\n\\n` +
        `Code: ${airport.code}\\n` +
        `Name: ${airport.name}\\n` +
        `City: ${airport.city}\\n` +
        `Country: ${airport.country}\\n` +
        `Timezone: ${airport.timezone}\\n` +
        `Coordinates: ${airport.coordinates.lat}, ${airport.coordinates.lon}\\n\\n` +
        `${this.useRealAPI ? 'Data from Amadeus API' : 'Sample data'}`;

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof FlightAPIError) {
        throw error;
      }
      throw new FlightAPIError(
        "Failed to get airport information",
        errorCodes.API_UNAVAILABLE,
        { originalError: error.message }
      );
    }
  }

  async getFlightStatus(args) {
    const validatedFlightNumber = validateFlightNumber(args.flight_number);
    const validatedDate = validateDate(args.date, "date");

    // Mock flight status - replace with real flight tracking API
    const statuses = ["On Time", "Delayed", "Boarding", "Departed", "Arrived", "Cancelled"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const gates = ["A12", "B7", "C14", "D9", "E23"];
    const gate = gates[Math.floor(Math.random() * gates.length)];

    let resultText = `Flight Status\\n\\n`;
    resultText += `Flight: ${validatedFlightNumber}\\n`;
    resultText += `Date: ${validatedDate}\\n`;
    resultText += `Status: ${status}\\n`;

    if (status !== "Cancelled") {
      resultText += `Gate: ${gate}\\n`;
      resultText += `Scheduled Departure: ${this.generateRandomTime()}\\n`;
      
      if (status === "Delayed") {
        resultText += `Estimated Departure: ${this.generateRandomTime()}\\n`;
        resultText += `Delay Reason: Weather conditions\\n`;
      }
      
      if (status === "Arrived" || status === "Departed") {
        resultText += `Actual Time: ${this.generateRandomTime()}\\n`;
      }
    } else {
      resultText += `Flight has been cancelled. Please contact your airline for rebooking options.\\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }

  async getAirlineInfo(args) {
    // Validate airline code (2-3 letter code)
    if (!args.airline_code || typeof args.airline_code !== "string") {
      throw new ValidationError("Airline code is required", "airline_code", args.airline_code);
    }
    
    if (!/^[A-Za-z]{2,3}$/.test(args.airline_code)) {
      throw new ValidationError(
        "Airline code must be 2-3 letters (e.g., AA, DL, UA)",
        "airline_code",
        args.airline_code
      );
    }
    
    const validatedAirlineCode = args.airline_code.toUpperCase();

    // Mock airline data
    const mockAirlines = {
      AA: {
        name: "American Airlines",
        country: "United States",
        founded: 1930,
        hub: "Dallas/Fort Worth International Airport",
        fleet_size: "850+",
        destinations: "350+",
      },
      DL: {
        name: "Delta Air Lines",
        country: "United States",
        founded: 1924,
        hub: "Hartsfield-Jackson Atlanta International Airport",
        fleet_size: "800+",
        destinations: "325+",
      },
      UA: {
        name: "United Airlines",
        country: "United States",
        founded: 1926,
        hub: "Chicago O'Hare International Airport",
        fleet_size: "800+",
        destinations: "340+",
      },
      LH: {
        name: "Lufthansa",
        country: "Germany",
        founded: 1953,
        hub: "Frankfurt Airport",
        fleet_size: "300+",
        destinations: "220+",
      },
    };

    const airline = mockAirlines[validatedAirlineCode];

    if (!airline) {
      throw new FlightAPIError(
        `Airline information not found for code: ${validatedAirlineCode}`,
        errorCodes.FLIGHT_NOT_FOUND,
        { airline_code: validatedAirlineCode }
      );
    }

    const resultText = `Airline Information\\n\\n` +
      `Code: ${validatedAirlineCode}\\n` +
      `Name: ${airline.name}\\n` +
      `Country: ${airline.country}\\n` +
      `Founded: ${airline.founded}\\n` +
      `Main Hub: ${airline.hub}\\n` +
      `Fleet Size: ${airline.fleet_size}\\n` +
      `Destinations: ${airline.destinations}`;

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }

  setupTransport() {
    const transport = new StdioServerTransport();
    this.server.connect(transport);
    
    console.error("Flight MCP Server started successfully!");
  }

  async run() {
    console.error("Starting Flight MCP Server...");
  }
}

const server = new FlightMCPServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});