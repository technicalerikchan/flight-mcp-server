"""Amadeus API client for flight queries."""

import os
import logging
from typing import Dict, List, Optional, Any
from amadeus import Client, ResponseError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class AmadeusFlightService:
    """Service for interacting with Amadeus API."""
    
    def __init__(self):
        """Initialize Amadeus client."""
        self.api_key = os.getenv("AMADEUS_API_KEY")
        self.api_secret = os.getenv("AMADEUS_API_SECRET")
        
        if not self.api_key or not self.api_secret:
            raise ValueError("Amadeus API credentials not found in environment variables")
        
        self.amadeus = Client(
            client_id=self.api_key,
            client_secret=self.api_secret
        )
        logger.info("Amadeus client initialized successfully")
    
    async def search_flights(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search for flights using Amadeus API."""
        try:
            # Prepare search parameters
            params = {
                'originLocationCode': search_params['origin'],
                'destinationLocationCode': search_params['destination'],
                'departureDate': search_params['departure_date'],
                'adults': search_params['adults'],
                'travelClass': self._map_travel_class(search_params['travel_class'])
            }
            
            if search_params.get('return_date'):
                params['returnDate'] = search_params['return_date']
            
            # Search flights
            response = self.amadeus.shopping.flight_offers_search.get(**params)
            
            if not response.data:
                return []
            
            # Transform Amadeus response to our format
            flights = []
            for offer in response.data[:5]:  # Limit to 5 results
                flight_data = self._transform_flight_offer(offer, search_params)
                if flight_data:
                    flights.append(flight_data)
            
            return flights
            
        except ResponseError as error:
            logger.error(f"Amadeus API error: {error}")
            raise Exception(f"Flight search failed: {error}")
        except Exception as error:
            logger.error(f"Unexpected error in flight search: {error}")
            raise
    
    async def get_airport_info(self, airport_code: str) -> Dict[str, Any]:
        """Get airport information from Amadeus API."""
        try:
            response = self.amadeus.reference_data.locations.get(
                keyword=airport_code,
                subType='AIRPORT'
            )
            
            if not response.data:
                raise Exception(f"Airport not found: {airport_code}")
            
            airport = response.data[0]
            
            return {
                'code': airport.get('iataCode', airport_code),
                'name': airport.get('name', 'Unknown Airport'),
                'city': airport.get('address', {}).get('cityName', 'Unknown City'),
                'country': airport.get('address', {}).get('countryName', 'Unknown Country'),
                'timezone': airport.get('timeZoneOffset', 'Unknown'),
                'coordinates': {
                    'lat': float(airport.get('geoCode', {}).get('latitude', 0)),
                    'lon': float(airport.get('geoCode', {}).get('longitude', 0))
                }
            }
            
        except ResponseError as error:
            logger.error(f"Amadeus API error for airport {airport_code}: {error}")
            raise Exception(f"Airport info retrieval failed: {error}")
        except Exception as error:
            logger.error(f"Unexpected error getting airport info: {error}")
            raise
    
    def _map_travel_class(self, travel_class: str) -> str:
        """Map our travel class to Amadeus travel class."""
        mapping = {
            'economy': 'ECONOMY',
            'premium_economy': 'PREMIUM_ECONOMY',
            'business': 'BUSINESS',
            'first': 'FIRST'
        }
        return mapping.get(travel_class, 'ECONOMY')
    
    def _transform_flight_offer(self, offer: Any, search_params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform Amadeus flight offer to our format."""
        try:
            if not offer.get('itineraries') or not offer.get('price'):
                return None
            
            itinerary = offer['itineraries'][0]
            segments = itinerary.get('segments', [])
            
            if not segments:
                return None
            
            first_segment = segments[0]
            last_segment = segments[-1]
            
            # Calculate total duration
            duration = itinerary.get('duration', 'PT0H0M')
            duration_formatted = self._format_duration(duration)
            
            # Get airline info
            airline_code = first_segment.get('carrierCode', 'XX')
            airline_name = self._get_airline_name(airline_code)
            
            # Get aircraft info
            aircraft = first_segment.get('aircraft', {}).get('code', 'Unknown')
            
            return {
                'airline': airline_name,
                'flight_number': f"{airline_code}{first_segment.get('number', '0000')}",
                'origin': search_params['origin'],
                'destination': search_params['destination'],
                'departure_date': search_params['departure_date'],
                'departure_time': self._format_time(first_segment.get('departure', {}).get('at', '')),
                'arrival_time': self._format_time(last_segment.get('arrival', {}).get('at', '')),
                'duration': duration_formatted,
                'price': {
                    'amount': float(offer['price']['total']),
                    'currency': offer['price']['currency'],
                    'per_person': float(offer['price']['total']) / search_params['adults']
                },
                'stops': len(segments) - 1,
                'travel_class': search_params['travel_class'],
                'aircraft': aircraft,
                'booking_class': first_segment.get('class', 'Y')
            }
            
        except Exception as error:
            logger.warning(f"Error transforming flight offer: {error}")
            return None
    
    def _format_duration(self, duration_str: str) -> str:
        """Format ISO 8601 duration to readable format."""
        try:
            # Parse PT2H30M format
            duration_str = duration_str.replace('PT', '')
            hours = 0
            minutes = 0
            
            if 'H' in duration_str:
                hours_part, remainder = duration_str.split('H')
                hours = int(hours_part)
                duration_str = remainder
            
            if 'M' in duration_str:
                minutes_part = duration_str.replace('M', '')
                if minutes_part:
                    minutes = int(minutes_part)
            
            return f"{hours}h {minutes}m"
        except:
            return "Unknown duration"
    
    def _format_time(self, datetime_str: str) -> str:
        """Extract time from datetime string."""
        try:
            if 'T' in datetime_str:
                return datetime_str.split('T')[1][:5]  # Get HH:MM
            return datetime_str[:5] if len(datetime_str) >= 5 else "00:00"
        except:
            return "00:00"
    
    def _get_airline_name(self, airline_code: str) -> str:
        """Get airline name from code."""
        airlines = {
            'AA': 'American Airlines',
            'DL': 'Delta Air Lines',
            'UA': 'United Airlines',
            'WN': 'Southwest Airlines',
            'B6': 'JetBlue Airways',
            'LH': 'Lufthansa',
            'BA': 'British Airways',
            'AF': 'Air France',
            'KL': 'KLM',
            'LX': 'Swiss International Air Lines'
        }
        return airlines.get(airline_code, f"Airline {airline_code}")