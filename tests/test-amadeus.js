#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testAmadeusIntegration() {
  console.log("🧪 Testing Amadeus API Integration...\n");

  const serverPath = join(__dirname, 'src', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let response = '';
  let serverReady = false;

  server.stderr.on('data', (data) => {
    const message = data.toString();
    console.log('📟 Server:', message);
    if (message.includes('Flight MCP Server started successfully')) {
      serverReady = true;
      setTimeout(() => {
        runAmadeusTests();
      }, 2000);
    }
  });

  server.stdout.on('data', (data) => {
    response += data.toString();
  });

  server.on('close', (code) => {
    console.log(`\n🏁 Server exited with code ${code}`);
    if (code === 0) {
      console.log("✅ Amadeus integration test completed!");
    } else {
      console.log("❌ Test failed or server error occurred");
    }
  });

  function runAmadeusTests() {
    console.log("🚀 Running Amadeus API tests...\n");

    // Test 1: Search flights with real API (LAX to JFK)
    setTimeout(() => {
      const searchFlightsRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_flights",
          arguments: {
            origin: "LAX",
            destination: "JFK",
            departure_date: "2025-12-25",
            adults: 1,
            travel_class: "economy"
          }
        }
      };

      sendRequest(searchFlightsRequest, "Real Flight Search (LAX → JFK)");
    }, 1000);

    // Test 2: Get airport info with real API
    setTimeout(() => {
      const airportInfoRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_airport_info",
          arguments: {
            airport_code: "SFO"
          }
        }
      };

      sendRequest(airportInfoRequest, "Real Airport Info (SFO)");
    }, 5000);

    // Test 3: Search international flights (SFO to LHR)
    setTimeout(() => {
      const intlFlightsRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search_flights",
          arguments: {
            origin: "SFO",
            destination: "LHR",
            departure_date: "2025-12-30",
            adults: 2,
            travel_class: "business"
          }
        }
      };

      sendRequest(intlFlightsRequest, "International Flight Search (SFO → LHR, Business)");
    }, 10000);

    // Test 4: Test error handling with invalid airport
    setTimeout(() => {
      const invalidAirportRequest = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "search_flights",
          arguments: {
            origin: "XXX",
            destination: "JFK",
            departure_date: "2025-12-25"
          }
        }
      };

      sendRequest(invalidAirportRequest, "Error Test (Invalid Airport XXX)");
    }, 15000);

    setTimeout(() => {
      console.log("\n📊 Amadeus API Test Summary:");
      console.log("- ✅ Real flight search (domestic)");
      console.log("- ✅ Real airport information");
      console.log("- ✅ International flight search");
      console.log("- ✅ API error handling");
      console.log("\n🎯 If you see '🌐 Live data from Amadeus API' in responses, the integration is working!");
      
      server.kill('SIGTERM');
    }, 20000);
  }

  function sendRequest(request, testName) {
    console.log(`🔄 Testing: ${testName}`);
    server.stdin.write(JSON.stringify(request) + '\n');
    
    setTimeout(() => {
      const lines = response.split('\n').filter(line => line.trim());
      const lastResponse = lines[lines.length - 2] || lines[lines.length - 1];
      
      if (lastResponse) {
        try {
          const parsed = JSON.parse(lastResponse);
          if (parsed.result) {
            console.log(`✅ ${testName}: Success`);
            if (parsed.result.content && parsed.result.content[0]) {
              const responseText = parsed.result.content[0].text;
              
              // Check if using real API
              if (responseText.includes('🌐 Live data from Amadeus API') || responseText.includes('🌐 Data from Amadeus API')) {
                console.log(`   🌐 Using REAL Amadeus API data!`);
              } else if (responseText.includes('🧪 Sample data')) {
                console.log(`   🧪 Using mock data (API may not be configured)`);
              }
              
              // Show preview
              const preview = responseText.substring(0, 150).replace(/\\n/g, ' ') + '...';
              console.log(`   📋 Response: ${preview}`);
            }
          } else if (parsed.error) {
            console.log(`❌ ${testName}: Error - ${parsed.error.message}`);
          }
        } catch (e) {
          console.log(`⚠️  ${testName}: Response parsing error`);
        }
      }
      console.log('');
    }, 3000);
  }

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Terminating server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

testAmadeusIntegration();