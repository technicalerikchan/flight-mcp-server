"""Error handling and validation for flight MCP server."""

import re
from datetime import datetime, date
from typing import Any, Optional


class FlightAPIError(Exception):
    """Custom exception for flight API errors."""
    pass


class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass


def validate_airport_code(code: Any) -> str:
    """Validate and normalize airport IATA code."""
    if not code or not isinstance(code, str):
        raise ValidationError("Airport code is required and must be a string")
    
    code = code.strip().upper()
    
    if not code.isalpha() or len(code) != 3:
        raise ValidationError("Airport code must be exactly 3 letters (e.g., LAX, JFK, LHR)")
    
    return code


def validate_date(date_str: Any, field_name: str = "date") -> str:
    """Validate date format (YYYY-MM-DD)."""
    if not date_str or not isinstance(date_str, str):
        raise ValidationError(f"{field_name} is required and must be a string")
    
    # Check format with regex
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        raise ValidationError(f"{field_name} must be in YYYY-MM-DD format")
    
    # Validate actual date
    try:
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"Invalid {field_name}: {date_str}")
    
    # Check if date is not in the past (allow today)
    today = date.today()
    if parsed_date < today:
        raise ValidationError(f"{field_name} cannot be in the past")
    
    return date_str


def validate_passenger_count(count: Any) -> int:
    """Validate passenger count."""
    if count is None:
        return 1  # Default value
    
    if not isinstance(count, int):
        try:
            count = int(count)
        except (ValueError, TypeError):
            raise ValidationError("Passenger count must be a number")
    
    if count < 1 or count > 9:
        raise ValidationError("Passenger count must be between 1 and 9")
    
    return count


def validate_travel_class(travel_class: Any) -> str:
    """Validate travel class."""
    if travel_class is None:
        return "economy"  # Default value
    
    if not isinstance(travel_class, str):
        raise ValidationError("Travel class must be a string")
    
    travel_class = travel_class.lower().strip()
    valid_classes = ["economy", "premium_economy", "business", "first"]
    
    if travel_class not in valid_classes:
        raise ValidationError(f"Travel class must be one of: {', '.join(valid_classes)}")
    
    return travel_class


def validate_flight_number(flight_number: Any) -> str:
    """Validate flight number format."""
    if not flight_number or not isinstance(flight_number, str):
        raise ValidationError("Flight number is required and must be a string")
    
    flight_number = flight_number.strip().upper()
    
    # Flight number should be airline code (2-3 letters) + number
    if not re.match(r'^[A-Z]{2,3}\d{1,4}$', flight_number):
        raise ValidationError("Flight number must be in format like AA123, DL456, etc.")
    
    return flight_number


def validate_airline_code(airline_code: Any) -> str:
    """Validate airline IATA code."""
    if not airline_code or not isinstance(airline_code, str):
        raise ValidationError("Airline code is required and must be a string")
    
    airline_code = airline_code.strip().upper()
    
    if not airline_code.isalpha() or len(airline_code) not in [2, 3]:
        raise ValidationError("Airline code must be 2-3 letters (e.g., AA, DL, UA)")
    
    return airline_code