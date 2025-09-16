export class FlightAPIError extends Error {
  constructor(message, code = "GENERAL_ERROR", details = {}) {
    super(message);
    this.name = "FlightAPIError";
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

export const errorCodes = {
  INVALID_AIRPORT_CODE: "INVALID_AIRPORT_CODE",
  INVALID_DATE_FORMAT: "INVALID_DATE_FORMAT",
  INVALID_PASSENGER_COUNT: "INVALID_PASSENGER_COUNT",
  FLIGHT_NOT_FOUND: "FLIGHT_NOT_FOUND",
  API_RATE_LIMIT: "API_RATE_LIMIT",
  API_UNAVAILABLE: "API_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
};

export function validateAirportCode(code) {
  if (!code || typeof code !== "string") {
    throw new ValidationError("Airport code is required", "airport_code", code);
  }
  
  if (code.length !== 3) {
    throw new ValidationError("Airport code must be 3 characters long", "airport_code", code);
  }
  
  if (!/^[A-Za-z]{3}$/.test(code)) {
    throw new ValidationError("Airport code must contain only letters", "airport_code", code);
  }
  
  return code.toUpperCase();
}

export function validateDate(dateString, fieldName = "date") {
  if (!dateString || typeof dateString !== "string") {
    throw new ValidationError(`${fieldName} is required`, fieldName, dateString);
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new ValidationError(
      `${fieldName} must be in YYYY-MM-DD format`,
      fieldName,
      dateString
    );
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName, dateString);
  }
  
  // Check if date is not in the past (allow today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) {
    throw new ValidationError(
      `${fieldName} cannot be in the past`,
      fieldName,
      dateString
    );
  }
  
  return dateString;
}

export function validateFlightNumber(flightNumber) {
  if (!flightNumber || typeof flightNumber !== "string") {
    throw new ValidationError("Flight number is required", "flight_number", flightNumber);
  }
  
  // Flight number format: 2-3 letter airline code + 1-4 digit number
  const flightRegex = /^[A-Za-z]{2,3}\d{1,4}$/;
  if (!flightRegex.test(flightNumber)) {
    throw new ValidationError(
      "Flight number must be in format: AA123, DL1234, etc.",
      "flight_number",
      flightNumber
    );
  }
  
  return flightNumber.toUpperCase();
}

export function validatePassengerCount(count) {
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 1 || count > 9) {
      throw new ValidationError(
        "Number of adults must be between 1 and 9",
        "adults",
        count
      );
    }
  }
  return count || 1;
}

export function validateTravelClass(travelClass) {
  const validClasses = ["economy", "premium_economy", "business", "first"];
  if (travelClass && !validClasses.includes(travelClass)) {
    throw new ValidationError(
      `Travel class must be one of: ${validClasses.join(", ")}`,
      "travel_class",
      travelClass
    );
  }
  return travelClass || "economy";
}

export function formatError(error) {
  console.error("Error occurred:", error);

  if (error instanceof ValidationError) {
    return {
      content: [
        {
          type: "text",
          text: `Validation Error: ${error.message}\\n\\nField: ${error.field}\\nValue: ${error.value}`,
        },
      ],
    };
  }

  if (error instanceof FlightAPIError) {
    let errorText = `Flight API Error: ${error.message}\\n\\nError Code: ${error.code}`;
    
    if (Object.keys(error.details).length > 0) {
      errorText += `\\n\\nDetails:\\n${JSON.stringify(error.details, null, 2)}`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: errorText,
        },
      ],
    };
  }

  // Generic error handling
  return {
    content: [
      {
        type: "text",
        text: `An unexpected error occurred: ${error.message}\\n\\nPlease try again later or contact support if the issue persists.`,
      },
    ],
  };
}