import { useState } from 'react';
import type { MCPServer, MCPTool } from '../../types/api';

interface MCPPanelProps {
  mcpServers: MCPServer[];
  enabledServices: string[];
  requiredServices: string[];
  onToggleService: (serviceName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ToolDetailModalProps {
  server: MCPServer;
  onClose: () => void;
}

function ToolDetailModal({ server, onClose }: ToolDetailModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-surface-300 p-6 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-display font-semibold text-gray-900">{server.name}</h2>
                  <p className="text-sm text-gray-500">{server.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
                type="button"
                title="关闭"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Status Badge */}
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                server.running
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  server.running ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                {server.running ? '运行中' : '未运行'}
              </span>
              <span className="text-sm text-gray-500">
                {server.tools.length} 个工具可用
              </span>
            </div>
          </div>

          {/* Tools List */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {server.tools.length > 0 ? (
              <div className="space-y-3">
                {server.tools.map((tool) => (
                  <ToolCard key={tool.tool_id} tool={tool} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>该服务暂无可用工具</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ToolCard({ tool }: { tool: MCPTool }) {
  return (
    <div className="p-4 rounded-xl border border-surface-300 bg-surface-50 hover:bg-surface-100 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary-100">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{tool.name}</h4>
            <span className="text-xs text-gray-400">({tool.server_name})</span>
          </div>
          <p className="text-sm text-gray-600">{tool.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MCPPanel({ mcpServers, enabledServices, requiredServices, onToggleService, isOpen, onClose }: MCPPanelProps) {
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);

  // Calculate total enabled tools
  const totalEnabledTools = mcpServers
    .filter(server => enabledServices.includes(server.name))
    .reduce((acc, server) => acc + server.tools.length, 0);

  // Optional services are those that are enabled but not required
  const optionalServices = enabledServices.filter(s => !requiredServices.includes(s));

  // Available services are those that are not enabled
  const availableServices = mcpServers
    .filter(server => !enabledServices.includes(server.name))
    .map(server => server.name);

  return (
    <>
      {/* Slide-out Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={onClose}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white z-50 animate-slide-left overflow-y-auto shadow-card">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-surface-300 p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-semibold text-gray-900">MCP 服务</h2>
                    <p className="text-xs text-gray-500">
                      {totalEnabledTools} 个工具已启用
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
                  type="button"
                  title="关闭面板"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Required Services (Agent's required MCP services) */}
              {requiredServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    必选服务
                  </h3>
                  <div className="space-y-2">
                    {requiredServices.map((serverName) => {
                      const server = mcpServers.find(s => s.name === serverName);
                      if (!server) return null;
                      return (
                        <div
                          key={serverName}
                          className="w-full p-4 rounded-xl border-2 border-orange-300 bg-orange-50 opacity-75 cursor-pointer hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedServer(server)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-100">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-orange-700">{server.name}</p>
                                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-xs text-gray-500">{server.tools.length} 个工具</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-orange-600">必选</span>
                              <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Enabled Services */}
              {optionalServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    已启用服务
                  </h3>
                  <div className="space-y-2">
                    {optionalServices.map((serverName) => {
                      const server = mcpServers.find(s => s.name === serverName);
                      if (!server) return null;
                      return (
                        <div
                          key={serverName}
                          className="w-full p-4 rounded-xl border-2 border-primary-300 bg-primary-50 transition-all duration-200 hover:border-primary-400"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                              onClick={() => setSelectedServer(server)}
                            >
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-primary-700">{server.name}</p>
                                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-xs text-gray-500">{server.tools.length} 个工具</p>
                              </div>
                            </div>
                            <button
                              onClick={() => onToggleService(serverName)}
                              className="w-6 h-6 rounded-full border-2 bg-primary-600 border-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors"
                              type="button"
                              title="禁用服务"
                            >
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Services */}
              {availableServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    可用服务
                  </h3>
                  <div className="space-y-2">
                    {availableServices.map((serverName) => {
                      const server = mcpServers.find(s => s.name === serverName);
                      if (!server) return null;
                      return (
                        <div
                          key={serverName}
                          className="w-full p-4 rounded-xl border-2 border-surface-300 bg-surface-100 transition-all duration-200 hover:border-primary-300"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                              onClick={() => setSelectedServer(server)}
                            >
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-200">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-700">{server.name}</p>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-xs text-gray-500">{server.tools.length} 个工具</p>
                              </div>
                            </div>
                            <button
                              onClick={() => onToggleService(serverName)}
                              className="w-6 h-6 rounded-full border-2 border-surface-400 flex items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
                              type="button"
                              title="启用服务"
                            >
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tool Detail Modal */}
      {selectedServer && (
        <ToolDetailModal
          server={selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}
    </>
  );
}
