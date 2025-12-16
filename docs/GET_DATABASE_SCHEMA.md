# 获取 Supabase 数据库表结构

## 方法 1: 使用 Supabase Dashboard（推荐）

### 步骤：

1. **打开 Supabase Dashboard**
   访问：https://supabase.com/dashboard/project/veazyrckuukdjlqicgff

2. **进入 SQL Editor**
   左侧菜单 → SQL Editor → New query

3. **运行以下 SQL 查询**
   复制粘贴 `/Users/yingyi/Unoday/Next/scripts/get_schema.sql` 中的内容

4. **复制查询结果**
   将结果复制并发送给我

---

## 方法 2: 查看 Table Editor（更简单）

1. **打开 Table Editor**
   Supabase Dashboard → Table Editor

2. **告诉我你有哪些表**
   例如：
   - users
   - tasks
   - distractions

3. **对于每个表，告诉我字段信息**
   点击每个表，告诉我：
   - 表名
   - 所有字段名称
   - 字段类型（text, uuid, timestamp 等）
   - 主键和外键关系

---

## 方法 3: 如果你还没创建表

如果你的 Supabase 项目是新的，还没有创建表，我可以帮你设计并创建表结构。

**基于 UnoDay 的需求，我建议创建以下表：**

### 推荐表结构

```sql
-- 用户表（如果使用 Supabase Auth，这个表会自动创建）
-- auth.users 表已经存在

-- 任务/Uno 表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'giveup')),
  duration INTEGER, -- 毫秒
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 杂念表
CREATE TABLE distractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 每日统计表（可选）
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 启用 Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE distractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（用户只能访问自己的数据）
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 杂念表的 RLS 策略
CREATE POLICY "Users can view their own distractions"
  ON distractions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own distractions"
  ON distractions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own distractions"
  ON distractions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own distractions"
  ON distractions FOR DELETE
  USING (auth.uid() = user_id);

-- 每日统计表的 RLS 策略
CREATE POLICY "Users can view their own stats"
  ON daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON daily_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON daily_stats FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 下一步

请告诉我以下信息之一：

1. **如果表已经存在**：运行上面的 SQL 查询并发送结果
2. **如果需要创建表**：告诉我是否要使用我推荐的表结构
3. **如果有自定义需求**：告诉我你想要的表结构

---

## 🔐 关于认证

是否需要用户认证功能？

- **需要认证**：用户需要登录才能使用（数据保存到云端，多设备同步）
- **不需要认证**：暂时使用 localStorage（后续可以升级）

请告诉我你的选择！
