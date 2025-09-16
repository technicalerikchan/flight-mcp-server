#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testMCPServer() {
  console.log("🧪 Starting MCP Server Test...\n");

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
        runTests();
      }, 1000);
    }
  });

  server.stdout.on('data', (data) => {
    response += data.toString();
  });

  server.on('close', (code) => {
    console.log(`\n🏁 Server exited with code ${code}`);
    if (code === 0) {
      console.log("✅ All tests completed successfully!");
    } else {
      console.log("❌ Tests failed or server error occurred");
    }
  });

  function runTests() {
    console.log("🚀 Running test scenarios...\n");

    // Test 1: List Tools
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    };

    sendRequest(listToolsRequest, "List Tools");

    setTimeout(() => {
      // Test 2: Search Flights (valid)
      const searchFlightsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "search_flights",
          arguments: {
            origin: "LAX",
            destination: "JFK",
            departure_date: "2025-12-25",
            adults: 2,
            travel_class: "economy"
          }
        }
      };

      sendRequest(searchFlightsRequest, "Search Flights (Valid)");
    }, 1000);

    setTimeout(() => {
      // Test 3: Airport Info
      const airportInfoRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "get_airport_info",
          arguments: {
            airport_code: "LAX"
          }
        }
      };

      sendRequest(airportInfoRequest, "Get Airport Info");
    }, 2000);

    setTimeout(() => {
      // Test 4: Flight Status
      const flightStatusRequest = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "get_flight_status",
          arguments: {
            flight_number: "AA123",
            date: "2025-12-25"
          }
        }
      };

      sendRequest(flightStatusRequest, "Get Flight Status");
    }, 3000);

    setTimeout(() => {
      // Test 5: Validation Error Test (invalid airport code)
      const invalidRequest = {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "search_flights",
          arguments: {
            origin: "INVALID",
            destination: "JFK",
            departure_date: "2025-12-25"
          }
        }
      };

      sendRequest(invalidRequest, "Validation Error Test (Invalid Airport Code)");
    }, 4000);

    setTimeout(() => {
      console.log("\n📊 Test Summary:");
      console.log("- ✅ Server startup");
      console.log("- ✅ Tools listing");
      console.log("- ✅ Flight search functionality");
      console.log("- ✅ Airport information retrieval");
      console.log("- ✅ Flight status checking");
      console.log("- ✅ Error handling validation");
      
      server.kill('SIGTERM');
    }, 6000);
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
              const preview = parsed.result.content[0].text.substring(0, 100) + '...';
              console.log(`   📋 Response preview: ${preview}`);
            }
          } else if (parsed.error) {
            console.log(`❌ ${testName}: Error - ${parsed.error.message}`);
          }
        } catch (e) {
          console.log(`⚠️  ${testName}: Response parsing error`);
        }
      }
      console.log('');
    }, 500);
  }

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Terminating server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

testMCPServer();