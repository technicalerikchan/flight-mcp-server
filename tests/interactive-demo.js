#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function startInteractiveDemo() {
  console.log("🎯 機票查詢 MCP Server - 互動式演示\n");
  
  const serverPath = join(__dirname, 'src', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let response = '';
  let serverReady = false;

  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('Flight MCP Server started successfully')) {
      console.log("✅ MCP 服務器已啟動");
    }
    if (message.includes('Amadeus API connection successful')) {
      console.log("🌐 已連接到 Amadeus API - 使用真實航班數據");
      serverReady = true;
      showMenu();
    }
  });

  server.stdout.on('data', (data) => {
    response += data.toString();
  });

  function showMenu() {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🛫 可用功能：");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. 🔍 搜索航班 (search_flights)");
    console.log("2. 🏢 機場信息 (get_airport_info)");
    console.log("3. ✈️  航班狀態 (get_flight_status)");
    console.log("4. 🛩️  航空公司信息 (get_airline_info)");
    console.log("5. 💡 查看示例查詢");
    console.log("0. 🚪 退出");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    askForChoice();
  }

  function askForChoice() {
    rl.question('請選擇功能 (輸入數字): ', (choice) => {
      switch(choice.trim()) {
        case '1':
          demonstrateFlightSearch();
          break;
        case '2':
          demonstrateAirportInfo();
          break;
        case '3':
          demonstrateFlightStatus();
          break;
        case '4':
          demonstrateAirlineInfo();
          break;
        case '5':
          showExamples();
          break;
        case '0':
          console.log("👋 感謝使用！");
          server.kill('SIGTERM');
          rl.close();
          return;
        default:
          console.log("❌ 無效選擇，請重新輸入");
          askForChoice();
      }
    });
  }

  function demonstrateFlightSearch() {
    console.log("\n🔍 航班搜索示例：洛杉磯 → 紐約");
    
    const searchRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
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

    sendRequestAndShowResult(searchRequest, "航班搜索");
  }

  function demonstrateAirportInfo() {
    console.log("\n🏢 機場信息示例：洛杉磯國際機場");
    
    const airportRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_airport_info",
        arguments: {
          airport_code: "LAX"
        }
      }
    };

    sendRequestAndShowResult(airportRequest, "機場信息");
  }

  function demonstrateFlightStatus() {
    console.log("\n✈️  航班狀態示例：美國航空 AA123");
    
    const statusRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_flight_status",
        arguments: {
          flight_number: "AA123",
          date: "2025-12-25"
        }
      }
    };

    sendRequestAndShowResult(statusRequest, "航班狀態");
  }

  function demonstrateAirlineInfo() {
    console.log("\n🛩️  航空公司信息示例：美國航空");
    
    const airlineRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_airline_info",
        arguments: {
          airline_code: "AA"
        }
      }
    };

    sendRequestAndShowResult(airlineRequest, "航空公司信息");
  }

  function sendRequestAndShowResult(request, testName) {
    console.log("⏳ 處理中...\n");
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    setTimeout(() => {
      const lines = response.split('\n').filter(line => line.trim());
      const lastResponse = lines[lines.length - 2] || lines[lines.length - 1];
      
      if (lastResponse) {
        try {
          const parsed = JSON.parse(lastResponse);
          if (parsed.result && parsed.result.content) {
            const content = parsed.result.content[0].text.replace(/\\n/g, '\n');
            
            console.log("📋 結果：");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(content);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            if (content.includes('🌐 Live data from Amadeus API') || content.includes('🌐 Data from Amadeus API')) {
              console.log("🌟 這是來自 Amadeus API 的真實數據！");
            }
          }
        } catch (e) {
          console.log("❌ 解析響應時出錯");
        }
      }
      
      setTimeout(() => showMenu(), 1000);
    }, 2000);
  }

  function showExamples() {
    console.log("\n💡 示例查詢（適用於 Claude Desktop 整合）：");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("• '搜索明天從台北到東京的航班'");
    console.log("• '幫我找下週洛杉磯到紐約的商務艙機票'");
    console.log("• '查詢 12 月 25 日舊金山到倫敦的航班，2個人'");
    console.log("• '告訴我關於 JFK 機場的信息'");
    console.log("• '查詢航班 DL123 今天的狀態'");
    console.log("• '給我美國達美航空的詳細信息'");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    setTimeout(() => showMenu(), 3000);
  }

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 感謝使用！');
    server.kill('SIGTERM');
    rl.close();
    process.exit(0);
  });
}

startInteractiveDemo();