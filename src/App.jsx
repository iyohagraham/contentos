import React, { useState, lazy, Suspense } from 'react'
import {
  LayoutDashboard, Target, Video, Layers, Calendar, BarChart3, DollarSign,
  Globe, Settings, Plus, Zap, Menu, X as XIcon, Brain, GraduationCap,
  Search, Bot, Monitor, Database, HardDrive, Loader2
} from 'lucide-react'
import { useChannels, useVideos, useProducts, useStrategies, useDbMode } from './lib/db/useStore.js'
import { channelToDisplay, videoToDisplay, productToDisplay } from './lib/format.js'
import { useWorkspace } from './lib/useWorkspace.js'

// Lazy-loaded views — each becomes its own chunk so the initial bundle only
// carries the shell + whichever view the user lands on (dashboard).
const DashboardView = lazy(() => import('./views/DashboardView.jsx'))
const StrategyView = lazy(() => import('./views/StrategyView.jsx'))
const CreateView = lazy(() => import('./views/CreateView.jsx'))
const ContentView = lazy(() => import('./views/ContentView.jsx'))
const CalendarView = lazy(() => import('./views/CalendarView.jsx'))
const AnalyticsView = lazy(() => import('./views/AnalyticsView.jsx'))
const MonetizeView = lazy(() => import('./views/MonetizeView.jsx'))
const ChannelsView = lazy(() => import('./views/ChannelsView.jsx'))
const SettingsView = lazy(() => import('./views/SettingsView.jsx'))
const KnowledgeView = lazy(() => import('./views/KnowledgeView.jsx'))
const SkillsView = lazy(() => import('./views/SkillsView.jsx'))
const ResearchView = lazy(() => import('./views/ResearchView.jsx'))
const IntelligenceView = lazy(() => import('./views/IntelligenceView.jsx'))
const AgentsView = lazy(() => import('./views/AgentsView.jsx'))
const WorkspaceConfigView = lazy(() => import('./views/WorkspaceConfigView.jsx'))
const MonitorView = lazy(() => import('./views/MonitorView.jsx'))

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Force rebuild - v2
  const dbMode = useDbMode()
  const { workspaceId } = useWorkspace()

  // Live data from store (localStorage or Supabase)
  const { data: rawChannels, create: createChannel, update: updateChannel, remove: removeChannel } = useChannels()
  const { data: rawVideos, create: createVideo, update: updateVideo, remove: removeVideo } = useVideos()
  const { data: rawProducts } = useProducts()
  const { data: rawStrategies, create: createStrategy } = useStrategies()

  // Map DB rows -> display shape the views expect
  const channels = rawChannels.map(channelToDisplay)
  const videos = rawVideos.map(videoToDisplay)
  const products = rawProducts.map(productToDisplay)

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">ContentOS</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {sidebarOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} expanded={sidebarOpen} />
          <NavItem icon={Target} label="Strategy" active={activeView === 'strategy'} onClick={() => setActiveView('strategy')} expanded={sidebarOpen} />
          <NavItem icon={Video} label="Create" active={activeView === 'create'} onClick={() => setActiveView('create')} expanded={sidebarOpen} />
          <NavItem icon={Layers} label="Content" active={activeView === 'content'} onClick={() => setActiveView('content')} expanded={sidebarOpen} />
          <NavItem icon={Calendar} label="Calendar" active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} expanded={sidebarOpen} />
          <NavItem icon={BarChart3} label="Analytics" active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} expanded={sidebarOpen} />
          <NavItem icon={DollarSign} label="Monetize" active={activeView === 'monetize'} onClick={() => setActiveView('monetize')} expanded={sidebarOpen} />
          <NavItem icon={Globe} label="Channels" active={activeView === 'channels'} onClick={() => setActiveView('channels')} expanded={sidebarOpen} />
          {sidebarOpen && <div className="px-3 pt-3 pb-1 text-xs text-slate-600 uppercase tracking-wider font-semibold">Intelligence</div>}
          <NavItem icon={Brain} label="Knowledge" active={activeView === 'knowledge'} onClick={() => setActiveView('knowledge')} expanded={sidebarOpen} />
          <NavItem icon={GraduationCap} label="Skills" active={activeView === 'skills'} onClick={() => setActiveView('skills')} expanded={sidebarOpen} />
          <NavItem icon={Search} label="Research" active={activeView === 'research'} onClick={() => setActiveView('research')} expanded={sidebarOpen} />
          <NavItem icon={Zap} label="Intelligence" active={activeView === 'intelligence'} onClick={() => setActiveView('intelligence')} expanded={sidebarOpen} />
          <NavItem icon={Bot} label="Agents" active={activeView === 'agents'} onClick={() => setActiveView('agents')} expanded={sidebarOpen} />
          <NavItem icon={Zap} label="Brand Mode" active={activeView === 'workspace'} onClick={() => setActiveView('workspace')} expanded={sidebarOpen} />
          <NavItem icon={Monitor} label="Monitor" active={activeView === 'monitor'} onClick={() => setActiveView('monitor')} expanded={sidebarOpen} />
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          <NavItem icon={Settings} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} expanded={sidebarOpen} />
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              {dbMode === 'cloud' ? <Database className="w-3.5 h-3.5 text-green-500" /> : <HardDrive className="w-3.5 h-3.5 text-amber-500" />}
              <span>{dbMode === 'cloud' ? 'Cloud synced' : 'Local storage'}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold capitalize">{activeView}</h1>
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />New Project
          </button>
        </header>
        <main className="p-6">
          <Suspense fallback={<ViewFallback />}>
            {activeView === 'dashboard' && <DashboardView channels={channels} videos={videos} products={products} onNavigate={setActiveView} />}
            {activeView === 'strategy' && <StrategyView createStrategy={createStrategy} />}
            {activeView === 'create' && <CreateView channels={channels} createVideo={createVideo} />}
            {activeView === 'content' && <ContentView videos={videos} updateVideo={updateVideo} removeVideo={removeVideo} />}
            {activeView === 'calendar' && <CalendarView videos={videos} channels={channels} updateVideo={updateVideo} />}
            {activeView === 'analytics' && <AnalyticsView videos={videos} channels={channels} workspaceId={workspaceId} />}
            {activeView === 'monetize' && <MonetizeView products={products} videos={videos} />}
            {activeView === 'channels' && <ChannelsView channels={channels} createChannel={createChannel} updateChannel={updateChannel} removeChannel={removeChannel} />}
            {activeView === 'settings' && <SettingsView dbMode={dbMode} />}
            {activeView === 'knowledge' && <KnowledgeView workspaceId={workspaceId} />}
            {activeView === 'skills' && <SkillsView workspaceId={workspaceId} />}
            {activeView === 'research' && <ResearchView workspaceId={workspaceId} />}
            {activeView === 'intelligence' && <IntelligenceView workspaceId={workspaceId} />}
            {activeView === 'agents' && <AgentsView workspaceId={workspaceId} />}
            {activeView === 'workspace' && <WorkspaceConfigView workspaceId={workspaceId} />}
            {activeView === 'monitor' && <MonitorView workspaceId={workspaceId} />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick, expanded }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${active ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />{expanded && <span className="truncate">{label}</span>}
    </button>
  )
}

export default App
