#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runDemo() {
  console.log("🎯 Flight MCP Server - Live Demo\n");
  console.log("Demonstrating real Amadeus flight data...\n");

  const serverPath = join(__dirname, 'src', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let response = '';

  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('Amadeus API connection successful')) {
      console.log("✅ Connected to Amadeus API successfully!\n");
      setTimeout(() => showRealFlightData(), 1000);
    }
    if (message.includes('Flight MCP Server started')) {
      console.log("🛫 MCP Server ready for queries\n");
    }
  });

  server.stdout.on('data', (data) => {
    response += data.toString();
  });

  function showRealFlightData() {
    console.log("🔍 Searching for real flights: New York → Los Angeles\n");
    
    const searchRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search_flights",
        arguments: {
          origin: "NYC",
          destination: "LAX",
          departure_date: "2025-12-30",
          adults: 1,
          travel_class: "economy"
        }
      }
    };

    server.stdin.write(JSON.stringify(searchRequest) + '\n');

    setTimeout(() => {
      const lines = response.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.result && parsed.result.content) {
            const content = parsed.result.content[0].text;
            
            if (content.includes('🌐 Live data from Amadeus API')) {
              console.log("🌐 LIVE AMADEUS DATA RECEIVED!\n");
              
              // Format and display the flight results
              const flightResults = content.replace(/\\n/g, '\n');
              console.log("📋 Flight Search Results:");
              console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              console.log(flightResults);
              console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              
              console.log("\n🎉 SUCCESS! Your MCP server is now providing real-time flight data!");
              console.log("📱 Ready to integrate with Claude Desktop or other MCP clients.");
              
              server.kill('SIGTERM');
              return;
            }
          }
        } catch (e) {
          // Continue searching for the right response
        }
      }
      
      console.log("⏳ Still waiting for flight data response...");
      setTimeout(() => server.kill('SIGTERM'), 2000);
    }, 3000);
  }

  server.on('close', () => {
    console.log("\n✨ Demo completed!");
    process.exit(0);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
}

runDemo();