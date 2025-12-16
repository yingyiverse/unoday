// ============================================================
// Supabase Database Types
//
// 这个文件定义了 Supabase 数据库的完整 TypeScript 类型
// 根据 DATABASE_REDESIGN.md 中的架构设计生成
// ============================================================

// ============================================================
// 辅助类型
// ============================================================

/**
 * 专注日志记录
 */
export interface FocusLog {
  start: string  // ISO 8601 时间字符串
  end: string | null  // 结束时间，null 表示正在进行中
}

/**
 * AI 工具调用记录
 */
export interface ToolCall {
  toolName: string
  args: Record<string, any>
  result: Record<string, any>
}

/**
 * 任务/想法状态
 */
export type ThoughtStatus = 'inbox' | 'focused' | 'done' | 'abandoned' | 'paused'

/**
 * 任务/想法类型
 */
export type ThoughtType = 'task' | 'distraction' | 'note'

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * AI 个性风格
 */
export type AIPersonality = 'concise' | 'balanced' | 'detailed'

/**
 * 语言设置
 */
export type AILanguage = 'auto' | 'zh' | 'en'

/**
 * 主题设置
 */
export type Theme = 'light' | 'dark' | 'auto'

// ============================================================
// 数据库 Schema
// ============================================================

export interface Database {
  public: {
    Tables: {
      // ========================================
      // thoughts 表: 用户的所有想法、任务和杂念
      // ========================================
      thoughts: {
        Row: {
          // 基础字段
          id: number
          user_id: string
          content: string

          // AI 相关
          embedding: number[] | null  // 向量嵌入（768 维度）
          created_by_ai: boolean
          conversation_id: number | null

          // 分类和优先级
          type: ThoughtType
          priority: number  // 0-5
          tags: string[]

          // 状态管理
          status: ThoughtStatus
          focus_logs: FocusLog[]

          // 时间戳
          created_at: string
          updated_at: string
          completed_at: string | null
          last_mentioned_at: string
        }
        Insert: {
          id?: number
          user_id: string
          content: string
          embedding?: number[] | null
          created_by_ai?: boolean
          conversation_id?: number | null
          type?: ThoughtType
          priority?: number
          tags?: string[]
          status?: ThoughtStatus
          focus_logs?: FocusLog[]
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          last_mentioned_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          content?: string
          embedding?: number[] | null
          created_by_ai?: boolean
          conversation_id?: number | null
          type?: ThoughtType
          priority?: number
          tags?: string[]
          status?: ThoughtStatus
          focus_logs?: FocusLog[]
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          last_mentioned_at?: string
        }
      }

      // ========================================
      // conversations 表: AI 对话会话
      // ========================================
      conversations: {
        Row: {
          id: number
          user_id: string
          title: string | null
          context_snapshot: Record<string, any>
          message_count: number
          tool_call_count: number
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id?: number
          user_id: string
          title?: string | null
          context_snapshot?: Record<string, any>
          message_count?: number
          tool_call_count?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string | null
          context_snapshot?: Record<string, any>
          message_count?: number
          tool_call_count?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
      }

      // ========================================
      // messages 表: 对话消息
      // ========================================
      messages: {
        Row: {
          id: number
          conversation_id: number
          role: MessageRole
          content: string
          tool_calls: ToolCall[] | null
          model: string | null
          tokens_input: number | null
          tokens_output: number | null
          created_at: string
        }
        Insert: {
          id?: number
          conversation_id: number
          role: MessageRole
          content: string
          tool_calls?: ToolCall[] | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          conversation_id?: number
          role?: MessageRole
          content?: string
          tool_calls?: ToolCall[] | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
      }

      // ========================================
      // user_preferences 表: 用户偏好设置
      // ========================================
      user_preferences: {
        Row: {
          user_id: string
          ai_enabled: boolean
          ai_personality: AIPersonality
          ai_language: AILanguage
          notifications_enabled: boolean
          daily_reminder_time: string | null
          allow_ai_learning: boolean
          share_anonymous_data: boolean
          daily_uno_limit: number
          theme: Theme
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          ai_enabled?: boolean
          ai_personality?: AIPersonality
          ai_language?: AILanguage
          notifications_enabled?: boolean
          daily_reminder_time?: string | null
          allow_ai_learning?: boolean
          share_anonymous_data?: boolean
          daily_uno_limit?: number
          theme?: Theme
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          ai_enabled?: boolean
          ai_personality?: AIPersonality
          ai_language?: AILanguage
          notifications_enabled?: boolean
          daily_reminder_time?: string | null
          allow_ai_learning?: boolean
          share_anonymous_data?: boolean
          daily_uno_limit?: number
          theme?: Theme
          created_at?: string
          updated_at?: string
        }
      }
    }

    // ========================================
    // RPC Functions
    // ========================================
    Functions: {
      /**
       * 切换专注任务（原子操作）
       * 先关闭当前正在专注的任务，再开启新任务
       */
      switch_focus: {
        Args: {
          p_user_id: string
          p_target_id: number
        }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }

      /**
       * 暂停正在专注的任务
       */
      pause_task: {
        Args: {
          p_user_id: string
          p_task_id: number
        }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }

      /**
       * 基于向量相似度搜索相关想法/任务
       */
      match_thoughts: {
        Args: {
          p_user_id: string
          query_embedding: number[]
          match_threshold: number
          match_count: number
          p_type?: ThoughtType
          p_status?: ThoughtStatus[]
        }
        Returns: {
          success: boolean
          message: string
          count: number
          data: Array<
            Database['public']['Tables']['thoughts']['Row'] & {
              similarity: number
            }
          >
        }
      }

      /**
       * 创建带向量嵌入的想法（AI 调用）
       */
      create_thought_with_embedding: {
        Args: {
          p_user_id: string
          p_content: string
          p_embedding: number[]
          p_status?: ThoughtStatus
          p_type?: ThoughtType
          p_created_by_ai?: boolean
          p_conversation_id?: number | null
          p_tags?: string[]
        }
        Returns: Database['public']['Tables']['thoughts']['Row']
      }

      /**
       * 获取用户当前状态（用于 AI 上下文）
       */
      get_user_context: {
        Args: {
          p_user_id: string
        }
        Returns: {
          isFocused: boolean
          currentTask: Database['public']['Tables']['thoughts']['Row'] | null
          todayCount: number
          distractionCount: number
          streak: number
        }
      }

      /**
       * 获取今日统计
       */
      get_today_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          completed: number
          abandoned: number
          totalFocusTime: number  // 秒
          date: string
        }
      }
    }
  }
}

// ============================================================
// 业务类型（方便使用）
// ============================================================

/**
 * 想法/任务（完整类型）
 */
export type Thought = Database['public']['Tables']['thoughts']['Row']

/**
 * 对话会话
 */
export type Conversation = Database['public']['Tables']['conversations']['Row']

/**
 * 对话消息
 */
export type Message = Database['public']['Tables']['messages']['Row']

/**
 * 用户偏好
 */
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']

/**
 * 用户上下文（AI 使用）
 */
export type UserContext = {
  isFocused: boolean
  currentTask: Thought | null
  todayCount: number
  distractionCount: number
  streak: number
}

/**
 * 今日统计
 */
export type TodayStats = {
  completed: number
  abandoned: number
  totalFocusTime: number
  date: string
}

/**
 * 语义搜索结果
 */
export type ThoughtSearchResult = Thought & {
  similarity: number
}

// ============================================================
// 类型守卫
// ============================================================

/**
 * 检查是否为任务类型
 */
export function isTask(thought: Thought): boolean {
  return thought.type === 'task'
}

/**
 * 检查是否为杂念类型
 */
export function isDistraction(thought: Thought): boolean {
  return thought.type === 'distraction'
}

/**
 * 检查是否正在专注
 */
export function isFocused(thought: Thought): boolean {
  return thought.status === 'focused'
}

/**
 * 检查是否已完成
 */
export function isDone(thought: Thought): boolean {
  return thought.status === 'done'
}

/**
 * 检查是否由 AI 创建
 */
export function isCreatedByAI(thought: Thought): boolean {
  return thought.created_by_ai
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 计算任务的总专注时长（秒）
 */
export function calculateTotalFocusTime(thought: Thought): number {
  if (!thought.focus_logs || thought.focus_logs.length === 0) {
    return 0
  }

  return thought.focus_logs.reduce((total, log) => {
    const start = new Date(log.start).getTime()
    const end = log.end ? new Date(log.end).getTime() : Date.now()
    return total + (end - start) / 1000  // 转换为秒
  }, 0)
}

/**
 * 获取当前正在进行的专注记录
 */
export function getCurrentFocusLog(thought: Thought): FocusLog | null {
  if (!thought.focus_logs || thought.focus_logs.length === 0) {
    return null
  }

  return thought.focus_logs.find((log) => log.end === null) || null
}

/**
 * 格式化专注时长为可读字符串
 */
export function formatFocusTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}
