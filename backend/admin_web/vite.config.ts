import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// ⚠️ 安全警告：local-api 直接读写文件系统，无身份验证
// ============================================================================
// 此插件提供的 /local-api/* 端点直接读写配置文件，没有任何身份验证机制。
// 请确保此开发服务器仅在本地运行，不要暴露到公网。
// 敏感操作包括：
// - 读取和修改 .env 文件（包含 API 密钥、管理员邮箱等）
// - 读取和修改 MCP 服务器配置
// - 读取和修改 Agent 配置
// ============================================================================

// Plugin to handle local file API for config
function localFileApiPlugin() {
  return {
    name: 'local-file-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle local config file API
        if (req.url?.startsWith('/local-api/')) {
          try {
            const urlPath = req.url?.replace('/local-api/', '')
            const [resource, action] = urlPath.split('/')

            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

            if (req.method === 'OPTIONS') {
              res.statusCode = 200
              res.end()
              return
            }

            // MCP servers config
            if (resource === 'mcp-servers') {
              const configPath = path.resolve(__dirname, '../mcp_servers/config/servers.json')

              if (req.method === 'GET') {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } else if (req.method === 'POST' || req.method === 'PUT') {
                let body = ''
                req.on('data', chunk => { body += chunk })
                req.on('end', () => {
                  const data = JSON.parse(body)
                  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true, data }))
                })
              } else {
                next()
              }
              return
            }

            // Agents config
            if (resource === 'agents') {
              const configDir = path.resolve(__dirname, '../app/agents/config')

              if (req.method === 'GET') {
                // 读取所有agent配置文件
                const agents: any = {}
                if (fs.existsSync(configDir)) {
                  const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'))
                  for (const file of files) {
                    const agentName = file.replace('.json', '')
                    const filePath = path.join(configDir, file)
                    const agentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                    agents[agentName] = agentData
                  }
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ agents }))
              } else if (req.method === 'POST' || req.method === 'PUT') {
                let body = ''
                req.on('data', chunk => { body += chunk })
                req.on('end', () => {
                  const data = JSON.parse(body)

                  // 确保config目录存在
                  if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true })
                  }

                  // 保存每个agent到单独的文件
                  for (const [agentName, agentConfig] of Object.entries(data.agents || {})) {
                    const filePath = path.join(configDir, `${agentName}.json`)
                    fs.writeFileSync(filePath, JSON.stringify(agentConfig, null, 2), 'utf-8')
                  }

                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true, data }))
                })
              } else {
                next()
              }
              return
            }

            // Whitelist config
            if (resource === 'whitelist') {
              const envPath = path.resolve(__dirname, '../.env')
              const mcpServersPath = path.resolve(__dirname, '../mcp_servers/config/servers.json')
              const agentsConfigDir = path.resolve(__dirname, '../app/agents/config')

              if (req.method === 'GET') {
                // 读取.env文件获取白名单配置
                let publicAgents: string[] = []
                let publicMcpServers: string[] = []
                let adminAgents: string[] = []

                if (fs.existsSync(envPath)) {
                  const envContent = fs.readFileSync(envPath, 'utf-8')
                  const lines = envContent.split('\n')

                  for (const line of lines) {
                    if (line.startsWith('PUBLIC_AGENTS=')) {
                      try {
                        publicAgents = JSON.parse(line.split('=')[1])
                      } catch (e) {
                        console.error('Failed to parse PUBLIC_AGENTS:', e)
                      }
                    } else if (line.startsWith('PUBLIC_MCP_SERVERS=')) {
                      try {
                        publicMcpServers = JSON.parse(line.split('=')[1])
                      } catch (e) {
                        console.error('Failed to parse PUBLIC_MCP_SERVERS:', e)
                      }
                    } else if (line.startsWith('ADMIN_AGENTS=')) {
                      try {
                        adminAgents = JSON.parse(line.split('=')[1])
                      } catch (e) {
                        console.error('Failed to parse ADMIN_AGENTS:', e)
                      }
                    }
                  }
                }

                // 获取所有可用的agents
                const availableAgents: string[] = []
                if (fs.existsSync(agentsConfigDir)) {
                  const files = fs.readdirSync(agentsConfigDir).filter(f => f.endsWith('.json'))
                  files.forEach(file => {
                    availableAgents.push(file.replace('.json', ''))
                  })
                }

                // 获取所有可用的MCP服务器
                const availableMcpServers: string[] = []
                if (fs.existsSync(mcpServersPath)) {
                  const mcpConfig = JSON.parse(fs.readFileSync(mcpServersPath, 'utf-8'))
                  if (mcpConfig.mcpServers) {
                    Object.keys(mcpConfig.mcpServers).forEach(serverName => {
                      availableMcpServers.push(serverName)
                    })
                  }
                }

                const response = {
                  config: {
                    public_agents: publicAgents,
                    public_mcp_servers: publicMcpServers,
                    admin_agents: adminAgents
                  },
                  available_agents: availableAgents,
                  available_mcp_servers: availableMcpServers
                }

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(response))
              } else if (req.method === 'POST' || req.method === 'PUT') {
                let body = ''
                req.on('data', chunk => { body += chunk })
                req.on('end', () => {
                  const data = JSON.parse(body)

                  // 读取.env文件
                  let envContent = ''
                  if (fs.existsSync(envPath)) {
                    envContent = fs.readFileSync(envPath, 'utf-8')
                  }

                  const lines = envContent.split('\n')
                  const newLines: string[] = []
                  const updatedKeys = new Set<string>()

                  // 更新或添加环境变量
                  for (const line of lines) {
                    if (data.public_agents !== undefined && line.trim().startsWith('PUBLIC_AGENTS=')) {
                      newLines.push(`PUBLIC_AGENTS=${JSON.stringify(data.public_agents)}`)
                      updatedKeys.add('PUBLIC_AGENTS')
                    } else if (data.public_mcp_servers !== undefined && line.trim().startsWith('PUBLIC_MCP_SERVERS=')) {
                      newLines.push(`PUBLIC_MCP_SERVERS=${JSON.stringify(data.public_mcp_servers)}`)
                      updatedKeys.add('PUBLIC_MCP_SERVERS')
                    } else if (data.admin_agents !== undefined && line.trim().startsWith('ADMIN_AGENTS=')) {
                      newLines.push(`ADMIN_AGENTS=${JSON.stringify(data.admin_agents)}`)
                      updatedKeys.add('ADMIN_AGENTS')
                    } else {
                      newLines.push(line)
                    }
                  }

                  // 添加新的环境变量（如果之前不存在）
                  if (data.public_agents !== undefined && !updatedKeys.has('PUBLIC_AGENTS')) {
                    newLines.push(`\nPUBLIC_AGENTS=${JSON.stringify(data.public_agents)}`)
                  }
                  if (data.public_mcp_servers !== undefined && !updatedKeys.has('PUBLIC_MCP_SERVERS')) {
                    newLines.push(`PUBLIC_MCP_SERVERS=${JSON.stringify(data.public_mcp_servers)}`)
                  }
                  if (data.admin_agents !== undefined && !updatedKeys.has('ADMIN_AGENTS')) {
                    newLines.push(`ADMIN_AGENTS=${JSON.stringify(data.admin_agents)}`)
                  }

                  // 写回.env文件
                  fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8')

                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    success: true,
                    message: '白名单配置已更新',
                    warning: '更改需要在后端服务重启后才能完全生效'
                  }))
                })
              } else {
                next()
              }
              return
            }

            next()
          } catch (error) {
            console.error('Local file API error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(error) }))
          }
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localFileApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
