import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import { FlightAPIError, errorCodes } from './errorHandler.js';

dotenv.config();

class AmadeusFlightService {
  constructor() {
    if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
      throw new Error('Amadeus API credentials are required. Please set AMADEUS_API_KEY and AMADEUS_API_SECRET in .env file');
    }

    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname: 'test' // Use 'test' for testing environment, 'production' for live
    });
  }

  async searchFlights(searchParams) {
    const { origin, destination, departure_date, return_date, adults, travel_class } = searchParams;

    try {
      const requestParams = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: departure_date,
        adults: adults || 1,
        currencyCode: 'USD',
        max: 10 // Limit results to 10 flights
      };

      // Add return date for round-trip flights
      if (return_date) {
        requestParams.returnDate = return_date;
      }

      // Map travel class to Amadeus cabin class
      if (travel_class) {
        const cabinClassMap = {
          'economy': 'ECONOMY',
          'premium_economy': 'PREMIUM_ECONOMY',
          'business': 'BUSINESS',
          'first': 'FIRST'
        };
        requestParams.travelClass = cabinClassMap[travel_class] || 'ECONOMY';
      }

      console.error('Searching flights with Amadeus API:', requestParams);
      
      const response = await this.amadeus.shopping.flightOffersSearch.get(requestParams);
      
      if (!response.data || response.data.length === 0) {
        throw new FlightAPIError(
          'No flights found for the specified criteria',
          errorCodes.FLIGHT_NOT_FOUND,
          { searchParams }
        );
      }

      return this.formatFlightOffers(response.data);

    } catch (error) {
      console.error('Amadeus API Error:', error);

      if (error instanceof FlightAPIError) {
        throw error;
      }

      // Handle Amadeus-specific errors
      if (error.response && error.response.data) {
        const amadeusError = error.response.data;
        
        if (amadeusError.errors && amadeusError.errors.length > 0) {
          const firstError = amadeusError.errors[0];
          
          if (firstError.code === 38189) {
            throw new FlightAPIError(
              'Invalid airport code provided',
              errorCodes.INVALID_AIRPORT_CODE,
              { detail: firstError.detail }
            );
          }
          
          if (firstError.code === 4926) {
            throw new FlightAPIError(
              'Invalid date format or date in the past',
              errorCodes.INVALID_DATE_FORMAT,
              { detail: firstError.detail }
            );
          }

          throw new FlightAPIError(
            firstError.detail || 'Amadeus API error',
            errorCodes.API_UNAVAILABLE,
            { code: firstError.code, detail: firstError.detail }
          );
        }
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new FlightAPIError(
          'Unable to connect to flight data service',
          errorCodes.NETWORK_ERROR,
          { originalError: error.message }
        );
      }

      // Handle rate limiting
      if (error.response && error.response.status === 429) {
        throw new FlightAPIError(
          'API rate limit exceeded. Please try again later',
          errorCodes.API_RATE_LIMIT
        );
      }

      throw new FlightAPIError(
        'Failed to search flights',
        errorCodes.API_UNAVAILABLE,
        { originalError: error.message }
      );
    }
  }

  formatFlightOffers(flightOffers) {
    return flightOffers.map(offer => {
      const itinerary = offer.itineraries[0]; // First itinerary (outbound)
      const segment = itinerary.segments[0]; // First segment
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      
      const price = offer.price;
      const validatingAirline = offer.validatingAirlineCodes[0];
      
      // Calculate total duration
      const totalDuration = this.parseDuration(itinerary.duration);
      
      // Count stops
      const stops = itinerary.segments.length - 1;
      
      return {
        airline: this.getAirlineName(validatingAirline),
        airline_code: validatingAirline,
        flight_number: `${segment.carrierCode}${segment.number}`,
        origin: segment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
        departure_date: segment.departure.at.split('T')[0],
        departure_time: this.formatTime(segment.departure.at),
        arrival_time: this.formatTime(lastSegment.arrival.at),
        duration: totalDuration,
        price: {
          amount: parseFloat(price.total),
          currency: price.currency,
          per_person: parseFloat(price.base),
        },
        stops: stops,
        travel_class: this.mapCabinClass(segment.cabin),
        aircraft: segment.aircraft?.code || 'Unknown',
        booking_class: segment.bookingClass,
        segments: itinerary.segments.length,
        offer_id: offer.id,
      };
    });
  }

  parseDuration(duration) {
    // Duration format: PT4H25M
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    
    return `${hours}h ${minutes}m`;
  }

  formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toISOString().substr(11, 5); // Extract HH:MM
  }

  getAirlineName(airlineCode) {
    const airlineNames = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'WN': 'Southwest Airlines',
      'B6': 'JetBlue Airways',
      'AS': 'Alaska Airlines',
      'NK': 'Spirit Airlines',
      'F9': 'Frontier Airlines',
      'G4': 'Allegiant Air',
      'SY': 'Sun Country Airlines',
      'LH': 'Lufthansa',
      'BA': 'British Airways',
      'AF': 'Air France',
      'KL': 'KLM',
      'VS': 'Virgin Atlantic',
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'TK': 'Turkish Airlines',
      'SQ': 'Singapore Airlines',
      'CX': 'Cathay Pacific',
      'NH': 'ANA',
      'JL': 'Japan Airlines',
    };
    
    return airlineNames[airlineCode] || airlineCode;
  }

  mapCabinClass(cabinClass) {
    const classMap = {
      'ECONOMY': 'economy',
      'PREMIUM_ECONOMY': 'premium_economy',
      'BUSINESS': 'business',
      'FIRST': 'first'
    };
    
    return classMap[cabinClass] || 'economy';
  }

  async getAirportInfo(airportCode) {
    try {
      console.error(`Getting airport info for: ${airportCode}`);
      
      // Use the locations endpoint instead of airports endpoint
      const response = await this.amadeus.referenceData.locations.get({
        keyword: airportCode,
        subType: 'AIRPORT',
        'page[limit]': 1
      });

      if (!response.data || response.data.length === 0) {
        throw new FlightAPIError(
          `Airport information not found for code: ${airportCode}`,
          errorCodes.INVALID_AIRPORT_CODE,
          { airport_code: airportCode }
        );
      }

      const airport = response.data[0];
      
      return {
        code: airport.iataCode,
        name: airport.name,
        city: airport.address?.cityName || 'Unknown',
        country: airport.address?.countryName || 'Unknown',
        timezone: airport.timeZoneOffset || 'Unknown',
        coordinates: {
          lat: airport.geoCode?.latitude || 0,
          lon: airport.geoCode?.longitude || 0
        }
      };

    } catch (error) {
      console.error('Amadeus Airport Info Error:', error);

      if (error instanceof FlightAPIError) {
        throw error;
      }

      throw new FlightAPIError(
        'Failed to get airport information',
        errorCodes.API_UNAVAILABLE,
        { originalError: error.message }
      );
    }
  }
}

export default AmadeusFlightService;