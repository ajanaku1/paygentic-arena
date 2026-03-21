export interface Agent {
  id: string
  name: string
  avatar: string
  skills: string[]
  description: string
  wallet_address: string
  seed_phrase: string
  hourly_rate: number
  reputation: number
  tasks_completed: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  requester_id: string
  provider_id: string | null
  status: TaskStatus
  skill_required: string
  budget: number
  result: string | null
  tx_hash: string | null
  created_at: string
  completed_at: string | null
}

export type TaskStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'delivered'
  | 'verified'
  | 'paid'
  | 'disputed'

export interface ActivityLog {
  id: number
  type: ActivityType
  agent_id: string | null
  task_id: string | null
  message: string
  metadata: string | null
  created_at: string
}

export type ActivityType =
  | 'agent_registered'
  | 'task_created'
  | 'task_assigned'
  | 'task_started'
  | 'task_delivered'
  | 'task_verified'
  | 'payment_sent'
  | 'payment_received'

export interface WalletInfo {
  address: string
  balance: string
  chain: string
}

export interface DemoStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  details?: string
  txHash?: string
}
