-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    phone VARCHAR(20),
    level VARCHAR(100) DEFAULT 'Nano Pro',
    status VARCHAR(100) DEFAULT 'Active',
    wallet NUMERIC(10, 2) DEFAULT 0.00,
    member_type VARCHAR(100) DEFAULT 'Pro Plan',
    registration_date TIMESTAMP DEFAULT now(),
    machine_code VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- API配置表
CREATE TABLE api_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    base_url VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    text_model VARCHAR(100) NOT NULL DEFAULT 'gemini-3-pro',
    image_model VARCHAR(100) NOT NULL DEFAULT 'nano-banana-pro',
    video_model VARCHAR(100) NOT NULL DEFAULT 'veo3.1-fast',
    provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 项目表
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    synopsis TEXT,
    type VARCHAR(100) NOT NULL DEFAULT 'storyboard', -- storyboard, workflow, image_gen, video_gen
    status VARCHAR(50) DEFAULT 'draft', -- draft, completed, archived
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 故事板表
CREATE TABLE storyboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 角色表
CREATE TABLE characters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    age VARCHAR(50),
    tags TEXT[],
    subject_description TEXT NOT NULL,
    background TEXT NOT NULL,
    personality TEXT NOT NULL,
    core_props TEXT NOT NULL,
    visual_prompt TEXT NOT NULL,
    image_url VARCHAR(255),
    is_generating_image BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 场景表
CREATE TABLE scenes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    mood TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    visual_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 镜头表
CREATE TABLE shots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    shot_number INTEGER NOT NULL,
    content_zh TEXT NOT NULL,
    content_en TEXT NOT NULL,
    visual_description_zh TEXT NOT NULL,
    visual_description_en TEXT NOT NULL,
    shot_size TEXT NOT NULL,
    camera_movement TEXT NOT NULL,
    t2i_prompt TEXT NOT NULL,
    t2i_prompt_en TEXT NOT NULL,
    i2v_prompt TEXT NOT NULL,
    i2v_prompt_en TEXT NOT NULL,
    t2v_prompt TEXT NOT NULL,
    t2v_prompt_en TEXT NOT NULL,
    narration_zh TEXT NOT NULL,
    narration_en TEXT NOT NULL,
    audio_prompt_zh TEXT,
    audio_prompt_en TEXT,
    audio_file_url VARCHAR(255),
    duration TEXT NOT NULL,
    image_url VARCHAR(255),
    last_frame_image_url VARCHAR(255),
    is_generating_image BOOLEAN DEFAULT false,
    video_url VARCHAR(255),
    is_generating_video BOOLEAN DEFAULT false,
    generation_progress INTEGER DEFAULT 0,
    generation_status VARCHAR(100),
    error TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流表
CREATE TABLE workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    version INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流节点表
CREATE TABLE workflow_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    node_key VARCHAR(100) NOT NULL, -- 节点唯一标识符，如 node-123456
    type VARCHAR(100) NOT NULL, -- input, output, gemini, chat, nanobanana_image, nanobanana_edit, veo_video, keling_o1_edit
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 0,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'idle', -- idle, running, success, error
    output JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流边表
CREATE TABLE workflow_edges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    edge_key VARCHAR(100) NOT NULL, -- 边唯一标识符，如 edge-123456
    source VARCHAR(100) NOT NULL, -- 源节点key
    target VARCHAR(100) NOT NULL, -- 目标节点key
    source_handle VARCHAR(100),
    target_handle VARCHAR(100),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 工作流执行记录表
CREATE TABLE workflow_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, error
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- 执行时长（秒）
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    logs TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- 图片生成记录表
CREATE TABLE image_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed', -- pending, running, completed, error
    error TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- 视频生成记录表
CREATE TABLE video_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL, -- 视频时长（秒）
    status VARCHAR(50) DEFAULT 'completed', -- pending, running, completed, error
    error TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- 添加索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_configs_user_id ON api_configs(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX idx_characters_project_id ON characters(project_id);
CREATE INDEX idx_scenes_project_id ON scenes(project_id);
CREATE INDEX idx_shots_project_id ON shots(project_id);
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow_id ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_image_generations_user_id ON image_generations(user_id);
CREATE INDEX idx_video_generations_user_id ON video_generations(user_id);

-- Vercel部署配置 - 环境变量示例
-- 在Vercel项目设置中添加以下环境变量：
-- NEXT_PUBLIC_SUPABASE_URL="https://tqdsryjstdpyguatoecm.supabase.co"
-- NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_-4C7VpqgRXBI2PydOcAsOw_X6J0MQWs"
-- SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

-- 示例：创建默认API配置
-- INSERT INTO api_configs (user_id, base_url, api_key, is_default) VALUES 
-- ('your-user-id', 'https://grsai.dakka.com.cn', 'your-api-key', true);

-- 示例：创建工作流
-- INSERT INTO workflows (user_id, name, description) VALUES 
-- ('your-user-id', '默认工作流', '这是一个默认工作流示例');

-- 示例：创建工作流节点
-- INSERT INTO workflow_nodes (workflow_id, node_key, type, x, y, label, parameters) VALUES 
-- ('your-workflow-id', 'node-1', 'input', 100, 100, '输入节点', '{"value": "默认输入"}');

-- 示例：创建工作流边
-- INSERT INTO workflow_edges (workflow_id, edge_key, source, target) VALUES 
-- ('your-workflow-id', 'edge-1', 'node-1', 'node-2');
